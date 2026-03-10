

## Add ability to delete individual custom pins and overlays

Currently the only way to remove custom content is the "Clear Custom" button which deletes everything at once. We need per-item delete controls.

### Changes

**1. Custom Pins — Add delete button to popup (`src/hooks/useCustomPinMarkers.ts`)**

In `createPopupHTML`, add a "Delete" button next to the close button in the popup header. Wire it up in the click handler (alongside the existing close button listener) to:
- Call `supabase.from("pins").delete().eq("id", pin.id)`
- Call `removeCustomPin(pin.id)` from the map store
- Remove the popup and marker
- Show a toast confirmation

**2. Custom Overlays — Add delete button in OverlayToggles (`src/components/Map/OverlayToggles.tsx`)**

For overlays that are user-created (i.e., `!overlay.is_preloaded`), show a small trash icon button on hover next to each overlay toggle. Clicking it:
- Calls `supabase.from("overlays").delete().eq("id", overlay.id)`
- Calls `removeCustomOverlay(overlay.id)` from the map store
- Shows a toast confirmation

**3. Custom Pins list in TeacherTools (`src/components/Map/TeacherTools.tsx`)**

Add a "Custom Content" section between the existing tool sections showing a list of custom pins and overlays with individual delete buttons. This gives a clear inventory of what's been added, each with a trash icon to delete individually.

### Files to modify
- `src/hooks/useCustomPinMarkers.ts` — add delete button to popup HTML + wire handler
- `src/components/Map/OverlayToggles.tsx` — add per-item delete for non-preloaded overlays
- `src/components/Map/TeacherTools.tsx` — add custom content list with delete buttons

