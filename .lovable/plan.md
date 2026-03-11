

## Fix Admin Map Picker Preview Visibility

### Problem
The `AdminMapPicker` already has code to render lines, polygons, and point markers as you click — but the colors use `hsl(var(--primary))`, which is a CSS custom property. **Mapbox GL paint properties don't support CSS variables**, so all drawn features are invisible. That's why you can't see where you've clicked.

### Fix

**`src/components/Admin/AdminMapPicker.tsx`** — Replace all `hsl(var(--primary))` references in Mapbox paint properties with a concrete color value. Additionally, accept the parent's chosen overlay color so the preview matches the final result.

1. Add an optional `color` prop (default `#6366f1` — a visible indigo).
2. Replace all `"hsl(var(--primary))"` in `paint` objects with the resolved color prop:
   - `draw-fill`: `fill-color`
   - `draw-line`: `line-color`
   - `draw-points`: `circle-color`
3. When color changes, update the paint properties on existing layers dynamically so the preview stays in sync with the color picker.

**`src/pages/Admin.tsx`** (OverlaysTab) — Pass `form.default_color` to `AdminMapPicker` so the drawn preview uses the overlay's chosen color:
```tsx
<AdminMapPicker
  mode={drawPickerMode}
  color={form.default_color}
  onCoordinatesChange={handleDrawCoordinatesChange}
/>
```

Two files, straightforward color prop threading.

