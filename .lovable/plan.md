

## Add Marker Clustering for Location Pins

### Approach

Use Mapbox GL's **native GeoJSON source clustering** instead of HTML markers for location pins. This is the most performant approach — Mapbox handles clustering on the GPU via WebWorkers, no extra library needed.

The current `usePinMarkers` hook creates individual HTML `mapboxgl.Marker` elements. We'll replace it with a GeoJSON source + circle/symbol layers for clusters, and keep individual HTML markers only for unclustered points (to preserve the existing custom marker styling and popup interactions).

### How It Works

1. Add a GeoJSON source with `cluster: true` containing all location pin coordinates
2. Render **cluster circles** as a Mapbox layer (styled to match the ancient theme)
3. Render **cluster count labels** as a symbol layer
4. For **unclustered points**, continue using HTML markers (preserving existing popup, selection, hide/show behavior)
5. On cluster click, zoom into the cluster to expand it
6. Re-compute which pins are unclustered on every map move/zoom

### Changes

**`src/hooks/usePinMarkers.ts`** — Major refactor:
- Add a `pin-clusters` GeoJSON source with `cluster: true, clusterMaxZoom: 14, clusterRadius: 50`
- Add `clusters` circle layer (dark brown fill matching theme, sized by point_count)
- Add `cluster-count` symbol layer showing the number
- Track unclustered point IDs by querying the source on `moveend`/`sourcedata` and only create HTML markers for those
- On cluster click, call `map.getSource(...).getClusterExpansionZoom()` and fly to it
- Keep all existing popup, selection, hidden-pin, and label logic for unclustered markers

**`src/index.css`** — Add cursor style for cluster layer:
```css
.mapboxgl-canvas-container.mapboxgl-interactive { cursor: grab; }
```

**`src/components/Map/MapCanvas.tsx`** — No changes needed; it already passes pins to `usePinMarkers`.

### Cluster Visual Style
- Circle fill: `#2a1e0e` (matching pin background) with border `#8a6040`
- Sizes: small (< 10 pins) 30px, medium (< 50) 40px, large 50px
- Count text: `#e8d5a0` (matching popup theme)

### Interaction
- Click cluster → zoom to expand
- Clusters auto-dissolve as user zooms in
- Individual pins appear and behave exactly as before once unclustered

