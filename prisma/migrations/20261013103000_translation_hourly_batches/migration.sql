-- Repeated ChatGPT batches: fair queue rotation and per-run exclusions.
-- Keep the existing four-argument RPC for legacy clients.
CREATE OR REPLACE FUNCTION public.claim_translation_batch_excluding(
  p_limit int DEFAULT 30,
  p_char_budget int DEFAULT 250000,
  p_include_expired boolean DEFAULT false,
  p_worker text DEFAULT 'chatgpt',
  p_exclude_ids text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_now timestamptz := now();
  v_claim_id text := gen_random_uuid()::text;
  v_claimed int := 0;
  v_chars int := 0;
  v_row record;
  v_j jsonb;
  v_plan jsonb;
  v_hash text;
  v_origin jsonb;
  v_fa_pending boolean;
  v_ps_pending boolean;
  v_need_fa boolean;
  v_need_ps boolean;
  v_items jsonb := '[]'::jsonb;
  v_manual_stale_marked int := 0;
BEGIN
  IF COALESCE(array_length(p_exclude_ids,1),0)>5000 THEN
    RAISE EXCEPTION 'TGW:invalid_payload:too many excluded IDs';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'TGW:invalid_limit:limit must be between 1 and 50';
  END IF;
  IF p_char_budget IS NULL OR p_char_budget < 2000 OR p_char_budget > 600000 THEN
    RAISE EXCEPTION 'TGW:invalid_budget:char budget must be between 2000 and 600000';
  END IF;

  -- ── pass 1: rows pending/stale per status (cheap filter, SKIP LOCKED) ──
  FOR v_row IN
    SELECT o.*
    FROM public."Opportunity" o
    LEFT JOIN public."McpSecurityState" attempt ON attempt.key='body-attempt:'||o.id AND attempt."expiresAt">v_now
    WHERE o.status = 'published'
      AND o.id <> ALL(COALESCE(p_exclude_ids,'{}'::text[]))
      AND (p_include_expired OR o.deadline IS NULL OR o.deadline >= v_now OR o.deadline=(v_now AT TIME ZONE 'Asia/Kabul')::date)
      AND (o."translationClaimId" IS NULL OR o."translationClaimedAt" < v_now - interval '90 minutes')
      AND (
        (
          (o."faStatus" IS NULL OR o."faStatus" IN ('pending','failed','processing'))
          AND COALESCE(o."translationOrigin" ->> 'fa', '') NOT IN ('MANUAL','MANUAL_STALE')
        ) OR (
          o."faStatus" = 'complete'
          AND (o."psStatus" IS NULL OR o."psStatus" IN ('pending','failed','processing'))
          AND COALESCE(o."translationOrigin" ->> 'ps', '') NOT IN ('MANUAL','MANUAL_STALE')
        )
      )
    ORDER BY
      COALESCE((attempt.data->>'attemptedAt')::bigint,0),
      (CASE WHEN o."verificationStatus" IN ('verified_official','verified_employer','multi_source_confirmed','aggregator_confirmed') THEN 0 ELSE 1 END),
      (CASE WHEN o.deadline IS NOT NULL AND o.deadline >= v_now AND o.deadline < v_now + interval '7 days' THEN 0 ELSE 1 END),
      (CASE WHEN o.featured THEN 0 ELSE 1 END),
      (CASE WHEN o."applyConfidence" >= 80 OR o."organizationId" IS NOT NULL THEN 0 ELSE 1 END),
      (CASE WHEN o."createdAt" >= v_now - interval '30 days' THEN 0 ELSE 1 END),
      o.deadline ASC NULLS LAST,
      o."createdAt" DESC,
      o.id
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    EXIT WHEN v_claimed >= p_limit;
    v_j := to_jsonb(v_row);
    v_plan := public.aria_tgw_source_plan(v_j);
    IF v_plan -> 'fields' = '{}'::jsonb THEN
      -- Nothing translatable (empty/symbolic sources): mark trivially
      -- complete so the queue moves on (engine parity).
      UPDATE public."Opportunity" SET
        "faStatus" = 'complete', "psStatus" = 'complete', "translationStatus" = 'complete'
      WHERE id = v_row.id;
      CONTINUE;
    END IF;

    v_origin := CASE WHEN jsonb_typeof(v_j -> 'translationOrigin') = 'object' THEN v_j -> 'translationOrigin' ELSE '{}'::jsonb END;
    v_fa_pending := (v_j ->> 'faStatus') IS NULL OR (v_j ->> 'faStatus') IN ('pending','failed','processing');
    v_ps_pending := (v_j ->> 'faStatus') = 'complete'
      AND ((v_j ->> 'psStatus') IS NULL OR (v_j ->> 'psStatus') IN ('pending','failed','processing'));
    v_need_fa := v_fa_pending AND COALESCE(v_origin ->> 'fa', '') NOT IN ('MANUAL','MANUAL_STALE');
    v_need_ps := v_ps_pending AND COALESCE(v_origin ->> 'ps', '') NOT IN ('MANUAL','MANUAL_STALE');
    CONTINUE WHEN NOT v_need_fa AND NOT v_need_ps;

    -- Source-character budget: never exceed it once the batch is non-empty.
    IF v_claimed > 0 AND v_chars + (v_plan ->> 'chars')::int > p_char_budget THEN
      EXIT;
    END IF;

    UPDATE public."Opportunity" SET
      "translationClaimedBy" = left(COALESCE(p_worker, 'chatgpt'), 64),
      "translationClaimedAt" = v_now,
      "translationClaimId" = v_claim_id
    WHERE id = v_row.id;

    INSERT INTO public."McpSecurityState" (key,data,"expiresAt")
    VALUES ('body-attempt:'||v_row.id,jsonb_build_object('id',v_row.id,'attemptedAt',floor(extract(epoch FROM v_now)*1000)),v_now+interval '30 days')
    ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,"expiresAt"=EXCLUDED."expiresAt";

    v_items := v_items || jsonb_build_object(
      'id', v_j ->> 'id',
      'sourceHash', v_plan ->> 'hash',
      'needFa', v_need_fa,
      'needPs', v_need_ps,
      'fields', v_plan -> 'fields'
    );
    v_claimed := v_claimed + 1;
    v_chars := v_chars + (v_plan ->> 'chars')::int;
  END LOOP;

  -- ── pass 2: stale sweep — committed translations whose source changed ──
  IF v_claimed < p_limit THEN
    FOR v_row IN
      SELECT o.*
      FROM public."Opportunity" o
    LEFT JOIN public."McpSecurityState" attempt ON attempt.key='body-attempt:'||o.id AND attempt."expiresAt">v_now
      WHERE o.status = 'published'
      AND o.id <> ALL(COALESCE(p_exclude_ids,'{}'::text[]))
        AND (p_include_expired OR o.deadline IS NULL OR o.deadline >= v_now OR o.deadline=(v_now AT TIME ZONE 'Asia/Kabul')::date)
        AND (o."translationClaimId" IS NULL OR o."translationClaimedAt" < v_now - interval '90 minutes')
        AND o."translationSourceHash" IS NOT NULL
        AND (o."faStatus" = 'complete' OR o."psStatus" = 'complete')
      ORDER BY COALESCE((attempt.data->>'attemptedAt')::bigint,0), o.deadline ASC NULLS LAST, o."createdAt" DESC, o.id
      FOR UPDATE OF o SKIP LOCKED
    LOOP
      EXIT WHEN v_claimed >= p_limit;
      v_j := to_jsonb(v_row);
      v_plan := public.aria_tgw_source_plan(v_j);
      v_hash := v_plan ->> 'hash';
      CONTINUE WHEN v_hash = (v_j ->> 'translationSourceHash');  -- not stale

      v_origin := CASE WHEN jsonb_typeof(v_j -> 'translationOrigin') = 'object' THEN v_j -> 'translationOrigin' ELSE '{}'::jsonb END;
      v_need_fa := false;
      v_need_ps := false;

      -- Source changed under a MANUAL translation → mark for human review,
      -- never re-translate (gateway and engine both honor this).
      IF (v_origin ->> 'fa') = 'MANUAL' THEN
        UPDATE public."Opportunity"
        SET "translationOrigin" = jsonb_set("translationOrigin", '{fa}', to_jsonb('MANUAL_STALE'::text))
        WHERE id = v_row.id;
        v_manual_stale_marked := v_manual_stale_marked + 1;
      ELSIF v_j ->> 'faStatus' = 'complete' THEN
        v_need_fa := true;
      END IF;
      IF (v_origin ->> 'ps') = 'MANUAL' THEN
        UPDATE public."Opportunity"
        SET "translationOrigin" = jsonb_set("translationOrigin", '{ps}', to_jsonb('MANUAL_STALE'::text))
        WHERE id = v_row.id;
        v_manual_stale_marked := v_manual_stale_marked + 1;
      ELSIF v_j ->> 'psStatus' = 'complete' THEN
        v_need_ps := true;
      END IF;

      CONTINUE WHEN NOT v_need_fa AND NOT v_need_ps;

      -- Reset the affected languages so they count as pending work again.
      UPDATE public."Opportunity" SET
        "faStatus" = CASE WHEN v_need_fa THEN 'pending' ELSE "faStatus" END,
        "psStatus" = CASE WHEN v_need_ps THEN 'pending' ELSE "psStatus" END,
        "translationStatus" = public.aria_tgw_legacy_status(
          CASE WHEN v_need_fa THEN 'pending' ELSE "faStatus" END,
          CASE WHEN v_need_ps THEN 'pending' ELSE "psStatus" END)
      WHERE id = v_row.id;

      IF v_claimed > 0 AND v_chars + (v_plan ->> 'chars')::int > p_char_budget THEN
        EXIT;
      END IF;

      UPDATE public."Opportunity" SET
        "translationClaimedBy" = left(COALESCE(p_worker, 'chatgpt'), 64),
        "translationClaimedAt" = v_now,
        "translationClaimId" = v_claim_id
      WHERE id = v_row.id;

      INSERT INTO public."McpSecurityState" (key,data,"expiresAt")
    VALUES ('body-attempt:'||v_row.id,jsonb_build_object('id',v_row.id,'attemptedAt',floor(extract(epoch FROM v_now)*1000)),v_now+interval '30 days')
    ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,"expiresAt"=EXCLUDED."expiresAt";

    v_items := v_items || jsonb_build_object(
        'id', v_j ->> 'id',
        'sourceHash', v_hash,
        'needFa', v_need_fa,
        'needPs', v_need_ps,
        'fields', v_plan -> 'fields'
      );
      v_claimed := v_claimed + 1;
      v_chars := v_chars + (v_plan ->> 'chars')::int;
    END LOOP;
  END IF;

  INSERT INTO public."AuditLog" (id, action, entity, "entityId", details)
  VALUES (
    gen_random_uuid()::text, 'translation_claim', 'Opportunity', v_claim_id,
    jsonb_build_object('count', v_claimed, 'limit', p_limit, 'chars', v_chars,
      'worker', left(COALESCE(p_worker, 'chatgpt'), 64),
      'manualStaleMarked', v_manual_stale_marked)::text
  );

  RETURN jsonb_build_object(
    'ok', true,
    'claimId', v_claim_id,
    'claimedAt', v_now,
    'expiresAt', v_now + interval '90 minutes',
    'count', v_claimed,
    'chars', v_chars,
    'items', v_items
  );
END
$fn$;
REVOKE ALL ON FUNCTION public.claim_translation_batch_excluding(int,int,boolean,text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_translation_batch_excluding(int,int,boolean,text,text[]) TO aria_translation_worker;

