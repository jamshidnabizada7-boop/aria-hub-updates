-- CHATGPT TRANSLATION GATEWAY (2026-10-07)
--
-- Restricted claim/commit/fail/status RPC surface for the automated
-- translation lane (ChatGPT scheduled task → HTTPS gateway → these functions).
--
-- Security model:
--   * Role aria_translation_worker is created here (LOGIN, NO password — it
--     cannot authenticate until an operator sets one out-of-band). It holds
--     ZERO table privileges: no SELECT, no INSERT, no UPDATE, no DELETE, no
--     DDL, not superuser. Its ONLY capability is EXECUTE on the four RPC
--     functions below, which run as SECURITY DEFINER (owner = the migration
--     role) with an empty search_path.
--   * Every write goes through the RPCs: claims use FOR UPDATE SKIP LOCKED,
--     commits are single-transaction all-or-nothing with source-hash,
--     manual-provenance, URL/email/number integrity validation.
--   * RLS is NOT touched — it stays enabled exactly as configured on this
--     database (the definer owner bypasses RLS as table owner; the worker
--     role never reads tables directly).
--   * Publication is NEVER touched: these functions only write translation
--     i18n fields, fa/ps statuses, the source hash, provenance and claim
--     columns. status/featured/verification/autoPublish are off-limits.
--
-- Idempotent: CREATE OR REPLACE + IF NOT EXISTS + additive grants.

-- ── claim bookkeeping columns ────────────────────────────────────────────────

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "translationClaimedBy" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "translationClaimedAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "translationClaimId" TEXT;
CREATE INDEX IF NOT EXISTS "Opportunity_translationClaimId_idx" ON "Opportunity"("translationClaimId");

-- ── dedicated role (LOGIN but passwordless until an operator sets one) ──────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_translation_worker') THEN
    CREATE ROLE aria_translation_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    RAISE NOTICE 'role aria_translation_worker created (passwordless — set one before use)';
  ELSE
    RAISE NOTICE 'role aria_translation_worker already present';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO aria_translation_worker;

-- ── helpers (internal; EXECUTE revoked from everyone but the owner) ─────────

-- JS twin: src/lib/ai/translate-chunks.ts chunkText() — codepoint semantics,
-- classic ASCII trim set. The two MUST stay byte-identical (tgw-hash-parity).
CREATE OR REPLACE FUNCTION public.aria_tgw_chunk_text(t text, maxlen int DEFAULT 900)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = ''
AS $fn$
DECLARE
  clean text;
  para text;
  current text;
  candidate text;
  s text;
  p int;
  cutpos int;
  pushlen int;
  result text[] := '{}';
BEGIN
  clean := btrim(regexp_replace(regexp_replace(t, '<[^>]+>', '', 'g'), E'\n{3,}', E'\n\n', 'g'), E' \t\r\n\v\f');
  IF clean IS NULL OR clean = '' THEN
    RETURN '{}'::text[];
  END IF;
  IF char_length(clean) <= maxlen THEN
    RETURN ARRAY[clean];
  END IF;

  current := '';
  FOREACH para IN ARRAY string_to_array(clean, chr(10)) LOOP
    IF current <> '' THEN candidate := current || chr(10) || para;
    ELSE candidate := para; END IF;

    IF char_length(btrim(candidate, E' \t\r\n\v\f')) > maxlen AND current <> '' THEN
      result := result || btrim(current, E' \t\r\n\v\f');
      current := para;
    ELSE
      current := candidate;
    END IF;

    WHILE char_length(current) > maxlen * 1.6 LOOP
      -- last ' ' at codepoint index <= maxlen (String.lastIndexOf semantics)
      s := substr(current, 1, maxlen + 1);
      p := position(chr(32) in reverse(s));
      IF p > 0 THEN cutpos := char_length(s) - p; ELSE cutpos := -1; END IF;
      IF cutpos > 0 THEN pushlen := cutpos; ELSE pushlen := maxlen; END IF;
      result := result || btrim(substr(current, 1, pushlen), E' \t\r\n\v\f');
      current := btrim(substr(current, pushlen + 1), E' \t\r\n\v\f');
    END LOOP;
  END LOOP;

  IF btrim(current, E' \t\r\n\v\f') <> '' THEN
    result := result || btrim(current, E' \t\r\n\v\f');
  END IF;
  RETURN result;
END
$fn$;

-- Plan + source hash for one Opportunity row (jsonb of the row).
-- JS twin: translate-engine.ts planFields()/sourceHashOf()/sourceOf().
CREATE OR REPLACE FUNCTION public.aria_tgw_source_plan(p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $fn$
DECLARE
  field_keys text[] := ARRAY['title','description','summary','eligibility','benefits','responsibilities','requirements','guidelines','jobType','salary','educationReq','experience'];
  base_cols  text[] := ARRAY['title','description','aiSummary','eligibility','benefits','responsibilities','requirements','guidelines','jobType','salary','educationReq','experience'];
  i18n_cols  text[] := ARRAY['titleI18n','descriptionI18n','aiSummaryI18n','eligibilityI18n','benefitsI18n','responsibilitiesI18n','requirementsI18n','guidelinesI18n','jobTypeI18n','salaryI18n','educationReqI18n','experienceI18n'];
  v_i int;
  v_j int;
  v_n int;
  v_field text;
  v_en text;
  v_source text;
  v_chunks text[];
  v_pairs text := '';
  v_fields jsonb := '{}'::jsonb;
  v_chars int := 0;
BEGIN
  v_n := array_length(field_keys, 1);
  FOR v_i IN 1..v_n LOOP
    v_field := field_keys[v_i];
    v_en := p_row -> i18n_cols[v_i] ->> 'en';
    IF v_en IS NOT NULL AND btrim(v_en, E' \t\r\n\v\f') <> '' THEN
      v_source := v_en;
    ELSE
      v_source := p_row ->> base_cols[v_i];
    END IF;
    v_source := btrim(COALESCE(v_source, ''), E' \t\r\n\v\f');
    CONTINUE WHEN v_source = '';
    CONTINUE WHEN NOT (v_source ~ '[[:alpha:]]');            -- isSymbolic twin
    v_chunks := public.aria_tgw_chunk_text(v_source);
    CONTINUE WHEN COALESCE(array_length(v_chunks, 1), 0) = 0;
    v_fields := jsonb_set(v_fields, ARRAY[v_field], to_jsonb(v_source));
    v_chars := v_chars + char_length(v_source);
    FOR v_j IN 1..array_length(v_chunks, 1) LOOP
      v_pairs := v_pairs
        || CASE WHEN v_pairs = '' THEN '' ELSE '|' END
        || v_field || ':' || encode(sha256(convert_to(v_chunks[v_j], 'UTF8')), 'hex');
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object(
    'hash', encode(sha256(convert_to(v_pairs, 'UTF8')), 'hex'),
    'fields', v_fields,
    'chars', v_chars
  );
END
$fn$;

-- JS twin: normalizeDigits() — Persian/Arabic-Indic digits → ASCII, plus the
-- punctuation that legitimately localizes (٪٫،). Unicode space variants are
-- folded to ASCII space so regex word boundaries match on both sides.
CREATE OR REPLACE FUNCTION public.aria_tgw_normalize_digits(x text)
RETURNS text IMMUTABLE STRICT
SET search_path = ''
AS $fn$
  SELECT translate(x,
    '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩٪٫،' || E'\u00a0\u202f\u2002\u2003\u2007\u2009',
    '01234567890123456789%.,' || '      ');
$fn$ LANGUAGE SQL;

-- JS twin: validateIntegrity() stripNum — whitespace + currency punctuation.
CREATE OR REPLACE FUNCTION public.aria_tgw_strip_number(x text)
RETURNS text IMMUTABLE STRICT
SET search_path = ''
AS $fn$
  SELECT translate(x, E' \t\n\r\v\f\u00a0,$€£', '');
$fn$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION public.aria_tgw_legacy_status(fa text, ps text)
RETURNS text IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT CASE
    WHEN fa = 'complete' AND ps = 'complete' THEN 'complete'
    WHEN fa = 'failed' OR ps = 'failed' THEN 'partial'
    WHEN fa = 'complete' OR ps = 'complete' THEN 'partial'
    ELSE 'pending'
  END;
$fn$ LANGUAGE SQL;

-- Merge a translated field into one i18n column, preserving other languages.
CREATE OR REPLACE FUNCTION public.aria_tgw_merge_i18n(cur jsonb, fa jsonb, ps jsonb, field text)
RETURNS jsonb IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT CASE
    WHEN fa ? field AND ps ? field THEN COALESCE(cur, '{}'::jsonb) || jsonb_build_object('fa', fa ->> field, 'ps', ps ->> field)
    WHEN fa ? field THEN COALESCE(cur, '{}'::jsonb) || jsonb_build_object('fa', fa ->> field)
    WHEN ps ? field THEN COALESCE(cur, '{}'::jsonb) || jsonb_build_object('ps', ps ->> field)
    ELSE cur
  END;
$fn$ LANGUAGE SQL;

-- Per-field translation validation (JS twins: validateTranslation +
-- validateIntegrity). Returns an array of problem codes; empty = valid.
CREATE OR REPLACE FUNCTION public.aria_tgw_validate_field(src text, out_text text)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $fn$
DECLARE
  problems text[] := '{}';
  src_n text;
  out_n text;
  out_stripped text;
  src_urls text[];
  out_urls text[];
  u text;
  e text;
  n text;
  src_len int;
  ratio double precision;
BEGIN
  IF btrim(COALESCE(out_text, ''), E' \t\r\n\v\f') = '' THEN
    RETURN ARRAY['empty_translation'];
  END IF;
  IF NOT (out_text ~ '[[:alpha:]]') THEN
    problems := problems || 'no_letters';
  END IF;

  src_n := public.aria_tgw_normalize_digits(src);
  out_n := public.aria_tgw_normalize_digits(out_text);

  -- An untranslated copy of a substantial source is never acceptable.
  IF lower(out_n) = lower(src_n) AND char_length(src) > 40 THEN
    problems := problems || 'untranslated_copy';
  END IF;

  src_len := char_length(btrim(src, E' \t\r\n\v\f'));
  ratio := char_length(out_text)::float8 / GREATEST(1, src_len);
  IF src_len > 200 AND (ratio < 0.18 OR ratio > 4) THEN
    problems := problems || 'length_ratio';
  ELSIF src_len > 40 AND (ratio < 0.25 OR ratio > 5) THEN
    problems := problems || 'length_ratio';
  END IF;

  -- URLs must survive EXACTLY (compare trailing-punctuation-stripped sets).
  src_urls := ARRAY(SELECT regexp_replace((m)[1], E'[.,)]+$', '')
                    FROM regexp_matches(src_n, E'https?://[^[:space:]<>"'')\\]]+', 'g') m);
  IF COALESCE(array_length(src_urls, 1), 0) > 0 THEN
    out_urls := ARRAY(SELECT regexp_replace((m)[1], E'[.,)]+$', '')
                      FROM regexp_matches(out_n, E'https?://[^[:space:]<>"'')\\]]+', 'g') m);
    FOREACH u IN ARRAY src_urls LOOP
      IF NOT (u = ANY(COALESCE(out_urls, '{}'::text[]))) THEN
        problems := problems || ('url_lost:' || left(u, 120));
      END IF;
    END LOOP;
  END IF;

  -- Emails must survive EXACTLY (substring check, digit-normalized text).
  FOREACH e IN ARRAY ARRAY(SELECT (m)[1] FROM regexp_matches(
      src_n, E'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', 'g') m) LOOP
    IF position(e in out_n) = 0 THEN
      problems := problems || ('email_lost:' || left(e, 120));
    END IF;
  END LOOP;

  -- Critical numbers (money, percentages, years, counts) must survive; the
  -- AMOUNT survives, separators/currency symbols may localize.
  out_stripped := public.aria_tgw_strip_number(out_n);
  FOREACH n IN ARRAY ARRAY(SELECT DISTINCT public.aria_tgw_strip_number((m)[1])
      FROM regexp_matches(src_n,
        E'\\$[[:space:]]?[0-9,]+|[0-9][0-9,.]*[[:space:]]?%|(?:19|20)[0-9]{2}|[0-9]{2,}', 'g') m) LOOP
    IF char_length(n) >= 2 AND position(n in out_stripped) = 0 THEN
      problems := problems || ('number_lost:' || left(n, 60));
    END IF;
  END LOOP;

  RETURN problems;
END
$fn$;

-- ── the four RPC operations ─────────────────────────────────────────────────

-- Claim a translation batch. Priority: publication-ready → closing soon →
-- promoted → official source → recent active → older backlog. Honors a total
-- source-character budget so huge records cannot monopolize a batch. Claims
-- expire after 90 minutes (rows become safely reclaimable).
CREATE OR REPLACE FUNCTION public.claim_translation_batch(
  p_limit int DEFAULT 30,
  p_char_budget int DEFAULT 250000,
  p_include_expired boolean DEFAULT false,
  p_worker text DEFAULT 'chatgpt'
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
    WHERE o.status = 'published'
      AND (p_include_expired OR o.deadline IS NULL OR o.deadline >= v_now)
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
      WHERE o.status = 'published'
        AND (p_include_expired OR o.deadline IS NULL OR o.deadline >= v_now)
        AND (o."translationClaimId" IS NULL OR o."translationClaimedAt" < v_now - interval '90 minutes')
        AND o."translationSourceHash" IS NOT NULL
        AND (o."faStatus" = 'complete' OR o."psStatus" = 'complete')
      ORDER BY o.deadline ASC NULLS LAST, o."createdAt" DESC, o.id
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

-- Commit a claimed batch. Every item is validated first (claim membership,
-- claim expiry, source hash, manual provenance, complete field set per
-- language, URL/email/number integrity, sanity ratios); the apply pass runs
-- in the SAME transaction — any failure rolls everything back, so a language
-- can never be left partially complete. Publication fields are NEVER touched.
CREATE OR REPLACE FUNCTION public.commit_translation_batch(
  p_claim_id text,
  p_translations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_count int;
  v_i int;
  v_id text;
  v_submitted_hash text;
  v_fa jsonb;
  v_ps jsonb;
  v_row_j jsonb;
  v_plan jsonb;
  v_hash text;
  v_origin jsonb;
  v_origin_final jsonb;
  v_planned jsonb;
  v_key text;
  v_problems text[];
  v_seen text[] := '{}';
  v_fa_count int := 0;
  v_ps_count int := 0;
BEGIN
  IF p_claim_id IS NULL OR btrim(p_claim_id, ' ') = '' THEN
    RAISE EXCEPTION 'TGW:invalid_claim:claimId is required';
  END IF;
  IF p_translations IS NULL OR jsonb_typeof(p_translations) <> 'object'
     OR jsonb_typeof(p_translations -> 'items') <> 'array' THEN
    RAISE EXCEPTION 'TGW:invalid_payload:translations.items[] is required';
  END IF;
  v_items := p_translations -> 'items';
  v_count := jsonb_array_length(v_items);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'TGW:invalid_payload:items[] must not be empty';
  END IF;
  IF v_count > 100 THEN
    RAISE EXCEPTION 'TGW:invalid_payload:items[] exceeds 100 entries';
  END IF;

  -- The claim must still exist and be unexpired.
  IF NOT EXISTS (
    SELECT 1 FROM public."Opportunity"
    WHERE "translationClaimId" = p_claim_id
      AND "translationClaimedAt" > now() - interval '90 minutes'
  ) THEN
    RAISE EXCEPTION 'TGW:unknown_or_expired_claim:claim % does not exist or has expired', left(p_claim_id, 64);
  END IF;

  -- ── validation pass (locks every row; nothing is written yet) ──
  FOR v_i IN 0..v_count - 1 LOOP
    v_item := v_items -> v_i;
    v_id := v_item ->> 'id';
    v_submitted_hash := v_item ->> 'sourceHash';
    v_fa := v_item -> 'fa';
    v_ps := v_item -> 'ps';

    IF v_id IS NULL OR v_submitted_hash IS NULL THEN
      RAISE EXCEPTION 'TGW:invalid_payload:item % missing id/sourceHash', v_i;
    END IF;
    IF v_id = ANY(v_seen) THEN
      RAISE EXCEPTION 'TGW:invalid_payload:row % appears more than once', left(v_id, 40);
    END IF;
    v_seen := v_seen || v_id;

    SELECT to_jsonb(o) INTO v_row_j
    FROM public."Opportunity" o
    WHERE o.id = v_id AND o."translationClaimId" = p_claim_id
    FOR UPDATE OF o;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TGW:row_not_in_claim:row % is not claimed under this claim', left(v_id, 40);
    END IF;
    IF (v_row_j ->> 'translationClaimedAt')::timestamptz <= now() - interval '90 minutes' THEN
      RAISE EXCEPTION 'TGW:unknown_or_expired_claim:claim % has expired', left(p_claim_id, 64);
    END IF;

    v_plan := public.aria_tgw_source_plan(v_row_j);
    v_hash := v_plan ->> 'hash';
    IF v_hash IS DISTINCT FROM v_submitted_hash THEN
      RAISE EXCEPTION 'TGW:source_hash_changed:source of row % changed after claim', left(v_id, 40);
    END IF;

    v_origin := CASE WHEN jsonb_typeof(v_row_j -> 'translationOrigin') = 'object' THEN v_row_j -> 'translationOrigin' ELSE '{}'::jsonb END;
    IF v_fa IS NOT NULL AND COALESCE(v_origin ->> 'fa', '') IN ('MANUAL','MANUAL_STALE') THEN
      RAISE EXCEPTION 'TGW:manual_translation_locked:row % Persian translation is manual', left(v_id, 40);
    END IF;
    IF v_ps IS NOT NULL AND COALESCE(v_origin ->> 'ps', '') IN ('MANUAL','MANUAL_STALE') THEN
      RAISE EXCEPTION 'TGW:manual_translation_locked:row % Pashto translation is manual', left(v_id, 40);
    END IF;

    IF v_fa IS NULL AND v_ps IS NULL THEN
      RAISE EXCEPTION 'TGW:invalid_payload:item % provides neither fa nor ps', v_i;
    END IF;
    -- Persian must be complete (in this commit or already) before Pashto.
    IF v_ps IS NOT NULL AND v_fa IS NULL
       AND COALESCE(v_row_j ->> 'faStatus', '') <> 'complete' THEN
      RAISE EXCEPTION 'TGW:persian_not_complete:row % needs Persian before Pashto', left(v_id, 40);
    END IF;

    -- Every planned field must be provided, and nothing beyond them.
    v_planned := v_plan -> 'fields';
    IF v_fa IS NOT NULL THEN
      IF v_fa = '{}'::jsonb THEN
        RAISE EXCEPTION 'TGW:invalid_payload:item % fa is empty', v_i;
      END IF;
      FOR v_key IN SELECT jsonb_object_keys(v_fa) LOOP
        IF NOT (v_planned ? v_key) THEN
          RAISE EXCEPTION 'TGW:unknown_field:row % fa field % is not translatable', left(v_id, 40), left(v_key, 40);
        END IF;
      END LOOP;
      FOR v_key IN SELECT jsonb_object_keys(v_planned) LOOP
        IF NOT (v_fa ? v_key) THEN
          RAISE EXCEPTION 'TGW:missing_field:row % fa missing field %', left(v_id, 40), left(v_key, 40);
        END IF;
      END LOOP;
      FOR v_key IN SELECT jsonb_object_keys(v_planned) LOOP
        v_problems := public.aria_tgw_validate_field(v_planned ->> v_key, v_fa ->> v_key);
        IF array_length(v_problems, 1) > 0 THEN
          RAISE EXCEPTION 'TGW:field_invalid:row % fa.%: %', left(v_id, 40), left(v_key, 40), array_to_string(v_problems, '; ');
        END IF;
      END LOOP;
    END IF;
    IF v_ps IS NOT NULL THEN
      IF v_ps = '{}'::jsonb THEN
        RAISE EXCEPTION 'TGW:invalid_payload:item % ps is empty', v_i;
      END IF;
      FOR v_key IN SELECT jsonb_object_keys(v_ps) LOOP
        IF NOT (v_planned ? v_key) THEN
          RAISE EXCEPTION 'TGW:unknown_field:row % ps field % is not translatable', left(v_id, 40), left(v_key, 40);
        END IF;
      END LOOP;
      FOR v_key IN SELECT jsonb_object_keys(v_planned) LOOP
        IF NOT (v_ps ? v_key) THEN
          RAISE EXCEPTION 'TGW:missing_field:row % ps missing field %', left(v_id, 40), left(v_key, 40);
        END IF;
      END LOOP;
      FOR v_key IN SELECT jsonb_object_keys(v_planned) LOOP
        v_problems := public.aria_tgw_validate_field(v_planned ->> v_key, v_ps ->> v_key);
        IF array_length(v_problems, 1) > 0 THEN
          RAISE EXCEPTION 'TGW:field_invalid:row % ps.%: %', left(v_id, 40), left(v_key, 40), array_to_string(v_problems, '; ');
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- ── apply pass (all rows validated + locked in this tx — atomic) ──
  FOR v_i IN 0..v_count - 1 LOOP
    v_item := v_items -> v_i;
    v_id := v_item ->> 'id';
    v_fa := v_item -> 'fa';
    v_ps := v_item -> 'ps';

    SELECT to_jsonb(o) INTO v_row_j
    FROM public."Opportunity" o
    WHERE o.id = v_id AND o."translationClaimId" = p_claim_id
    FOR UPDATE OF o;
    IF NOT FOUND THEN
      -- Cannot happen: validation pass locked these rows in this tx.
      RAISE EXCEPTION 'TGW:row_not_in_claim:row % vanished during commit', left(v_id, 40);
    END IF;

    v_plan := public.aria_tgw_source_plan(v_row_j);
    v_hash := v_plan ->> 'hash';
    v_origin := CASE WHEN jsonb_typeof(v_row_j -> 'translationOrigin') = 'object' THEN v_row_j -> 'translationOrigin' ELSE '{}'::jsonb END;
    v_origin_final := v_origin;
    IF v_fa IS NOT NULL THEN v_origin_final := jsonb_set(v_origin_final, '{fa}', to_jsonb('AI'::text)); END IF;
    IF v_ps IS NOT NULL THEN v_origin_final := jsonb_set(v_origin_final, '{ps}', to_jsonb('AI'::text)); END IF;

    UPDATE public."Opportunity" AS o SET
      "titleI18n"            = public.aria_tgw_merge_i18n(o."titleI18n",            v_fa, v_ps, 'title'),
      "descriptionI18n"      = public.aria_tgw_merge_i18n(o."descriptionI18n",      v_fa, v_ps, 'description'),
      "aiSummaryI18n"        = public.aria_tgw_merge_i18n(o."aiSummaryI18n",        v_fa, v_ps, 'summary'),
      "eligibilityI18n"      = public.aria_tgw_merge_i18n(o."eligibilityI18n",      v_fa, v_ps, 'eligibility'),
      "benefitsI18n"         = public.aria_tgw_merge_i18n(o."benefitsI18n",         v_fa, v_ps, 'benefits'),
      "responsibilitiesI18n" = public.aria_tgw_merge_i18n(o."responsibilitiesI18n", v_fa, v_ps, 'responsibilities'),
      "requirementsI18n"     = public.aria_tgw_merge_i18n(o."requirementsI18n",     v_fa, v_ps, 'requirements'),
      "guidelinesI18n"       = public.aria_tgw_merge_i18n(o."guidelinesI18n",       v_fa, v_ps, 'guidelines'),
      "jobTypeI18n"          = public.aria_tgw_merge_i18n(o."jobTypeI18n",          v_fa, v_ps, 'jobType'),
      "salaryI18n"           = public.aria_tgw_merge_i18n(o."salaryI18n",           v_fa, v_ps, 'salary'),
      "educationReqI18n"     = public.aria_tgw_merge_i18n(o."educationReqI18n",     v_fa, v_ps, 'educationReq'),
      "experienceI18n"       = public.aria_tgw_merge_i18n(o."experienceI18n",       v_fa, v_ps, 'experience'),
      "faStatus" = CASE WHEN v_fa IS NOT NULL THEN 'complete' ELSE o."faStatus" END,
      "psStatus" = CASE WHEN v_ps IS NOT NULL THEN 'complete' ELSE o."psStatus" END,
      "translationStatus" = public.aria_tgw_legacy_status(
        CASE WHEN v_fa IS NOT NULL THEN 'complete' ELSE o."faStatus" END,
        CASE WHEN v_ps IS NOT NULL THEN 'complete' ELSE o."psStatus" END),
      "translationSourceHash" = v_hash,
      "translationOrigin" = v_origin_final,
      "translationClaimId" = NULL,
      "translationClaimedBy" = NULL,
      "translationClaimedAt" = NULL
    WHERE o.id = v_id;

    IF v_fa IS NOT NULL THEN v_fa_count := v_fa_count + 1; END IF;
    IF v_ps IS NOT NULL THEN v_ps_count := v_ps_count + 1; END IF;
  END LOOP;

  INSERT INTO public."AuditLog" (id, action, entity, "entityId", details)
  VALUES (
    gen_random_uuid()::text, 'translation_commit', 'Opportunity', left(p_claim_id, 64),
    jsonb_build_object('committed', v_count, 'fa', v_fa_count, 'ps', v_ps_count)::text
  );

  RETURN jsonb_build_object(
    'ok', true,
    'claimId', p_claim_id,
    'committed', v_count,
    'faCompleted', v_fa_count,
    'psCompleted', v_ps_count
  );
END
$fn$;

-- Release ALL rows of a claim so they become claimable again immediately.
-- Idempotent: an unknown/expired claim simply releases zero rows.
CREATE OR REPLACE FUNCTION public.fail_translation_batch(
  p_claim_id text,
  p_errors jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_released bigint;
BEGIN
  IF p_claim_id IS NULL OR btrim(p_claim_id, ' ') = '' THEN
    RAISE EXCEPTION 'TGW:invalid_claim:claimId is required';
  END IF;

  UPDATE public."Opportunity" SET
    "translationClaimId" = NULL,
    "translationClaimedBy" = NULL,
    "translationClaimedAt" = NULL
  WHERE "translationClaimId" = p_claim_id;
  GET DIAGNOSTICS v_released = ROW_COUNT;

  INSERT INTO public."AuditLog" (id, action, entity, "entityId", details)
  VALUES (
    gen_random_uuid()::text, 'translation_fail', 'Opportunity', left(p_claim_id, 64),
    jsonb_build_object('released', v_released,
      'errors', COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p_errors) = 'array' THEN p_errors ELSE '[]'::jsonb END), 0))::text
  );

  RETURN jsonb_build_object('ok', true, 'claimId', p_claim_id, 'released', v_released);
END
$fn$;

-- Queue observability: pending / stale / processing / manual counts.
CREATE OR REPLACE FUNCTION public.translation_queue_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_pending int;
  v_pending_fa int;
  v_pending_ps int;
  v_processing int;
  v_claimed_expired int;
  v_manual int;
  v_manual_stale int;
  v_stale int := 0;
  v_row record;
  v_plan jsonb;
BEGIN
  SELECT count(*)::int INTO v_pending_fa
  FROM public."Opportunity"
  WHERE status = 'published'
    AND (deadline IS NULL OR deadline >= now())
    AND ("translationClaimId" IS NULL OR "translationClaimedAt" < now() - interval '90 minutes')
    AND ("faStatus" IS NULL OR "faStatus" IN ('pending','failed','processing'))
    AND COALESCE("translationOrigin" ->> 'fa', '') NOT IN ('MANUAL','MANUAL_STALE');

  SELECT count(*)::int INTO v_pending_ps
  FROM public."Opportunity"
  WHERE status = 'published'
    AND (deadline IS NULL OR deadline >= now())
    AND ("translationClaimId" IS NULL OR "translationClaimedAt" < now() - interval '90 minutes')
    AND "faStatus" = 'complete'
    AND ("psStatus" IS NULL OR "psStatus" IN ('pending','failed','processing'))
    AND COALESCE("translationOrigin" ->> 'ps', '') NOT IN ('MANUAL','MANUAL_STALE');

  SELECT count(*)::int INTO v_pending
  FROM public."Opportunity"
  WHERE status = 'published'
    AND (deadline IS NULL OR deadline >= now())
    AND ("translationClaimId" IS NULL OR "translationClaimedAt" < now() - interval '90 minutes')
    AND (
      (("faStatus" IS NULL OR "faStatus" IN ('pending','failed','processing'))
        AND COALESCE("translationOrigin" ->> 'fa', '') NOT IN ('MANUAL','MANUAL_STALE'))
      OR
      ("faStatus" = 'complete'
        AND ("psStatus" IS NULL OR "psStatus" IN ('pending','failed','processing'))
        AND COALESCE("translationOrigin" ->> 'ps', '') NOT IN ('MANUAL','MANUAL_STALE'))
    );

  SELECT count(*)::int INTO v_processing
  FROM public."Opportunity"
  WHERE "translationClaimId" IS NOT NULL
    AND "translationClaimedAt" > now() - interval '90 minutes';

  SELECT count(*)::int INTO v_claimed_expired
  FROM public."Opportunity"
  WHERE "translationClaimId" IS NOT NULL
    AND "translationClaimedAt" <= now() - interval '90 minutes';

  SELECT count(*)::int INTO v_manual
  FROM public."Opportunity"
  WHERE ("translationOrigin" ->> 'fa') = 'MANUAL' OR ("translationOrigin" ->> 'ps') = 'MANUAL';

  SELECT count(*)::int INTO v_manual_stale
  FROM public."Opportunity"
  WHERE ("translationOrigin" ->> 'fa') = 'MANUAL_STALE' OR ("translationOrigin" ->> 'ps') = 'MANUAL_STALE';

  -- Stale = completed translations whose (hash-tracked) source changed.
  FOR v_row IN
    SELECT o.*
    FROM public."Opportunity" o
    WHERE o.status = 'published'
      AND o."translationSourceHash" IS NOT NULL
      AND (o."faStatus" = 'complete' OR o."psStatus" = 'complete')
  LOOP
    v_plan := public.aria_tgw_source_plan(to_jsonb(v_row));
    IF (v_plan ->> 'hash') IS DISTINCT FROM (to_jsonb(v_row) ->> 'translationSourceHash') THEN
      v_stale := v_stale + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'queue', jsonb_build_object(
      'pending', v_pending,
      'pendingFa', v_pending_fa,
      'pendingPs', v_pending_ps,
      'stale', v_stale,
      'processing', v_processing,
      'claimedExpired', v_claimed_expired,
      'manual', v_manual,
      'manualStale', v_manual_stale
    )
  );
END
$fn$;

-- ── privileges: the worker role may ONLY execute the four RPCs ──────────────

REVOKE ALL ON FUNCTION public.aria_tgw_chunk_text(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_source_plan(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_normalize_digits(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_strip_number(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_legacy_status(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_merge_i18n(jsonb, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aria_tgw_validate_field(text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.claim_translation_batch(int, int, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_translation_batch(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_translation_batch(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.translation_queue_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_translation_batch(int, int, boolean, text) TO aria_translation_worker;
GRANT EXECUTE ON FUNCTION public.commit_translation_batch(text, jsonb) TO aria_translation_worker;
GRANT EXECUTE ON FUNCTION public.fail_translation_batch(text, jsonb) TO aria_translation_worker;
GRANT EXECUTE ON FUNCTION public.translation_queue_status() TO aria_translation_worker;
