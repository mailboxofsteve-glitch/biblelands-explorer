
CREATE OR REPLACE FUNCTION update_lesson_scene_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE lessons SET scene_count = (
      SELECT count(*) FROM lesson_scenes WHERE lesson_id = OLD.lesson_id
    ) WHERE id = OLD.lesson_id;
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE lessons SET scene_count = (
      SELECT count(*) FROM lesson_scenes WHERE lesson_id = NEW.lesson_id
    ) WHERE id = NEW.lesson_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
