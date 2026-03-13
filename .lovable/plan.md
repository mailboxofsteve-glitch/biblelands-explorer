

## Three Changes: Multi-Shape Animation, Admin Map Labels, and Sortable/Filterable Admin Tables

### 1. Treat Multi-Shape Overlays as Separate Routes in Animation

**Problem**: `extractCoordinates` in `animateRoute.ts` concatenates all LineString features into one coordinate array, so a multi-shape overlay (e.g., Paul's 1st and 2nd journeys in one overlay) animates as one continuous line jumping between disconnected segments.

**Fix in `src/components/Map/TeacherTools.tsx`** (handleAnimateRoutes):
- When building the `routes` array, expand each overlay's FeatureCollection into **one route entry per LineString feature** instead of passing the whole FeatureCollection as a single route.
- Each feature gets its own animation with its own start/end markers.

**Fix in `src/hooks/useOverlayLayers.ts`** (extractLineEndpoints + addLineEnhancements):
- Generate start/end markers **per feature** rather than across the entire FeatureCollection. Create one endpoint source with pairs of points for each LineString.

### 2. Show Location Labels in AdminMapPicker Draw Mode

**Problem**: The AdminMapPicker uses a plain `mapbox-outdoors-v12` style with no application data — admins can't see existing locations or overlays while drawing.

**Fix in `src/components/Admin/AdminMapPicker.tsx`**:
- After `map.on("load")`, fetch locations from the database (`supabase.from("locations_with_coords").select(...)`) and add them as a GeoJSON source + symbol layer showing `name_ancient` labels with small circle markers.
- Optionally fetch preloaded overlays and render their LineString/Polygon geometries as a faint reference layer with name labels.
- Use subtle, non-intrusive styling (small text, low opacity) so these reference layers don't interfere with drawing.

### 3. Sortable and Filterable Admin Tables

**Problem**: The admin tables for Locations, Overlays, Lessons, and Users have no sorting or filtering — difficult to manage at scale.

**Fix — add local state for sort + filter to each tab**:

For each admin tab (Locations, Overlays, Lessons, Users):
- Add `sortField` / `sortDirection` state and a `filterText` state.
- Make table headers clickable to toggle sort (ascending/descending), with a small arrow indicator.
- Add a search/filter `Input` above the table that filters rows client-side by matching against key text fields (e.g., name, email).
- Extract a small reusable `SortableTableHead` component to avoid repetition.

**Files to modify**:
- `src/pages/Admin.tsx` — add sort/filter state and logic to `LocationsTab`, `OverlaysTab`, `LessonsTab`, `UsersTab`; add filter input above each table; make `TableHead` cells clickable with sort indicators.

### Files Summary

| File | Change |
|------|--------|
| `src/components/Map/TeacherTools.tsx` | Expand multi-feature overlays into separate route entries for animation |
| `src/hooks/useOverlayLayers.ts` | Per-feature start/end markers instead of per-overlay |
| `src/components/Admin/AdminMapPicker.tsx` | Fetch and display location labels + overlay references on load |
| `src/pages/Admin.tsx` | Add sortable headers and text filter to all four admin tables |

