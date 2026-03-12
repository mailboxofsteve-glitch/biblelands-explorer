

## Add Mileage Indicators Along Routes

Place small, understated distance markers at regular intervals along LineString routes — showing cumulative miles from the start.

### Approach

Inside `addLineEnhancements` in `src/hooks/useOverlayLayers.ts`:

1. **Extract all coordinates** from LineString/MultiLineString features in the GeoJSON.
2. **Walk the coordinates** using the Haversine formula to compute cumulative distance. Every ~25 miles (configurable), record a Point feature with a `label` property like `"25 mi"`, `"50 mi"`, etc.
3. **Create a new GeoJSON source** (`${src}-mileage`) containing these Point features.
4. **Add a symbol layer** (`${src}-mileage-labels`) that renders the labels in a small, semi-transparent style — e.g., 10px font, muted tan/cream color with a dark halo, matching the map's ancient aesthetic. No icon, just text.

### Cleanup

Update `removeOverlay` to also remove the `-mileage-labels` layer and `-mileage` source.

### Style

- Font size: 10px
- Color: `#d4c5a0` (muted parchment tone) with `#1a1208` halo
- Opacity: ~0.7
- `text-allow-overlap: false` so markers hide at low zoom to avoid clutter

### Files modified

- **`src/hooks/useOverlayLayers.ts`** — add mileage point generation in `addLineEnhancements`, add cleanup in `removeOverlay`

No new dependencies needed — Haversine is a few lines of math.

