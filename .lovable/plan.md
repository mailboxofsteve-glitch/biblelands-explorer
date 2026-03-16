

## Add Multi-Select & Bulk Delete to Admin Tables

Add row checkboxes and a "Select All" header checkbox to each admin table, with a bulk delete action bar that appears when rows are selected.

### Scope

Apply to **three tabs** that have deletable rows:
- **LocationsTab** — delete from `locations` table
- **OverlaysTab** — delete from `overlays` table  
- **UsersTab** — delete from `user_roles` or skip (users aren't typically deleted)

Lessons tab only toggles `is_featured`, so bulk delete doesn't apply there. Users tab has "Make Admin" but no delete — we can add bulk selection there too for potential future actions, or skip it. I'll add it to **Locations** and **Overlays** which both have delete handlers.

### Pattern (same for each tab)

1. **State**: Add `selectedIds: Set<string>` state
2. **Header checkbox**: In the first `<TableHead>`, add a `<Checkbox>` that toggles all visible/sorted rows
3. **Row checkbox**: In each `<TableRow>`, add a `<TableCell>` with a `<Checkbox>` bound to `selectedIds`
4. **Bulk delete bar**: When `selectedIds.size > 0`, show a bar above the table with count + "Delete Selected" button
5. **Bulk delete handler**: Loop through selected IDs, delete from the appropriate table, then refresh and clear selection
6. **Clear on filter change**: Reset selection when filter text changes

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Add selection state, checkboxes, and bulk delete to LocationsTab and OverlaysTab |

### UI Detail
- Checkbox column as the first column in each table
- When items are selected, a subtle bar appears between the filter input and the table: `"X selected — [Delete Selected]"`
- Delete Selected button uses destructive variant with confirmation via the existing AlertDialog pattern
- Select All checkbox shows indeterminate state when only some rows are selected

