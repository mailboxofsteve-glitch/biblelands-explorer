
-- Create pins table for teacher-placed markers on lessons
CREATE TABLE public.pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  icon_type text NOT NULL DEFAULT 'city',
  coordinates jsonb NOT NULL DEFAULT '[]'::jsonb,
  label text NOT NULL DEFAULT '',
  popup_title text NOT NULL DEFAULT '',
  popup_body text,
  scripture_refs text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own pins
CREATE POLICY "Users can view own pins"
  ON public.pins FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own pins"
  ON public.pins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own pins"
  ON public.pins FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own pins"
  ON public.pins FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Anyone can view pins on public lessons
CREATE POLICY "Public lesson pins are viewable"
  ON public.pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.id = pins.lesson_id AND lessons.is_public = true
    )
  );
