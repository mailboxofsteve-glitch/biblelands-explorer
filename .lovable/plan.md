

## Fix 3D Models Not Rendering

### Root Cause

The models ARE being loaded and added to the scene, but they're **invisible because the default scale is 1.0 meters** — literally a 1-meter object on a map viewed at zoom level 6. At that zoom, a 1-meter object is sub-pixel. The GLTF model geometry spans roughly -1 to +2.4 units, so at scale 1.0 it's about 3 meters across in the real world.

The database confirms all cities have `model_scale = 1` and `model_url = NULL`, which means they correctly fall through to the default city model, but the scale makes them invisible.

### Fix

**`src/hooks/use3DModels.ts`**:
- Change the default scale constant from `1.0` to a much larger value (e.g., `2000`) so city models are visible at typical map zoom levels. A 3-unit GLTF model at scale 2000 = ~6km footprint, which is reasonable for representing a city on a biblical map.
- Apply this default only when `pin.model_scale` is null (i.e., never explicitly set by admin). If an admin sets a custom scale, use that value.

**`src/pages/Admin.tsx`**:
- Update the scale slider default to `2000` and increase the max range to accommodate map-scale values (e.g., max 10000).
- Update the initial form state so new locations start with a sensible default.

**`supabase migration`**:
- Update the `model_scale` column default from `1.0` to `2000` so new locations get a visible default.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/use3DModels.ts` | Default scale constant → 2000 |
| `src/pages/Admin.tsx` | Scale slider range and default |
| Migration SQL | `ALTER COLUMN model_scale SET DEFAULT 2000` |

