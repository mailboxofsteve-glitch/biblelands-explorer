
CREATE TABLE public.lesson_scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  scene_order INTEGER NOT NULL DEFAULT 0,
  center_lng DOUBLE PRECISION NOT NULL DEFAULT 35.5,
  center_lat DOUBLE PRECISION NOT NULL DEFAULT 32.0,
  zoom DOUBLE PRECISION NOT NULL DEFAULT 6,
  bearing DOUBLE PRECISION NOT NULL DEFAULT 0,
  pitch DOUBLE PRECISION NOT NULL DEFAULT 0,
  active_overlay_ids TEXT[] NOT NULL DEFAULT '{}',
  visible_pin_ids TEXT[] NOT NULL DEFAULT '{}',
  highlighted_pin_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenes" ON public.lesson_scenes
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own scenes" ON public.lesson_scenes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own scenes" ON public.lesson_scenes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own scenes" ON public.lesson_scenes
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Public lesson scenes are viewable" ON public.lesson_scenes
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM lessons WHERE lessons.id = lesson_scenes.lesson_id AND lessons.is_public = true
  ));
