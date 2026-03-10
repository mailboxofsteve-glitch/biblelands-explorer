

## Fix: "Clip to Coastline" Button Not Appearing for Existing Overlays

### Problem

The "Clip to Coastline" button only appears after drawing 3+ points on the map. When editing an existing overlay like Neo-Babylonia, the `AdminMapPicker` receives no `initialCoordinates`, so it starts empty — the admin would have to redraw the entire polygon from scratch just to access the clip button.

### Fix

**In `src/pages/Admin.tsx` (OverlaysTab):**

1. **Parse existing GeoJSON into coordinates** when opening the draw map. Extract coordinates from the overlay's GeoJSON `FeatureCollection` (Polygon or LineString geometry) and pass them as `initialCoordinates` to `AdminMapPicker`.

2. **Pass `initialCoordinates` prop** to the `AdminMapPicker` in the overlay edit form:
   ```
   <AdminMapPicker
     mode={drawPickerMode}
     initialCoordinates={parsedCoordsFromGeoJSON}
     onCoordinatesChange={handleDrawCoordinatesChange}
   />
   ```

3. **Add a parsing helper** that reads the form's GeoJSON string, finds the first Polygon/LineString feature, and extracts its coordinate ring (removing the closing duplicate for polygons).

This way, when an admin clicks "Draw on Map" for Neo-Babylonia, the existing polygon loads into the picker with all its points visible, and the "Clip to Coastline" button appears immediately (since it already has 3+ points).

### Files to modify
- `src/pages/Admin.tsx` — parse GeoJSON into coordinates, pass as `initialCoordinates`

