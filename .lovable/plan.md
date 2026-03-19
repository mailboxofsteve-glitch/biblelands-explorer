

## Fix: Textbox Fill Opacity Making Entire Element Dim

### Root Cause
In `useTextboxMarkers.ts` line 95, `wrapper.style.opacity = String(tb.fill_opacity)` applies CSS `opacity` to the **entire element** — background, text, delete button, everything. Even at 100%, any value below 1.0 dims all content. The user's intent is for opacity to affect only the **background fill**, not the text.

### Fix
**`src/hooks/useTextboxMarkers.ts`** — Replace the two lines setting `backgroundColor` and `opacity` separately with a single RGBA background. Parse the hex `fill_color` into RGB components and combine with `fill_opacity` as the alpha channel. Remove `wrapper.style.opacity`.

**`src/components/Map/TextboxModal.tsx`** — Same fix in the preview div: use RGBA background instead of separate `opacity` style, so the preview accurately reflects how the textbox will look on the map.

### Helper
Add a small inline hex-to-rgba conversion:
```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
```

### Changes
- **`src/hooks/useTextboxMarkers.ts`**: Add `hexToRgba` helper, replace lines 94-95 with `wrapper.style.backgroundColor = hexToRgba(tb.fill_color, tb.fill_opacity)` and remove the `opacity` line.
- **`src/components/Map/TextboxModal.tsx`**: Same approach in the preview `<div>` — use `backgroundColor: hexToRgba(...)` and remove the `opacity` style prop.

