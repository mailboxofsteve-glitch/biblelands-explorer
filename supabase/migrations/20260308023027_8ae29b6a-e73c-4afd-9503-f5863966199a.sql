CREATE TABLE public.overlays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'route',
  era TEXT NOT NULL,
  default_color TEXT NOT NULL DEFAULT '#c8a020',
  default_style JSONB NOT NULL DEFAULT '{}',
  geojson JSONB NOT NULL DEFAULT '{}',
  is_preloaded BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.overlays ENABLE ROW LEVEL SECURITY;

-- Everyone can read preloaded overlays
CREATE POLICY "Anyone can view preloaded overlays"
  ON public.overlays FOR SELECT
  USING (is_preloaded = true);

-- Users can view their own overlays
CREATE POLICY "Users can view own overlays"
  ON public.overlays FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create overlays
CREATE POLICY "Users can create overlays"
  ON public.overlays FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own overlays
CREATE POLICY "Users can update own overlays"
  ON public.overlays FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own overlays
CREATE POLICY "Users can delete own overlays"
  ON public.overlays FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_overlays_updated_at
  BEFORE UPDATE ON public.overlays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();