

## Fix 3D Model Rendering + Visibility of Toggle

### Problems Identified

**1. WebGL Context Loss (critical)**
The console shows repeated `THREE.WebGLRenderer: Context Lost` errors. This means the 3D layer crashes entirely — no models render after this happens. The Three.js renderer shares the WebGL context with Mapbox, and there's no recovery handler. Once the context is lost, the renderer becomes permanently broken until page reload.

**2. Jerusalem model URL is valid but context loss prevents rendering**
Jerusalem (Salem) has `era_tags: [united_kingdom, nt_ministry, ...]` and a valid `model_url` pointing to the storage bucket. The default era is `nt_ministry`, so the pin IS fetched. The model fails to appear because of the WebGL context loss, not a data or filtering issue.

**3. 3D toggle exists but may be hard to spot**
The toggle IS in the sidebar code (lines 255-262 of MapPage.tsx) and in MobileToolbar. It's labeled "3D" in a row with Fog, Labels, and Projector. On the current viewport (1137px), the desktop sidebar renders — the toggle is there but the row of 4 toggles is quite cramped at 240px sidebar width. It's likely being cut off or too small to notice.

### Fix Plan

**`src/hooks/use3DModels.ts`** — Handle WebGL context loss and restoration:
1. In the `onAdd` callback, listen for `webglcontextlost` and `webglcontextrestored` events on the map canvas
2. On context lost: set a flag to prevent render calls from throwing
3. On context restored: recreate the Three.js renderer and reload models
4. Add `preserveDrawingBuffer: false` to reduce GPU memory pressure (the current setup with terrain + hillshade + 3D models + Mapbox all sharing one context is memory-heavy)

**`src/hooks/use3DModels.ts`** — Separate DEM source for hillshade:
The console warning says "Raster DEM source is used both for terrain and as layer source" — this causes lower resolution AND increases GPU memory pressure. Move this fix to `MapCanvas.tsx`:
- Add a second raster-dem source (`mapbox-dem-hillshade`) specifically for the hillshade layer
- Keep `mapbox-dem` for terrain only
- This reduces GPU contention that contributes to context loss

**`src/components/Map/MapCanvas.tsx`** — Use separate DEM source for hillshade:
- In `addTerrainSource()`, create a second source `mapbox-dem-hillshade` and use it for the hillshade layer instead of reusing `mapbox-dem`

**`src/pages/MapPage.tsx`** — Make 3D toggle more visible:
- Move the toggle row to a two-row layout or add a label, so the 4 toggles aren't all crammed into one line
- Alternatively, break into two rows: `Fog | Labels` and `Projector | 3D`

**`src/components/Map/MobileToolbar.tsx`** — No changes needed (toggle already present)

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/use3DModels.ts` | WebGL context loss/restore handling |
| `src/components/Map/MapCanvas.tsx` | Separate DEM source for hillshade to reduce GPU pressure |
| `src/pages/MapPage.tsx` | Better layout for toggle row visibility |

