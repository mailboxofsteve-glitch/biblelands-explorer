

## Add GLB Model Preview and Auto-Altitude in Admin Panel

### Overview
Add an inline 3D preview of uploaded GLB models in the location editor dialog, and auto-query terrain elevation to set the altitude offset automatically.

### 1. GLB Preview Component

**New file: `src/components/Admin/ModelPreview.tsx`**

A small React Three Fiber (`@react-three/fiber` + `@react-three/drei`) canvas that renders the uploaded model inline in the admin dialog.

- Accepts `modelUrl: string | null` prop
- Shows a 200px-tall canvas with orbit controls, auto-rotating
- Uses `useGLTF` from drei to load the model
- Centers and auto-scales the model to fit the canvas using `<Center>` + `<Bounds>`
- Applies the current scale/rotation values from the form so the admin can see changes live
- Shows a placeholder message ("No model selected" or "Using default city model") when no URL is set
- Displays a loading spinner while the model loads

### 2. Auto-Altitude from Terrain

When a model URL is uploaded or coordinates change, automatically query Mapbox Tilequery API to get terrain elevation:

- Call `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?access_token=...` to get terrain elevation
- Set `model_altitude` to the returned elevation value
- This ensures models sit on the terrain surface by default
- Admin can still manually adjust the altitude offset after auto-set

Actually, the simpler approach: the `model_altitude` field is an **offset** above terrain (the `use3DModels` hook already passes altitude to `MercatorCoordinate.fromLngLat`). So the default of `0` should already sit on terrain. The issue is that `MercatorCoordinate.fromLngLat(lngLat, altitude)` treats `altitude` as meters above sea level, not above terrain.

**Fix**: In `use3DModels.ts`, when computing the Mercator coordinate, query the map's terrain elevation at the pin's coordinates using `map.queryTerrainElevation(lngLat)` and add it to the pin's `model_altitude` offset. This way altitude=0 means "on the terrain" and any offset raises it above.

### 3. Integration in Admin Dialog

In `src/pages/Admin.tsx`, inside the 3D Model section (lines 462-540):
- Add the `<ModelPreview>` component below the upload input, showing whenever `form.model_url` has a value or when using the default city model
- Pass scale and rotation form values so preview updates live

### Dependencies
Already have `three`. Need to add:
- `@react-three/fiber@^8.18` 
- `@react-three/drei@^9.122.0`

### Files Changed

| File | Change |
|------|--------|
| `src/components/Admin/ModelPreview.tsx` | New — R3F canvas with GLTF preview, orbit controls, auto-fit |
| `src/pages/Admin.tsx` | Add `<ModelPreview>` in the 3D model section of location dialog |
| `src/hooks/use3DModels.ts` | Use `map.queryTerrainElevation()` to place models on terrain surface |
| `package.json` | Add `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0` |

