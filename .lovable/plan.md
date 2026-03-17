

## Two Textbox Overlay Enhancements

### 1. Draggable textbox position

Make textbox markers draggable when not presenting. Mapbox GL `Marker` supports a `draggable` option natively. On `dragend`, read the new lngLat and call `updateTextbox(id, { lng, lat })` — the auto-sync effect already persists changes.

**Changes in `src/hooks/useTextboxMarkers.ts`**:
- Set `draggable: true` on the Marker constructor when `!presenting`
- Listen to `dragend` event on each marker, call `updateTextbox` with new coordinates
- Import `updateTextbox` from the store

### 2. Per-textbox font size

Add a `font_size` field (number, default `1.0` as a multiplier like the label font size slider) to `SceneTextbox`. The modal gets a font size slider. The marker rendering scales heading/body font sizes by this multiplier.

**Changes**:

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `font_size: number` to `SceneTextbox` |
| `src/components/Map/TextboxModal.tsx` | Add font size slider (0.5x–2.0x), include `font_size` in saved object, show scaled preview |
| `src/hooks/useTextboxMarkers.ts` | Use `tb.font_size` to scale heading (13px base) and body (11px base) font sizes; make markers draggable with `dragend` → `updateTextbox` |

### Implementation Details

**`SceneTextbox` type** gets `font_size: number` (multiplier, default 1.0). Existing textboxes without this field will fall back to `tb.font_size ?? 1` in rendering code, so no migration needed.

**`createTextboxEl`** changes:
```typescript
heading.style.fontSize = `${Math.round(13 * (tb.font_size ?? 1))}px`;
body.style.fontSize = `${Math.round(11 * (tb.font_size ?? 1))}px`;
```

**Marker creation** changes:
```typescript
const marker = new mapboxgl.Marker({ 
  element: el, 
  anchor: "top-left",
  draggable: !presenting 
})
  .setLngLat([tb.lng, tb.lat])
  .addTo(map);

if (!presenting) {
  marker.on('dragend', () => {
    const lngLat = marker.getLngLat();
    updateTextbox(tb.id, { lng: lngLat.lng, lat: lngLat.lat });
  });
}
```

**TextboxModal** adds a font size slider row (same pattern as opacity slider), defaulting to 1.0.

