
CREATE OR REPLACE FUNCTION public.bulk_insert_locations(
  locations jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc jsonb;
  inserted_count integer := 0;
BEGIN
  -- Only allow admins
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR loc IN SELECT * FROM jsonb_array_elements(locations)
  LOOP
    INSERT INTO public.locations (
      name_ancient,
      name_modern,
      location_type,
      era_tags,
      primary_verse,
      description,
      coordinates
    ) VALUES (
      loc->>'name_ancient',
      NULLIF(loc->>'name_modern', ''),
      COALESCE(loc->>'location_type', 'city'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(loc->'era_tags')), '{}'::text[]),
      NULLIF(loc->>'primary_verse', ''),
      NULLIF(loc->>'description', ''),
      ST_SetSRID(ST_MakePoint(
        (loc->>'lng')::double precision,
        (loc->>'lat')::double precision
      ), 4326)::geography
    );
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;
