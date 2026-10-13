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
  IF NOT (out_text ~ '[[:alpha:]ء-يپچژگکیټډړږښڅځېۍ]') THEN
    problems := array_append(problems, 'no_letters');
  END IF;

  src_n := public.aria_tgw_normalize_digits(src);
  out_n := public.aria_tgw_normalize_digits(out_text);

  -- An untranslated copy of a substantial source is never acceptable.
  IF lower(out_n) = lower(src_n) AND char_length(src) > 40 THEN
    problems := array_append(problems, 'untranslated_copy');
  END IF;

  src_len := char_length(btrim(src, E' \t\r\n\v\f'));
  ratio := char_length(out_text)::float8 / GREATEST(1, src_len);
  IF src_len > 200 AND (ratio < 0.18 OR ratio > 4) THEN
    problems := array_append(problems, 'length_ratio');
  ELSIF src_len > 40 AND (ratio < 0.25 OR ratio > 5) THEN
    problems := array_append(problems, 'length_ratio');
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

  -- Preserve every numeric token, including single-digit eligibility values.
  -- Exact tokens prevent 3 years from being accepted as 13 or 2023 years.
  FOREACH n IN ARRAY ARRAY(SELECT DISTINCT replace((m)[1], ',', '')
      FROM regexp_matches(src_n, '[0-9]+(?:[.,][0-9]+)*', 'g') m) LOOP
    IF NOT EXISTS (SELECT 1 FROM regexp_matches(out_n, '[0-9]+(?:[.,][0-9]+)*', 'g') m
                   WHERE replace((m)[1], ',', '') = n) THEN
      problems := problems || ('number_lost:' || left(n, 60));
    END IF;
  END LOOP;

  RETURN problems;
END
$fn$;