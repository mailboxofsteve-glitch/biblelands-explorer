

## Fix Textbox Overlay Persistence

### Root Cause

When a user adds a textbox, it goes into `sceneTextboxes` in the zustand store — but this is a **working state** that is disconnected from the `scenes` array. The textboxes only get written into a scene object when `saveScene` (new scene) or `updateScene` (existing scene) is explicitly called. So if a user adds textboxes and then navigates away without manually updating the scene, the textboxes are lost — they were never persisted to the database.

### Fix

Auto-sync `sceneTextboxes` changes back to the current scene and persist to the database. Add an effect in `MapPage.tsx` that watches `sceneTextboxes` and `currentSceneIndex`: whenever textboxes change and there's an active scene, update that scene's `textboxes` field in the store and call `persistScene`.

To avoid persisting on initial load (when `loadScene` sets `sceneTextboxes`), use a ref to skip the first render after a scene load.

### Implementation

**`src/pages/MapPage.tsx`**: Add a `useEffect` that:
1. Watches `sceneTextboxes` and `currentSceneIndex`
2. Skips the initial sync after `loadScene` (tracked via a `skipNextTextboxSync` ref)
3. When textboxes change on an active scene, updates the scene in the store and calls `persistScene`

**`src/store/mapStore.ts`**: In `loadScene`, no changes needed — it already sets `sceneTextboxes`.

**`src/pages/MapPage.tsx`** additions:
```typescript
const sceneTextboxes = useMapStore((s) => s.sceneTextboxes);
const currentSceneIndex = useMapStore((s) => s.currentSceneIndex);
const scenes = useMapStore((s) => s.scenes);

const skipTextboxSync = useRef(false);

// Mark skip when scene is loaded
// (wrap loadScene calls to set skipTextboxSync = true)

useEffect(() => {
  if (skipTextboxSync.current) {
    skipTextboxSync.current = false;
    return;
  }
  if (currentSceneIndex == null) return;
  const scene = scenes[currentSceneIndex];
  if (!scene) return;
  
  const updated = { ...scene, textboxes: [...sceneTextboxes] };
  // Update in store and persist
  useMapStore.getState().setScenes(
    scenes.map((s, i) => i === currentSceneIndex ? updated : s)
  );
  persistScene(updated);
}, [sceneTextboxes]);
```

The `skipTextboxSync` ref is set to `true` right before every `loadScene` call (in `handlePlay` in SceneList and in PresentationHUD navigation) to prevent the load itself from triggering a re-persist.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/MapPage.tsx` | Add effect to auto-persist textbox changes to current scene |
| `src/components/Map/SceneList.tsx` | Set skip ref before loadScene calls |

