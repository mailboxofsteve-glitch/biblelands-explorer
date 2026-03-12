

## Hide Locations in Classroom Mode + Save Era Per Scene

### Two Features

**Feature 1 — Hide specific locations for classroom mode**
Add a `hiddenLocationIds` set to the map store. In the Controls/Tools view, era-based location pins that are "hidden" render greyed out (reduced opacity). When classroom mode is entered, those pins are excluded entirely from the map.

**Feature 2 — Save era per scene**
Add an `era` field to `LessonScene`. When saving a scene, capture the current era. When loading a scene, restore that era (which updates the sidebar and the era-filtered location pins). Overlays continue to work cross-era as already implemented.

### Changes

#### 1. Database migration — add `era` column to `lesson_scenes`
```sql
ALTER TABLE public.lesson_scenes ADD COLUMN era text NOT NULL DEFAULT 'nt_ministry';
```

#### 2. `src/types/index.ts` — add fields to `LessonScene`
- Add `era: string` to the `LessonScene` interface
- Add `hidden_location_ids: string[]`

#### 3. Database migration — add `hidden_location_ids` column
```sql
ALTER TABLE public.lesson_scenes ADD COLUMN hidden_location_ids text[] NOT NULL DEFAULT '{}'::text[];
```

#### 4. `src/store/mapStore.ts`
- Add `hiddenLocationIds: string[]` state and `toggleHideLocation(id: string)` / `setHiddenLocationIds(ids: string[])` actions
- In `saveScene`: capture `currentEra` as `era` and `hiddenLocationIds` as `hidden_location_ids`
- In `loadScene`: restore `currentEra` from `scene.era` and `hiddenLocationIds` from `scene.hidden_location_ids`
- In `updateScene`: same capture logic

#### 5. `src/hooks/useScenes.ts`
- Include `era` and `hidden_location_ids` in the load/persist mapping

#### 6. `src/hooks/usePinMarkers.ts`
- Accept `hiddenLocationIds` and `presenting` props
- If `presenting`: filter out pins whose IDs are in `hiddenLocationIds` (don't render them at all)
- If not `presenting`: render hidden pins with 30% opacity (greyed out) and a click handler to toggle visibility

#### 7. `src/components/Map/MapCanvas.tsx`
- Read `hiddenLocationIds` and `presenting` (new prop) from store/props
- Pass them to `usePinMarkers`

#### 8. `src/pages/MapPage.tsx`
- Pass `presenting` state to `MapCanvas` so it can relay to pin markers

#### 9. Location pin UI in controls view
- Add an eye/eye-off toggle on each location pin marker (or in the pin popup) to hide/unhide for classroom mode
- Hidden pins show at reduced opacity with a strikethrough or dimmed style

### Files to modify
- **Database**: 1 migration adding `era` and `hidden_location_ids` columns to `lesson_scenes`
- **`src/types/index.ts`**: Add `era` and `hidden_location_ids` to `LessonScene`
- **`src/store/mapStore.ts`**: New state/actions for hidden locations; era capture/restore in scene save/load
- **`src/hooks/useScenes.ts`**: Map new fields in load/persist
- **`src/hooks/usePinMarkers.ts`**: Grey-out/hide logic based on mode
- **`src/components/Map/MapCanvas.tsx`**: Pass presenting + hiddenLocationIds to pin markers hook
- **`src/pages/MapPage.tsx`**: Pass `presenting` to `MapCanvas`
- **`src/pages/SharedLesson.tsx`**: Pass `presenting` to `MapCanvas`

