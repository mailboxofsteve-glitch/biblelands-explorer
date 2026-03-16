

## Phase 1: Database Schema + Admin Form Updates

This phase adds year-range columns and parent-location association to the database, then updates all admin forms (Locations, Overlays, KML Import) to support these new fields.

### 1. Database Migration

Add columns to `locations` and `overlays` tables:

**`locations` table:**
- `year_start INTEGER NULL` — start year (negative = BC, positive = AD)
- `year_end INTEGER NULL` — end year
- `parent_location_id UUID NULL REFERENCES locations(id) ON DELETE SET NULL` — for battle/people/event/poi types to associate with a city/region/etc.

**`overlays` table:**
- `year_start INTEGER NULL`
- `year_end INTEGER NULL`

Update the `locations_with_coords` view to include the new columns (`year_start`, `year_end`, `parent_location_id`).

### 2. Admin Location Form Updates (`src/pages/Admin.tsx` — LocationsTab)

- Add `year_start` and `year_end` to form state, rendered as two number inputs with a helper label: "e.g. -701 = 701 BC, 30 = 30 AD"
- Add a display formatter that shows "-701" as "701 BC" in the table
- When `location_type` is `battle`, `people`, `event`, or `poi`, show a **"Associated With"** dropdown populated with all locations of type: city, region, mountain, river, sea, desert, road. Fetch these once on component mount. The field is optional (can be left blank)
- Add `year_start`, `year_end`, `parent_location_id` to the save payload

### 3. Admin Overlay Form Updates (`src/pages/Admin.tsx` — OverlaysTab)

- Add `year_start` and `year_end` number inputs to the overlay create/edit form
- Include in save payload

### 4. KML Import Updates (`src/pages/Admin.tsx` — ImportTab)

For each parsed KML entry (both locations and overlays), add per-row editable fields:
- **Era** dropdown (override default era per entry)
- **Year Start** / **Year End** number inputs
- **Category** dropdown (for overlays)
- **Associated With** dropdown (for locations with type battle/people/event/poi)

This means the import table rows become editable rather than read-only.

### 5. Table Display Updates

- Add "Year Range" column to Locations and Overlays tables, displaying formatted values (e.g. "701 BC – 586 BC")
- Add "Associated With" column to Locations table showing the parent location name

### Files Modified

| File | Change |
|------|--------|
| Database migration | Add `year_start`, `year_end` to `locations` + `overlays`; add `parent_location_id` to `locations`; update `locations_with_coords` view |
| `src/pages/Admin.tsx` | Update LocationsTab, OverlaysTab, and ImportTab forms with new fields |
| `src/hooks/usePins.ts` | Include `year_start`, `year_end`, `parent_location_id` in select + interface |
| `src/hooks/useOverlays.ts` | Include `year_start`, `year_end` in select + interface |

### Helper: Year Display Format

```typescript
function formatYear(y: number | null): string {
  if (y == null) return "";
  return y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;
}
function formatYearRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return "—";
  return `${formatYear(start)} – ${formatYear(end)}`;
}
```

