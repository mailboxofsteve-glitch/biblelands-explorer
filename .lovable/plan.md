

## Per-Column Filtering on Admin Tables

Replace the single search bar on each admin tab with individual filter inputs in each table column header, allowing precise filtering by any column.

### Approach

Add a second `<TableRow>` inside each `<TableHeader>` containing filter controls per column. The filter state will be an object keyed by column name. The existing `filteredData` memo will be replaced with multi-column filtering logic.

**Filter control types by column:**
- **Text columns** (names, verse, email, etc.): Small `<Input>` with placeholder
- **Enum columns** (Type, Era, Category): `<Select>` dropdown with "All" option
- **Boolean columns** (Featured): `<Select>` with All/Yes/No
- **Non-filterable columns** (Color swatch, action buttons, checkbox): Empty cell

### Per-Tab Columns

**Locations**: Ancient Name (text), Modern Name (text), Type (select from `LOCATION_TYPES`), Eras (text — matches any era tag), Year Range (skip — complex), Associated With (text), Verse (text)

**Overlays**: Name (text), Era (select from `ERAS`), Category (select from `OVERLAY_CATEGORIES`), Year Range (skip), Color (skip)

**Lessons**: Title (text), Era (select from `ERAS`), Scenes (skip), Updated (skip), Featured (select: All/Yes/No)

**Users**: Email (text), Display Name (text), Lessons (skip), Joined (skip)

### Implementation

1. Each tab replaces its `filterText` state with a `columnFilters: Record<string, string>` state
2. Remove the `<Search>` input bar
3. Add a filter row in `<TableHeader>` with appropriately sized inputs (`h-7 text-xs`)
4. Update `filteredData` memo to check every active filter against the corresponding column value
5. KML export and bulk selection continue to operate on the filtered+sorted `sorted` array

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Replace single filter with per-column filter inputs on all four tabs (Locations, Overlays, Lessons, Users) |

