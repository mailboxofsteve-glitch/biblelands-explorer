

## Verification & Fixes Plan

### Current State

- **`src/lib/supabase.ts`** — Correctly re-exports from the auto-generated client. No changes needed.
- **`src/integrations/supabase/client.ts`** — Properly configured with env vars. No changes needed.
- **Database tables** — All exist with correct schemas and PERMISSIVE RLS policies.
- **Overlays table** — Empty. No seed data. The `useOverlays` hook will work but will always show "No overlays for this era."

### Issues to Fix

1. **No overlay seed data.** The overlays table is empty, so the sidebar shows nothing. We need to insert sample preloaded overlays with real GeoJSON for at least a couple eras (e.g. `nt_ministry`, `exodus`) so teachers can see the system working.

2. **Console warnings: `Function components cannot be given refs`** — `EraSelector` and `OverlayToggles` are plain function components but `MapPage` is not passing refs to them. This warning is harmless but let's verify MapPage isn't accidentally passing refs (it isn't based on the code — this may be a stale warning or from a previous render).

### Implementation Steps

**Step 1 — Seed overlay data via migration**

Insert 4-5 preloaded overlays with real GeoJSON covering key eras:
- `nt_ministry`: "Paul's Second Journey" (LineString route), "Galilee Region" (Polygon)
- `exodus`: "Exodus Route" (LineString), "Land of Goshen" (Polygon)
- `united_kingdom`: "Kingdom of Israel" (Polygon)

Each overlay will have `is_preloaded = true`, appropriate `default_color`, `default_style`, and simplified GeoJSON coordinates for the Holy Land region.

**Step 2 — Verify `useOverlays` hook works with the types**

The hook selects columns explicitly and casts to `OverlayRow`. The types in `types.ts` match the table schema (geojson as `Json`, default_style as `Json`). The hook should work without changes.

**Step 3 — No code changes needed**

The existing `useOverlays.ts`, `useOverlayLayers.ts`, `OverlayToggles.tsx`, `EraSelector.tsx`, `MapCanvas.tsx`, and `MapPage.tsx` are all correctly wired. Once seed data exists, the era selector will filter overlays and toggling them will render GeoJSON on the map.

### Summary

The only action needed is inserting seed overlay data. All existing code is correctly initialized and will work once there is data to display.

