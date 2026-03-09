CREATE OR REPLACE VIEW public.locations_with_coords AS
SELECT
  id, name_ancient, name_modern, name_hebrew,
  ST_X(coordinates::geometry) AS lng,
  ST_Y(coordinates::geometry) AS lat,
  location_type, era_tags, primary_verse, description
FROM public.locations;