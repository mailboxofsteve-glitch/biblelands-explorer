

## Add Map-Based Admin Tools for Locations, Overlays & Lessons

Currently admins manage locations and overlays through form-only interfaces — typing coordinates manually and pasting raw GeoJSON. This plan adds an interactive Mapbox map to the admin panel so admins can click to place locations, draw routes/territories visually, and create lessons directly.

### Architecture

Create a new reusable `AdminMapPicker` component that embeds a Mapbox map within admin modals/panels. It will support three interaction modes:

1. **Point picker** — for Locations (click to set lat/lng)
2. **Line drawing** — for route overlays (click waypoints, double-click to finish)
3. **Polygon drawing** — for territory/region overlays (click vertices, double-click to close)

### Changes

**1. New component: `src/components/Admin/AdminMapPicker.tsx`**

A self-contained Mapbox map component that accepts a `mode` prop (`"point"`, `"line"`, or `"polygon"`) and callbacks:
- **Point mode**: Renders a draggable marker. Clicking the map moves the marker and fires `onPointChange([lng, lat])`. Initializes at the provided coordinates or a default center.
- **Line mode**: Each click adds a waypoint (rendered as circles with a connecting line preview). Double-click finishes. Fires `onLineChange(coordinates[][])`. Includes an undo button.
- **Polygon mode**: Same as line but closes the shape on double-click. Fires `onPolygonChange(coordinates[][])`. Shows a filled preview.
- Uses the same `MAPBOX_TOKEN` and "ancient" base style from `MapCanvas`.
- Compact size (~300px height) suitable for embedding in dialogs.

**2. Update `LocationsTab` in `src/pages/Admin.tsx`**

- Import and embed `AdminMapPicker` in point mode inside the Add/Edit Location dialog, below the lat/lng inputs.
- Clicking the map updates the lat/lng form fields. Editing the lat/lng inputs re-centers the marker.
- Bidirectional sync between text inputs and map marker.

**3. Update `OverlaysTab` in `src/pages/Admin.tsx`**

- Add a "Draw on Map" toggle button in the Add/Edit Overlay dialog as an alternative to pasting GeoJSON.
- When active, show `AdminMapPicker` in line mode (for routes) or polygon mode (for territories/regions), based on the selected category.
- On finish, auto-generate the GeoJSON `FeatureCollection` and populate the GeoJSON textarea.
- Admin can still manually edit the generated GeoJSON if needed.

**4. Update `LessonsTab` in `src/pages/Admin.tsx`**

- Add "Create Lesson" button that opens a dialog with title, description, era fields.
- Include an `AdminMapPicker` in point mode to optionally set an initial map center for the lesson.
- Creates a new lesson record (as admin, using admin's user ID as `teacher_id`) with `is_public: true`.

### Files to create/modify
- **Create**: `src/components/Admin/AdminMapPicker.tsx`
- **Modify**: `src/pages/Admin.tsx` — integrate map picker into all three content tabs

