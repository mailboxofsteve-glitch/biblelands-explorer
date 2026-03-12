

## Enhanced Admin Overlay Map Editor

### Current Limitations
1. **No existing data on map**: When editing, the map starts blank — existing GeoJSON coordinates aren't loaded onto the map picker
2. **No point dragging**: Points can only be added, not repositioned
3. **Single shape only**: The picker manages one flat `coords[]` array, so you can't draw separate shapes (e.g., mainland Persia + Cyprus)

### Plan

#### 1. Multi-shape data model in `AdminMapPicker`
Replace the single `coords: number[][]` with `shapes: number[][][]` (array of shapes, each being an array of points). Add an `activeShapeIndex` to track which shape the user is currently drawing/editing.

UI additions:
- **"New Shape"** button — finalizes the current shape and starts a new empty one
- **Shape indicator** — shows "Shape 2 of 3" with prev/next to select which shape to edit
- **Delete Shape** button — removes the active shape

#### 2. Load existing GeoJSON onto the map when editing
In `OverlaysTab.openEdit()`, extract coordinates from the overlay's existing GeoJSON and pass them as `initialCoordinates` (now `initialShapes: number[][][]`) to `AdminMapPicker`. Parse logic:
- `Polygon` → one shape from `coordinates[0]` (strip closing point)
- `LineString` → one shape from `coordinates`
- `FeatureCollection` → one shape per feature

#### 3. Draggable points
Add Mapbox mouse interaction on the `draw-points` layer:
- `mousedown` on a circle → set `draggingIndex` + capture the shape/point indices
- `mousemove` → update that point's coordinates in real-time, re-render source
- `mouseup` → finalize, notify parent

Change cursor to `grab`/`grabbing` when hovering/dragging points.

#### 4. Updated GeoJSON output
`handleDrawCoordinatesChange` in `OverlaysTab` receives `number[][][]` (all shapes) and builds a proper `FeatureCollection`:
- Each shape becomes its own Feature (Polygon or LineString depending on category)
- This naturally supports multi-polygon overlays like "Persian Empire + Cyprus"

#### 5. Updated `buildGeoJSON` helper
Rewrite to accept `shapes: number[][][]` and produce a FeatureCollection with:
- One line/polygon feature per shape
- Point features for the **active shape only** (so you see which points you're editing)

### Files to modify
- **`src/components/Admin/AdminMapPicker.tsx`** — Multi-shape state, drag-to-move points, load initial shapes, new shape/delete shape buttons
- **`src/pages/Admin.tsx`** (OverlaysTab) — Extract shapes from existing GeoJSON on edit, update `onCoordinatesChange` callback to handle `number[][][]`, build multi-feature GeoJSON output

### UI Controls (bottom toolbar)
```text
[ Undo ] [ Clear Shape ] [ Delete Shape ] [ New Shape ] [ Clip to Coastline ]
                    ┌─────────────────────┐
                    │  Shape 2 of 3  ◀ ▶  │
                    └─────────────────────┘
```

