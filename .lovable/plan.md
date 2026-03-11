

## Fix Mixed-Geometry Overlays and Smooth Route Animation

Two issues to fix for `babylonian-exile-route` and similar overlays:

### Problem 1: Mixed geometry types ignored
`addOverlay` uses `getGeometryType` which only checks the **first feature** in a FeatureCollection. If the first feature is a LineString, all Point features are silently skipped. The babylonian-exile-route has 1 LineString + 9 Points, so only the line renders.

**Fix:** Replace the single-geometry-type approach in `addOverlay` with a per-feature loop. For each feature in a FeatureCollection, detect its geometry type individually and add the appropriate layer (line, fill, circle). Use feature indices in layer IDs to avoid collisions (e.g. `overlay-slug-line-0`, `overlay-slug-circle-1`).

Update `removeOverlay` to also clean up these indexed layers.

Update `syncLabelLayers` / `getGeometryType` to handle mixed geometry (detect the "primary" type for label placement — prefer line if any line features exist).

### Problem 2: Sparse coordinates cause choppy animation
The route has only 9 coordinates spanning ~1500km. The animation jumps between waypoints in straight lines.

**Fix:** In `animateRoute`, after extracting coordinates, densify the path by interpolating additional points along each segment. Use simple linear interpolation — insert points every ~0.1 degrees (roughly 10km) between sparse waypoints. This is a pure math operation, no extra library needed. Target ~100-200 total points for a smooth animation.

### Files to modify
- **`src/hooks/useOverlayLayers.ts`** — Rewrite `addOverlay` to iterate features individually, update `removeOverlay` for indexed layer cleanup, adjust label logic
- **`src/lib/animateRoute.ts`** — Add `densifyCoordinates` function after `extractCoordinates`, interpolating points between sparse waypoints

