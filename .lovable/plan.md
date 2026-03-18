

## Fix: Overlay Color Not Updating

### Root Cause
When editing an overlay in the admin panel, `handleSave` (Admin.tsx line 585-596) updates `default_color` but does **not** update `default_style`. The rendering engine (`useOverlayLayers.ts`) checks `default_style["fill-color"]`, `default_style["line-color"]`, etc. first, falling back to `default_color` only if those are absent. So stale style colors override the new `default_color`.

### Fix
In the `handleSave` function of `OverlaysTab` (Admin.tsx ~line 585), when building the payload, update color-related keys inside `default_style` to match the new `default_color`. Specifically:

1. Parse the existing `default_style` from the editing overlay (or use `{}` for new overlays)
2. Update `line-color`, `fill-color`, and `circle-color` in the style object to match `form.default_color`
3. Include the updated `default_style` in the save payload

### Changes

**`src/pages/Admin.tsx`** — In `handleSave` (~line 585), add:
```typescript
const existingStyle = editing?.default_style ?? {};
const updatedStyle = {
  ...existingStyle,
  "line-color": form.default_color,
  "fill-color": form.default_color,
  "circle-color": form.default_color,
};
```
Then add `default_style: updatedStyle` to the payload object.

Single file, ~5 lines added.

