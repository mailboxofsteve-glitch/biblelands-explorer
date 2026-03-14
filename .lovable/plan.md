

## Fix Scene Count and Add Lesson Deletion on Dashboard

### Problem 1: Scene count always shows 0
The `scene_count` column on the `lessons` table defaults to 0 and is never updated — no trigger or application code increments it when scenes are added/deleted.

**Fix**: Create a database trigger that automatically updates `lessons.scene_count` whenever rows are inserted, updated (lesson_id change), or deleted in `lesson_scenes`.

```sql
CREATE OR REPLACE FUNCTION update_lesson_scene_count()
RETURNS trigger AS $$
BEGIN
  -- Update old lesson's count (for DELETE or UPDATE that changes lesson_id)
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE lessons SET scene_count = (
      SELECT count(*) FROM lesson_scenes WHERE lesson_id = OLD.lesson_id
    ) WHERE id = OLD.lesson_id;
  END IF;
  -- Update new lesson's count (for INSERT or UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE lessons SET scene_count = (
      SELECT count(*) FROM lesson_scenes WHERE lesson_id = NEW.lesson_id
    ) WHERE id = NEW.lesson_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Also run a one-time backfill to fix existing lessons:
```sql
UPDATE lessons SET scene_count = (
  SELECT count(*) FROM lesson_scenes WHERE lesson_id = lessons.id
);
```

### Problem 2: No way to delete lessons from dashboard
Currently deletion only exists inside the map editor's LessonSettingsModal.

**Fix in `src/pages/Dashboard.tsx`**:
- Add a delete button (trash icon) on each lesson card with an `AlertDialog` confirmation.
- On confirm, call `supabase.from("lessons").delete().eq("id", lessonId)` and remove from local state.
- Cascade delete already handles scenes/pins via foreign keys.

### Files to change
| File | Change |
|------|--------|
| Migration (new) | Add trigger + backfill for `scene_count` |
| `src/pages/Dashboard.tsx` | Add delete button with confirmation dialog to lesson cards |

