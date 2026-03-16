

## Fix: Label Size Slider Should Control Custom Pin Label Font Size

### What's Wrong
The label size slider currently scales native Mapbox layer `text-size` properties (city names from the base map style). It should instead scale the **custom pin tooltip labels** created by teachers — the HTML `<div>` tooltips in `usePinMarkers.ts` (line 58: `font-size: 11px`) and `useCustomPinMarkers.ts` (line 56: `font-size: 11px`).

### Fix

**`src/hooks/usePinMarkers.ts`** and **`src/hooks/useCustomPinMarkers.ts`**:
- Read `labelFontSize` from `useMapStore`
- Apply it to the tooltip's `font-size` when creating markers: `font-size: ${11 * labelFontSize}px`
- In the update loop for existing markers, find the tooltip element and update its `font-size` style when `labelFontSize` changes
- Add `labelFontSize` to the effect dependency arrays

**`src/components/Map/MapCanvas.tsx`**:
- Remove the `useEffect` that scales native Mapbox `text-size` properties (the entire label scaling effect block) and the `scaleExpression` helper, since this was addressing the wrong labels
- Remove `originalTextSizes` ref
- Remove `labelFontSize` from store reads in this file

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/usePinMarkers.ts` | Read `labelFontSize` from store; apply to tooltip font-size on create and update |
| `src/hooks/useCustomPinMarkers.ts` | Same — read `labelFontSize`, apply to tooltip font-size |
| `src/components/Map/MapCanvas.tsx` | Remove native Mapbox label scaling effect, `scaleExpression` helper, and `originalTextSizes` ref |

