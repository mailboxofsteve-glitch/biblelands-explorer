

## Add 3D GLB Models to Map Locations

### Overview
Allow admins to attach `.glb` 3D models to locations. Models render on the Mapbox terrain using a Three.js custom layer. City-type locations get a bundled default low-poly building model that can be replaced. Admins configure model URL, scale, rotation, and altitude offset per location.

### Architecture

```text
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Admin Panel  │────▶│  locations    │────▶│  MapCanvas      │
│  (upload/URL) │     │  table + new │     │  Three.js custom│
│               │     │  model cols) │     │  layer renders  │
└──────────────┘     └──────────────┘     │  all GLBs       │
                      ┌──────────────┐     └─────────────────┘
                      │ Storage      │
                      │ (glb-models) │
                      └──────────────┘
```

### Database Changes

**Migration**: Add columns to `locations` table:
```sql
ALTER TABLE locations ADD COLUMN model_url text DEFAULT NULL;
ALTER TABLE locations ADD COLUMN model_scale double precision DEFAULT 1.0;
ALTER TABLE locations ADD COLUMN model_rotation_x double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_rotation_y double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_rotation_z double precision DEFAULT 0;
ALTER TABLE locations ADD COLUMN model_altitude double precision DEFAULT 0;
```

These will also need to be added to the `locations_with_coords` view.

**Storage bucket**: Create a `glb-models` public bucket for uploaded `.glb` files. Public read, admin-only write.

### Default Model
Bundle a simple low-poly ancient buildings `.glb` file in `public/models/default-city.glb`. When a city-type location has no `model_url`, the renderer uses this default. A checkbox in the admin panel lets admins opt a city out of the default (`model_url = 'none'` sentinel).

### Rendering: Three.js Custom Layer

**New file: `src/hooks/use3DModels.ts`**

A hook that:
1. Reads location data (from `usePins` or a dedicated query including model columns)
2. Creates a single Mapbox `CustomLayerInterface` with Three.js
3. For each location with a model, loads the `.glb` via `GLTFLoader`, positions it using `MercatorCoordinate.fromLngLat()`, applies scale/rotation/altitude
4. Caches loaded models to avoid re-fetching
5. On pin data change, adds/removes models from the Three.js scene

Key technical details:
- Uses `three` + `three/examples/jsm/loaders/GLTFLoader` (new dependencies)
- Single custom layer (`3d-models`) registered once on map load
- `renderingMode: '3d'` for depth testing against terrain
- Models positioned via `mapboxgl.MercatorCoordinate.fromLngLat(lngLat, altitude)`
- The render function applies the Mapbox projection matrix to the Three.js camera

### Dependencies
- `three@^0.166.0` (compatible with React 18)
- `@types/three` for TypeScript support

### Admin Panel Changes

**`src/pages/Admin.tsx` — LocationTab**:
- Add "3D Model" section in the add/edit dialog:
  - File upload input (`.glb` only) → uploads to `glb-models` bucket
  - OR paste external URL field
  - Scale slider (0.1 – 50, default 1.0)
  - Rotation X/Y/Z sliders (0–360 degrees)
  - Altitude offset input (meters)
  - "Use default city model" checkbox (for city types)
  - "No 3D model" checkbox to opt out entirely
- Preview not included in v1 (models are previewed on the actual map)

### Data Flow

1. `usePins` hook updated to also fetch `model_url, model_scale, model_rotation_x, model_rotation_y, model_rotation_z, model_altitude` from `locations_with_coords`
2. `use3DModels` hook receives pins + map ref, manages the custom layer
3. `MapCanvas` calls `use3DModels` alongside existing hooks
4. Models appear on the 3D terrain at their location coordinates

### Visibility Integration
- Models respect `hiddenLocationIds` (hidden in presentation mode)
- Models respect era filtering (only shown for pins in current era)
- When a location is selected, its model could get a subtle highlight (stretch goal)

### File Summary

| File | Action |
|------|--------|
| Migration SQL | Add model columns to `locations`, update view, create bucket |
| `package.json` | Add `three`, `@types/three` |
| `public/models/default-city.glb` | Bundled default low-poly city model |
| `src/hooks/use3DModels.ts` | New — Three.js custom layer hook |
| `src/hooks/usePins.ts` | Fetch model columns |
| `src/components/Map/MapCanvas.tsx` | Wire `use3DModels` hook |
| `src/pages/Admin.tsx` | Model upload/config UI in location editor |

### Risks and Considerations
- **Performance**: Each unique `.glb` is loaded once and instanced. Hundreds of default city models could be heavy — we'll use a low-poly model (< 50KB) and consider LOD or distance-based visibility culling.
- **Terrain alignment**: Models sit at terrain elevation via `MercatorCoordinate` altitude. The `model_altitude` offset allows fine-tuning if a model floats or sinks.
- **Default model source**: We need to source or create a small `.glb` of ancient-style buildings. Options: free asset from Sketchfab/Poly Pizza, or a simple procedurally generated one. This will need to be provided or created separately.

