
-- Add year range columns to locations
ALTER TABLE public.locations ADD COLUMN year_start integer;
ALTER TABLE public.locations ADD COLUMN year_end integer;
ALTER TABLE public.locations ADD COLUMN parent_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

-- Add year range columns to overlays
ALTER TABLE public.overlays ADD COLUMN year_start integer;
ALTER TABLE public.overlays ADD COLUMN year_end integer;

-- Recreate the view to include new columns
CREATE OR REPLACE VIEW public.locations_with_coords AS
SELECT id,
    name_ancient,
    name_modern,
    name_hebrew,
    st_x(coordinates::geometry) AS lng,
    st_y(coordinates::geometry) AS lat,
    location_type,
    era_tags,
    primary_verse,
    description,
    year_start,
    year_end,
    parent_location_id
FROM locations;
