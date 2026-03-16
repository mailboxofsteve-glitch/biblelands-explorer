

## Add KML Export from Admin Tables

Add a "Download KML" button to both the **Locations** and **Overlays** tabs that exports the currently filtered/sorted data as a `.kml` file.

### New file: `src/lib/kmlExport.ts`

A utility with two functions:

- **`locationsToKml(locations)`** — converts location rows to KML with `<Placemark>` entries containing `<Point>` geometry, name, description, verse, era tags, year range, and type as structured `<ExtendedData>`.
- **`overlaysToKml(overlays)`** — converts overlay rows to KML with `<Placemark>` entries containing `<Polygon>` or `<LineString>` geometry extracted from their GeoJSON, plus name, era, category, color, and year range.

Both return a KML XML string. A shared `downloadKml(xmlString, filename)` helper triggers the browser download.

### Changes to `src/pages/Admin.tsx`

**LocationsTab** (near the "Add Location" button):
- Add a `Download KML` button that calls `locationsToKml(sorted)` and triggers download. Uses the `sorted` array (already filtered+sorted), so export respects current filters.

**OverlaysTab** (near the "Add Overlay" button):
- Add a `Download KML` button that calls `overlaysToKml(sorted)` and triggers download.

### KML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Locations Export</name>
    <!-- Per location: -->
    <Folder>
      <name>Jerusalem</name>
      <description>Genesis 14:18</description>
      <Placemark>
        <name>Jerusalem / Al-Quds</name>
        <styleUrl>#landpoint</styleUrl>
        <Point><coordinates>35.23,31.78,0</coordinates></Point>
      </Placemark>
    </Folder>
  </Document>
</kml>
```

For overlays, GeoJSON polygons become `<Polygon><outerBoundaryIs><LinearRing><coordinates>` and LineStrings become `<LineString><coordinates>`.

### Files

| File | Change |
|------|--------|
| `src/lib/kmlExport.ts` | New — KML generation + download utility |
| `src/pages/Admin.tsx` | Add Download KML button to LocationsTab and OverlaysTab |

