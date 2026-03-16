

## KML Import: Separate Regions as Overlays

### Problem
The KML file contains entries with `styleUrl="#region"` that have `<Polygon>` geometry. Currently the parser only extracts the first `<Point>` placemark per folder, so regions either get imported as point locations or skipped entirely. Regions should be imported as **overlays** (with polygon GeoJSON), not as point locations.

### Approach
Enhance the KML parser to detect and extract polygon/region entries separately, then split the import UI into two sections: **Locations** (points) and **Overlays** (regions/polygons).

### Changes

**`src/lib/kmlParser.ts`** — Add a new interface and export for parsed overlays:
- Add `ParsedKmlOverlay` interface with fields: `name`, `slug`, `category` ("region"), `geojson` (GeoJSON FeatureCollection), `default_color`, `era` (to be set by admin)
- Modify `parseKml` to skip `#region` entries from the locations results
- Add new `parseKmlOverlays(kmlString)` function that:
  - Iterates folders and finds placemarks with `<Polygon>` geometry
  - Extracts polygon coordinates from `<coordinates>` tags, builds proper GeoJSON `Polygon` features
  - Also checks for `styleUrl="#region"` on placemarks as the identifier
  - Returns an array of `ParsedKmlOverlay` objects with `selected` flag

**`src/pages/Admin.tsx`** — Update `ImportTab` to handle both types:
- Call both `parseKml()` and `parseKmlOverlays()` on file upload
- Show two tables in the preview: "Locations" (existing table, unchanged) and "Overlays" (new table showing region name, polygon vertex count, category)
- The "Import" button imports both: locations via existing `bulk_insert_locations` RPC, overlays via direct `supabase.from("overlays").insert()` with the parsed GeoJSON, `is_preloaded: true`, `created_by: user.id`, and the selected era
- Add a visual badge/indicator distinguishing "Location" vs "Overlay" entries
- Overlay rows get a default color of `#c8a020` (matching the DB default)

### How Region Detection Works
In the KML structure, region folders typically contain placemarks with `<Polygon>` geometry and `styleUrl="#region"`. The parser will:
1. Look for placemarks with `<Polygon>` (not `<Point>`) geometry
2. Also check if the styleUrl maps to "region"
3. Extract the polygon coordinates and wrap them in a GeoJSON FeatureCollection

### Files Modified
| File | Change |
|------|--------|
| `src/lib/kmlParser.ts` | Add `ParsedKmlOverlay` interface + `parseKmlOverlays()` function; filter regions out of `parseKml()` |
| `src/pages/Admin.tsx` | Split import preview into Locations + Overlays sections; import overlays directly to `overlays` table |

