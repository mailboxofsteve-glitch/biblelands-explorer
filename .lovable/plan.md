

## Problem: Era tag mismatch between Admin and Map

The admin panel stores era tags using **display labels** (e.g., `"Patriarchs"`, `"United Kingdom"`) but the map filters locations using **lowercase IDs** (e.g., `"patriarchs"`, `"united_kingdom"`). They never match, so admin-added locations never appear on the map.

**Admin panel** (`src/pages/Admin.tsx` line 19):
```
const ERAS = ["Patriarchs", "Exodus", "Conquest", "United Kingdom", ...]
```

**Map store** (`src/store/mapStore.ts` line 5-14):
```
ERAS = [{ id: "patriarchs", label: "Patriarchs" }, { id: "united_kingdom", label: "United Kingdom" }, ...]
```

**Map query** (`src/hooks/usePins.ts`):
```
.contains("era_tags", [currentEra])  // currentEra = "patriarchs"
```

The stored tag is `"Patriarchs"` but the query looks for `"patriarchs"` — no match.

### Fix

**1. Update Admin to use era IDs instead of labels (`src/pages/Admin.tsx`)**

- Import `ERAS` from `@/store/mapStore` instead of defining a local array of labels
- Use `ERAS` (with `id` and `label`) for the era tag toggles — store `era.id` values but display `era.label`
- Remove the local `ERAS` constant (keep `LOCATION_TYPES` and `OVERLAY_CATEGORIES`)

**2. Fix the hardcoded lat/lng in `openEdit` (`src/pages/Admin.tsx`)**

When editing an existing location, the lat/lng fields always reset to `32.0`/`35.5` instead of showing the location's actual coordinates. Since coordinates come from PostGIS as WKB hex, we should fetch from the `locations_with_coords` view to get the actual lat/lng for display in the edit form, or parse them from the existing data if available.

### Existing data

Any locations already saved with label-style era tags (e.g., `"Patriarchs"`) will need to be updated to use the ID format (e.g., `"patriarchs"`). A one-time data migration will fix existing records.

### Files to modify
- `src/pages/Admin.tsx` — use era IDs from mapStore, fix edit coordinate loading

