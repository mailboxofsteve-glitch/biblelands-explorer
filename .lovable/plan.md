

## KML Bulk Import for Admin Locations

### Overview
Add a KML file upload feature to the Admin panel that parses the file client-side, presents a preview table of extracted locations, and lets the admin selectively import them into the `locations` table.

### Step 1 — KML Parser Utility
Create `src/lib/kmlParser.ts` that:
- Accepts a KML file string, parses it with `DOMParser`
- Extracts each `<Folder>` as a location group
- For each Folder, extracts the **first `<Placemark>` with a `<Point>`** as the primary candidate
- Maps `styleUrl` to `location_type`: `#landpoint` → `city`, `#waterpoint`/`#water` → `river`/`sea`, `#region` → `region`, `#waterrepresentativepoint` → `sea`
- Parses `Folder > description` to extract scripture references (strip HTML tags, extract "Gen 50:11" style refs)
- Splits Placemark `name` on " / " to get `name_ancient` (from Folder name) and `name_modern` (the part after "/")
- Returns an array of parsed location objects ready for preview

### Step 2 — Import Preview UI
Add a new section/tab in the Admin page:
- File input accepting `.kml` files
- On upload, run the parser and display results in a table showing: name_ancient, name_modern, coordinates, location_type, primary_verse
- Checkboxes to select/deselect individual locations
- "Select All" / "Deselect All" controls
- A default `era_tags` selector (since KML doesn't include era info)
- Highlight rows where `name_ancient` already exists in the database (duplicate detection via a pre-fetch of existing location names)

### Step 3 — Batch Insert
- On "Import Selected", insert chosen locations into the `locations` table via Supabase
- Use the existing PostGIS `ST_MakePoint(lng, lat)::geography` pattern for the coordinates column
- Show a progress indicator and summary toast (e.g., "Imported 42 of 50 locations, 8 skipped as duplicates")
- Skip LineString/Polygon placemarks (only import Point types) — these could be handled as overlays in a future step

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/kmlParser.ts` | New — KML parsing utility |
| `src/pages/Admin.tsx` | Add KML import tab/section with file upload, preview table, and import button |

### What This Does NOT Handle (Future Steps)
- **LineString/Polygon geometries** — could be imported as overlays later
- **Multiple candidate sites** — only imports the first Point placemark per Folder
- **Hebrew names** — not present in KML data
- **Era assignment** — admin picks a default era for the batch

### Technical Notes
- No new dependencies needed — `DOMParser` is built into browsers
- No database schema changes needed — uses existing `locations` table
- Coordinates insert will use a raw SQL call via `.rpc()` or a database function to handle `ST_MakePoint`, since the Supabase JS client can't directly insert PostGIS geography values
- Admin-only feature, protected by existing RLS policies

