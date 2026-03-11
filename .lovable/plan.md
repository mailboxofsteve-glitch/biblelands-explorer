

## Scene-Independent Overlay State

### How it works today

The system already snapshots overlay state per scene correctly. When you "Save Current View as Scene," the current `activeOverlayIds` are captured and stored in that scene's `active_overlay_ids` array. Each scene has its own independent copy.

**The confusion**: When you toggle off assyrian-empire to prepare scene 2, the sidebar overlay toggles change globally — but scene 1's saved data is untouched. Playing scene 1 (clicking the ▶ button) will restore assyrian-empire because `loadScene` sets `activeOverlayIds` from the scene's saved snapshot.

### What needs to improve

The problem is **feedback and workflow**. There's no visual confirmation of what each scene contains, and no way to update a scene after saving it. Two changes:

### 1. Add "Update Scene" capability (`SceneList.tsx` + `mapStore.ts`)
- Add an `updateScene` action to the store that replaces an existing scene's camera + overlay state with the current map state (instead of always creating new scenes)
- Add a small "save/update" icon button on each SceneCard that overwrites that scene's `active_overlay_ids`, `visible_pin_ids`, and camera with the current map state
- Persist the update to the database via `persistScene`

### 2. Show overlay count badge on each SceneCard (`SceneList.tsx`)
- Display a small count badge (e.g., "3 overlays") on each scene card so users can see at a glance that scene 1 still has its overlays even when the global toggles show something different

### Files to modify
- **`src/store/mapStore.ts`** — add `updateScene(id, camera)` action
- **`src/components/Map/SceneList.tsx`** — add update button to SceneCard, show overlay count badge

