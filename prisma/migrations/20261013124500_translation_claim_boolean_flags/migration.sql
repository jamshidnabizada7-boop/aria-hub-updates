-- Null legacy language statuses must still yield strict boolean claim flags.
DO $migration$
DECLARE
  original text := pg_get_functiondef('public.claim_translation_batch_excluding(integer,integer,boolean,text,text[])'::regprocedure);
  corrected text;
BEGIN
  corrected := replace(original,
    'v_ps_pending := (v_j ->> ''faStatus'') = ''complete''',
    'v_ps_pending := COALESCE(v_j ->> ''faStatus'', '''') = ''complete''');
  IF corrected = original THEN
    RAISE EXCEPTION 'Expected translation claim flag assignment was not found';
  END IF;
  EXECUTE corrected;
END
$migration$;
