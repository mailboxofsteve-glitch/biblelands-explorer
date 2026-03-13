

## First-Person Terrain View

Yes — Mapbox GL JS supports 3D terrain and high-pitch camera angles that can produce a ground-level perspective. The key APIs are:

- **`map.setTerrain()`** — enables Mapbox's DEM-based 3D terrain extrusion
- **`map.setMaxPitch(85)`** — allows near-ground-level camera angles (default max is 60)
- **`map.flyTo({ pitch: 80, zoom: 16+ })`** — zooms into a location at steep pitch for an immersive view

### What it would look like

A "Ground View" toggle button on the map (and in presentation mode). When activated:
1. Enable 3D terrain with Mapbox DEM
2. Fly the camera to the current center at high zoom (~15) and steep pitch (~80°)
3. Show a floating exit button to return to the normal overhead view

The user could also click any pin and choose "View from ground" to fly into that location at ground level.

### Files to modify

#### 1. `src/components/Map/MapCanvas.tsx`
- On map load, add the Mapbox terrain source (`mapbox-dem`) and optionally a sky layer for atmosphere
- Set `maxPitch: 85` in the Map constructor options
- Do NOT enable terrain by default — only activate it when ground view is triggered (to keep normal map performance snappy)

#### 2. New: `src/components/Map/GroundViewButton.tsx`
- A small floating button (e.g., a person/eye icon) placed on the map
- On click: enables terrain via `map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })`, then calls `map.flyTo()` with pitch ~80, zoom ~15, duration 2000ms
- Toggles to an "Exit" state that resets pitch to 0, zoom to previous level, and disables terrain

#### 3. `src/pages/MapPage.tsx`
- Render `<GroundViewButton>` on the map area, passing the map ref
- Track ground-view state to optionally hide sidebars for an immersive feel

#### 4. `src/components/Map/PresentationHUD.tsx`
- Add a ground-view toggle so presenters can dive into terrain during classroom mode

### No backend changes needed

This is purely a Mapbox client-side feature using their existing terrain and sky APIs, which are included in the current access token tier.

