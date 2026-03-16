

## Fixes and Enhancements

### 1. Fix: Classroom mode route animations joining multi-shape overlays

**Root cause**: In `PresentationHUD.triggerRouteAnimation`, each overlay's entire GeoJSON (which may contain multiple disconnected LineString features) is passed as a single route to `animateRoutesSequentially`. The `extractCoordinates` function then concatenates all features' coordinates into one array, creating visual jumps between disconnected segments.

**Fix**: In `PresentationHUD.tsx`, expand each multi-feature overlay into separate routes (one per LineString feature) before passing to `animateRoutesSequentially` — the same pattern the normal view's `useOverlayLayers` already handles correctly by treating each feature independently.

```typescript
// Instead of one route per overlay, expand to one route per LineString feature
const routes = [];
for (const o of lineOverlays) {
  const geojson = o.geojson as any;
  const features = geojson?.type === "FeatureCollection" ? geojson.features : [geojson];
  for (const f of features) {
    if (f?.geometry?.type?.includes("Line")) {
      routes.push({ geojson: { type: "Feature", ...f } as GeoJSON.GeoJSON, color: o.default_color });
    }
  }
}
```

Also apply the same fix to `MapPage.tsx`'s `handleAnimateRoutes` for consistency.

### 2. Add BottomTimeline to classroom mode

**Current**: `MapPage.tsx` line 312 hides the timeline when `presenting` is true: `{!presenting && <BottomTimeline />}`.

**Fix**: Always show `<BottomTimeline />`, but in presenting mode position it at the very bottom over the fullscreen content. Also add it to `SharedLesson.tsx` (currently missing entirely).

The PresentationHUD's bottom HUD positioning (currently `fixed bottom-8`) will need to shift up to accommodate the timeline.

### 3. Double font sizes and marker sizes on the timeline

In `BottomTimeline.tsx`:
- Era bar height: `h-10` → `h-14`
- Expanded era label: `text-sm` → `text-lg`
- Collapsed era abbreviation: `text-[9px]` → `text-[18px]`
- Year labels: `text-[10px]` → `text-xl` (or `text-[20px]`)
- Filter status text: same doubling
- Entry count text: `text-[9px]` → `text-[18px]`
- Entry marker dots: `w-2 h-2` → `w-4 h-4`
- Slider thumb: `w-4 h-4` → `w-6 h-6`

### Files Modified

| File | Change |
|------|--------|
| `src/components/Map/PresentationHUD.tsx` | Expand multi-feature overlays into separate routes; shift HUD up to accommodate timeline |
| `src/pages/MapPage.tsx` | Show `<BottomTimeline />` during presentation; fix `handleAnimateRoutes` multi-feature expansion |
| `src/pages/SharedLesson.tsx` | Add `<BottomTimeline />` to layout |
| `src/components/Map/BottomTimeline.tsx` | Double all font sizes and marker dot sizes |

