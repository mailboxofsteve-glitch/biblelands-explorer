

## Enhanced 3D Terrain with Always-On Terrain and Hillshade

### Current State
- The DEM source (`mapbox-dem`) is added on load, but **terrain is never enabled by default** -- it's only activated when entering Ground View (exaggeration 1.5) and removed on exit.
- No hillshade layer exists anywhere.

### Plan

**`src/components/Map/MapCanvas.tsx`** -- Enable 3D terrain and hillshade permanently on load:

1. In the `addTerrainSource` function, after adding the `mapbox-dem` source, also:
   - Call `map.setTerrain({ source: "mapbox-dem", exaggeration: 2.0 })` to enable 3D terrain by default with higher exaggeration (up from 1.5 in Ground View, making topography prominent even at overview zoom levels).
   - Add a `hillshade` layer using the same DEM source with shadow/highlight/accent colors tuned for an ancient map aesthetic -- this creates the shadow relief effect that highlights ridges, valleys, and elevation changes.

```typescript
// Inside addTerrainSource, after adding the source:
map.setTerrain({ source: "mapbox-dem", exaggeration: 2.0 });

if (!map.getLayer("hillshade-layer")) {
  map.addLayer({
    id: "hillshade-layer",
    type: "hillshade",
    source: "mapbox-dem",
    paint: {
      "hillshade-exaggeration": 0.6,
      "hillshade-shadow-color": "#473B2B",
      "hillshade-highlight-color": "#FDFCFA",
      "hillshade-accent-color": "#5a4a3a",
      "hillshade-illumination-direction": 315,
    },
  }, /* insert before first symbol layer for proper z-order */);
}
```

2. Also set `pitch: 35` as the default initial pitch (slight tilt to show terrain relief immediately).

**`src/components/Map/GroundViewButton.tsx`** -- Adjust to work with always-on terrain:

- `enterGroundView`: Instead of enabling terrain from scratch, just **increase exaggeration** to 3.0 for dramatic ground-level relief. Still add the sky/atmosphere layer.
- `exitGroundView`: Instead of `setTerrain(null)`, **restore exaggeration** back to 2.0 (the default). Remove the sky layer. This keeps terrain visible at all times.

### Files to modify

| File | Change |
|------|--------|
| `src/components/Map/MapCanvas.tsx` | Enable terrain + hillshade on load; set default pitch to 35 |
| `src/components/Map/GroundViewButton.tsx` | Toggle exaggeration (2.0 ↔ 3.0) instead of enabling/disabling terrain |

