

## Add Textbox Overlays to Lesson Scenes

Textbox overlays are HTML elements positioned on the map within each scene. They consist of a bold heading and body text, with customizable fill color and fill transparency.

### Approach

Store textboxes as a JSONB array column on the `lesson_scenes` table. Each textbox has coordinates (lng/lat), heading, body, fill color, and opacity. They render as Mapbox HTML markers that move with the map. A modal in TeacherTools lets users create them (click map to place), and they're restored when a scene is loaded.

### Database

Add a `textboxes` JSONB column to `lesson_scenes`, defaulting to `'[]'::jsonb`:

```sql
ALTER TABLE public.lesson_scenes ADD COLUMN textboxes jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Each textbox entry shape:
```json
{
  "id": "uuid",
  "lng": 35.2,
  "lat": 31.8,
  "heading": "The Fall of Jerusalem",
  "body": "In 586 BC, Nebuchadnezzar...",
  "fill_color": "#1e3a5f",
  "fill_opacity": 0.85
}
```

### Type Changes — `src/types/index.ts`

Add a `SceneTextbox` interface and add `textboxes: SceneTextbox[]` to `LessonScene`.

### Store Changes — `src/store/mapStore.ts`

- Add `sceneTextboxes: SceneTextbox[]` to state (the textboxes for the currently active/being-edited scene).
- Add actions: `addTextbox`, `removeTextbox`, `updateTextbox`, `setSceneTextboxes`.
- `saveScene` and `updateScene` capture `sceneTextboxes` into the scene's `textboxes` field.
- `loadScene` restores `sceneTextboxes` from the loaded scene.

### New Component — `src/components/Map/TextboxOverlay.tsx`

A component that renders each textbox as a Mapbox `Marker` with a custom HTML element:
- Styled div with `background-color` set to `fill_color` at `fill_opacity`, rounded corners, padding.
- Bold heading (`<h4>`) and body text (`<p>`).
- Small delete button (×) visible only when not presenting.
- Uses `useMapStore` to read `sceneTextboxes` and renders a Mapbox Marker per textbox.

### New Modal — `src/components/Map/TextboxModal.tsx`

A dialog for creating/editing a textbox:
- Fields: Heading (text input), Body (textarea), Fill Color (color input), Opacity (slider 0–1).
- Triggered when user clicks map while in `textbox_drop` tool mode.

### Tool Mode Addition

- Add `"textbox_drop"` to the `ToolMode` union in `mapStore.ts`.
- Add a `startTextboxDrop` action.
- In `useToolInteractions.ts`, handle `textbox_drop` clicks to set pending coords and open the modal.

### TeacherTools Update — `src/components/Map/TeacherTools.tsx`

Add a "Text Box" button in a new section (or alongside pin drop tools) that activates `textbox_drop` mode.

### Scene Persistence — `src/hooks/useScenes.ts`

Include `textboxes` in the load mapping and in `persistScene` upsert.

### Rendering Hook — `src/hooks/useTextboxMarkers.ts`

A hook that syncs `sceneTextboxes` to Mapbox HTML markers:
- Creates/removes markers when the array changes.
- Each marker is a styled div with heading, body, and fill color/opacity.
- In presenting mode, hides the delete button.

### MapCanvas Integration

Import and call `useTextboxMarkers` in `MapCanvas.tsx`, passing the map instance and presenting flag.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: add `textboxes` JSONB column |
| `src/types/index.ts` | Add `SceneTextbox` interface, update `LessonScene` |
| `src/store/mapStore.ts` | Add `sceneTextboxes` state + actions, update `saveScene`/`loadScene`/`updateScene` |
| `src/hooks/useScenes.ts` | Include `textboxes` in load + persist |
| `src/hooks/useTextboxMarkers.ts` | New — renders textboxes as Mapbox markers |
| `src/hooks/useToolInteractions.ts` | Handle `textbox_drop` tool mode |
| `src/components/Map/TextboxModal.tsx` | New — create/edit textbox dialog |
| `src/components/Map/TeacherTools.tsx` | Add "Text Box" tool button |
| `src/components/Map/MapCanvas.tsx` | Wire `useTextboxMarkers` hook |

