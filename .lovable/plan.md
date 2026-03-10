

## Fix Build Error + Ensure Draw Preview Works

There are two issues to address:

### 1. Build Error: `.geojson` file not recognized by Vite/Rollup

The file `src/data/ne_50m_land_full.geojson` has a `.geojson` extension which Rollup doesn't handle natively. It needs to be treated as JSON.

**Fix in `vite.config.ts`:** Add `assetsInclude` or configure the JSON plugin to handle `.geojson` files. Simplest approach: rename the file to `.json`, but since it's large and already referenced, the cleaner fix is adding a Vite config option:

```ts
assetsInclude: ['**/*.geojson'],
```

Actually, that treats it as a static asset (URL), not parsed JSON. The correct fix is to use the `json` plugin approach. The simplest reliable fix: **rename `ne_50m_land_full.geojson` to `ne_50m_land_full.json`** and update the import in `AdminMapPicker.tsx`.

### 2. Draw Preview Already Exists (but blocked by build error)

Looking at the code, `AdminMapPicker` already renders:
- **Circle markers** for each clicked point (`draw-points` layer)
- **Dashed lines** connecting points (`draw-line` layer)
- **Semi-transparent fill** for polygons (`draw-fill` layer)
- After clipping, `updateDrawSource` is called to refresh the map with clipped coordinates

The preview is already implemented — it's just not working because the build is failing due to the `.geojson` import error. Once the build error is fixed, points, lines, and polygon fills will render correctly on click and after clipping.

### Files to modify
- **Rename**: `src/data/ne_50m_land_full.geojson` → `src/data/ne_50m_land_full.json`
- **Update import**: `src/components/Admin/AdminMapPicker.tsx` line 188 — change `.geojson` to `.json`

