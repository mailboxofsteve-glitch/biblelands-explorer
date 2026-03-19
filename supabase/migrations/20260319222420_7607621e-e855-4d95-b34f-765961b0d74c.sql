
-- Add 3D model columns to locations table
ALTER TABLE locations ADD COLUMN model_url text DEFAULT NULL;
ALTER TABLE locations ADD COLUMN model_scale double precision DEFAULT 1.0;
ALTER TABLE locations ADD COLUMN model_rotation_x double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_rotation_y double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_rotation_z double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_altitude double precision DEFAULT 0;

-- Recreate the locations_with_coords view to include model columns
CREATE OR REPLACE VIEW public.locations_with_coords AS
SELECT
  id,
  name_ancient,
  name_modern,
  name_hebrew,
  st_x((coordinates)::geometry) AS lng,
  st_y((coordinates)::geometry) AS lat,
  location_type,
  era_tags,
  primary_verse,
  description,
  year_start,
  year_end,
  parent_location_id,
  model_url,
  model_scale,
  model_rotation_x,
  model_rotation_y,
  model_rotation_z,
  model_altitude
FROM locations;

-- Create storage bucket for GLB models
INSERT INTO storage.buckets (id, name, public)
VALUES ('glb-models', 'glb-models', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read from glb-models bucket
CREATE POLICY "Public read glb-models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'glb-models');

-- RLS: admins can upload to glb-models bucket
CREATE POLICY "Admins can upload glb-models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'glb-models' AND public.has_role(auth.uid(), 'admin'));

-- RLS: admins can delete from glb-models bucket
CREATE POLICY "Admins can delete glb-models"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'glb-models' AND public.has_role(auth.uid(), 'admin'));
