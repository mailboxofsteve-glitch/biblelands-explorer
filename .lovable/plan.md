

## Problem

Routes saved via "Draw Route" are inserted into the `overlays` table and their ID is added to `activeOverlayIds` via `addCustomOverlay()`. However, `useOverlays` only fetches data on `[user]` dependency change — it never re-fetches after a new overlay is created. So `useOverlayLayers` sees the new ID in `activeIds` but can't find the overlay data in the `overlays` array (returns `undefined`), and skips rendering it.

## Fix

**Single file change: `src/hooks/useOverlays.ts`**

Add `customOverlayIds` from the map store as a dependency to the fetch effect, so that when `addCustomOverlay` pushes a new ID, the hook re-fetches from the database and picks up the newly created overlay.

```ts
const customOverlayIds = useMapStore((s) => s.customOverlayIds);

useEffect(() => {
  // existing fetch logic...
}, [user, customOverlayIds]); // add customOverlayIds dependency
```

This ensures that after saving a route (which calls `addCustomOverlay` → updates `customOverlayIds`), the overlays are re-fetched from the database, the new overlay appears in the `overlays` array, and `useOverlayLayers` can then render it on the map.

