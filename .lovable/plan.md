

## Problem

All location pins render at `[0, 0]` (Atlantic Ocean, west of Africa) instead of their actual coordinates. This happens because:

1. The `coordinates` column in `locations` is a PostGIS `geography` type
2. The Supabase JS client returns this as a raw WKB hex string (e.g. `0101000020E6100000...`)
3. The parsing code in `usePins.ts` only handles two formats — GeoJSON objects and `POINT(lng lat)` WKT strings — neither matches
4. The fallback is `[0, 0]`, placing every pin in the Atlantic Ocean

## Fix

**File: `src/hooks/usePins.ts`** — Change the query to use PostGIS `ST_X()` and `ST_Y()` to extract longitude and latitude as plain numbers, bypassing WKB parsing entirely.

Replace the current select with:
```sql
id, name_ancient, name_modern, name_hebrew,
ST_X(coordinates::geometry) as lng,
ST_Y(coordinates::geometry) as lat,
location_type, era_tags, primary_verse, description
```

Since `.select()` doesn't support PostGIS functions, switch to an **RPC call** or use a **database view**.

**Approach: Create a database view** (`locations_with_coords`) that exposes `lng` and `lat` as plain numeric columns, then query that view instead.

### Step 1 — Migration: Create view

```sql
CREATE OR REPLACE VIEW public.locations_with_coords AS
SELECT
  id, name_ancient, name_modern, name_hebrew,
  ST_X(coordinates::geometry) AS lng,
  ST_Y(coordinates::geometry) AS lat,
  location_type, era_tags, primary_verse, description
FROM public.locations;
```

### Step 2 — Update `src/hooks/usePins.ts`

- Query `locations_with_coords` instead of `locations`
- Remove the complex coordinate parsing logic
- Build coordinates as `[row.lng, row.lat]`

```ts
const { data, error } = await supabase
  .from("locations_with_coords")
  .select("id, name_ancient, name_modern, name_hebrew, lng, lat, location_type, era_tags, primary_verse, description")
  .contains("era_tags", [currentEra]);

// Simple mapping:
const parsed = (data ?? []).map((loc) => ({
  ...loc,
  coordinates: [loc.lng, loc.lat] as [number, number],
}));
```

This is a minimal, targeted fix — one migration and one hook file edit.

