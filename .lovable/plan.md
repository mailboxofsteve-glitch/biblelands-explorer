

## Solutions for Coastline-Accurate Polygon Drawing

The core problem: when drawing territory polygons by hand, getting borders to follow irregular coastlines precisely is tedious and impractical.

### Recommended Approach: Snap-to-Water Clipping with Turf.js

Use a **land boundary polygon** dataset and automatically clip admin-drawn polygons against it. The admin draws a rough shape that extends slightly past coastlines, and the system trims it to fit the land.

**How it works:**
1. Install `@turf/intersect` and `@turf/helpers` (lightweight, client-side)
2. Bundle a simplified land/coastline polygon GeoJSON for the Bible Lands region (Mediterranean to Persian Gulf) — roughly 50-100KB
3. When the admin finishes drawing a polygon, run `turf.intersect(drawnPolygon, landPolygon)` to clip it to the coastline
4. The result follows the natural coastline perfectly without manual precision

**Workflow for admin:**
- Draw a rough polygon that overshoots coastlines generously
- Click "Clip to Coastline" button (or auto-clip on save)
- The polygon snaps to the actual shoreline
- Preview the clipped result before saving

### Implementation

**1. Add coastline data: `src/data/land-boundary.json`**
- A simplified GeoJSON polygon covering the landmass from Egypt to Mesopotamia
- Source: Natural Earth 110m or 50m land polygons, cropped to the relevant region
- One-time extraction, stored as a static asset (~50-100KB)

**2. Install Turf.js clipping module**
- Add `@turf/intersect` and `@turf/helpers` packages

**3. Update `AdminMapPicker.tsx`**
- Add a "Clip to Coastline" button (visible in polygon mode when ≥3 points)
- On click: load the land boundary, run `turf.intersect()`, replace the drawn coordinates with the clipped result
- Show the clipped polygon preview on the map immediately
- If the polygon doesn't intersect land at all, show a warning

**4. Update overlay save flow in `Admin.tsx`**
- Optionally auto-clip before saving, or let admin choose
- The generated GeoJSON in the textarea reflects the clipped shape

### Alternative approaches considered
- **PostGIS server-side clipping**: More accurate with ST_Intersection but adds a round-trip; could be a future enhancement
- **Mapbox queryRenderedFeatures for water**: Unreliable, depends on zoom level and loaded tiles
- **Higher point density**: Still manual and tedious — doesn't solve the fundamental problem

### Files to create/modify
- **Install**: `@turf/intersect`, `@turf/helpers`
- **Create**: `src/data/land-boundary.json` — cropped Natural Earth land polygon
- **Modify**: `src/components/Admin/AdminMapPicker.tsx` — add clip-to-coastline button + logic

