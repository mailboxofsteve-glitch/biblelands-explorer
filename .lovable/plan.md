

## Fix: Scene Overlay Rendering and Route Animation Cleanup

### Root Causes Found

**Bug 1 — Assyrian Empire not showing in Scene 1:**
The database correctly stores the Assyrian Empire overlay ID (`8ee00824...`) in Scene 1's `active_overlay_ids`. However, the Assyrian Empire overlay belongs to era `divided_kingdom`, while Scenes 2 and 3 use overlays from era `exile`. The `useOverlays` hook filters overlays by `currentEra` (line 55), so when you navigate to Scene 1 in Classroom Mode, the era is still `exile` — the Assyrian Empire overlay data is simply not available to the rendering hook, even though its ID is in `activeOverlayIds`.

**Bug 2 — Babylonian exile route persists across scenes:**
When a route animation completes, `animateRoute.ts` calls `cleanup(true)` (line 158), which intentionally keeps the drawn line layers on the map as a visual trail. When switching scenes, `triggerRouteAnimation` cancels the *current* animation but doesn't remove *completed* animation layers. These orphaned `anim-route-*` layers persist on the map through all subsequent scenes.

### Fix Plan

#### 1. Make overlay data available across eras (`useOverlays.ts` + `MapCanvas.tsx`)
- Add a new `allOverlays` return value from `useOverlays()` that includes overlays from ALL eras (the unfiltered list)
- In `MapCanvas.tsx`, pass `allOverlays` (not era-filtered `overlays`) to `useOverlayLayers`. The layer hook already only renders overlays whose IDs are in `activeOverlayIds`, so non-active overlays won't appear
- The sidebar's `OverlayToggles` continues using era-filtered `overlays` — no change there

#### 2. Clean up animation artifacts on scene change (`PresentationHUD.tsx` + `SceneList.tsx`)
- Create a helper function `cleanupAnimationLayers(map)` that removes all Mapbox sources/layers matching the `anim-route-*` pattern
- Call this function in `goToScene` (PresentationHUD) and `handlePlay` (SceneList) before calling `loadScene`, so stale route drawings are cleared when switching scenes

### Files to modify
- **`src/hooks/useOverlays.ts`** — expose `allOverlays` alongside era-filtered `overlays`
- **`src/components/Map/MapCanvas.tsx`** — pass `allOverlays` to `useOverlayLayers`
- **`src/lib/animateRoute.ts`** — add `cleanupAllAnimationLayers(map)` export
- **`src/components/Map/PresentationHUD.tsx`** — call cleanup before scene load
- **`src/components/Map/SceneList.tsx`** — call cleanup before scene load

