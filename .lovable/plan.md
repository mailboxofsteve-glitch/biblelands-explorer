

## Add Atmospheric Fog Toggle and Label Font Size Slider

### Changes

**`src/store/mapStore.ts`** — Add two new state properties and actions:
- `fogEnabled: boolean` (default `true`) + `toggleFog()`
- `labelFontSize: number` (default `1.0`, range 0.5–2.0) + `setLabelFontSize(size: number)`

**`src/components/Map/MapCanvas.tsx`** — React to store state:
- **Fog**: On map load (and style.load), call `map.setFog(...)` with atmospheric settings (color, horizon-blend, star-intensity, etc.). Add a `useEffect` that watches `fogEnabled` and calls `map.setFog(...)` or `map.setFog(null)` accordingly.
- **Label font size**: Add a `useEffect` watching `labelFontSize` that iterates all style layers of type `"symbol"` and scales their `text-size` paint property by the multiplier. Store original sizes in a ref on first pass for accurate scaling.

**`src/pages/MapPage.tsx`** — Add controls to the left sidebar (desktop):
- Add a fog toggle (Switch) next to the existing "Labels" toggle in the Controls header area.
- Add a label font size slider (using the existing `Slider` component) in the Controls section, between the Labels toggle and the Era section.

**`src/components/Map/MobileToolbar.tsx`** — Add the same controls to the mobile Controls sheet:
- Fog toggle switch
- Label font size slider

### Fog Configuration
```typescript
map.setFog({
  color: "rgb(220, 210, 195)",
  "high-color": "rgb(180, 165, 145)",
  "horizon-blend": 0.08,
  "space-color": "rgb(25, 25, 35)",
  "star-intensity": 0.3,
});
```

### Files to modify
| File | Change |
|------|--------|
| `src/store/mapStore.ts` | Add `fogEnabled`, `labelFontSize`, and their actions |
| `src/components/Map/MapCanvas.tsx` | Apply/remove fog and scale label text sizes reactively |
| `src/pages/MapPage.tsx` | Add fog toggle + font size slider to desktop sidebar |
| `src/components/Map/MobileToolbar.tsx` | Add fog toggle + font size slider to mobile sheet |

