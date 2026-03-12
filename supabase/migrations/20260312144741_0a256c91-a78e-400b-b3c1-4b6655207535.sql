ALTER TABLE public.lesson_scenes ADD COLUMN era text NOT NULL DEFAULT 'nt_ministry';
ALTER TABLE public.lesson_scenes ADD COLUMN hidden_location_ids text[] NOT NULL DEFAULT '{}'::text[];