

## Simultaneous Route Animations

### Change

Replace `animateRoutesSequentially` with a new `animateRoutesSimultaneously` function that starts all route animations at the same time instead of chaining them one after another.

### Implementation

**`src/lib/animateRoute.ts`** — Add new exported function:

```typescript
export function animateRoutesSimultaneously(
  map: mapboxgl.Map,
  routes: { geojson: GeoJSON.GeoJSON; color: string }[],
  options: { loop?: boolean; onAllComplete?: () => void } = {}
): { cancel: () => void } {
  const anims = routes.map(route =>
    animateRoute(map, route.geojson, { color: route.color, loop: options.loop })
  );
  return {
    cancel: () => anims.forEach(a => a.cancel()),
  };
}
```

The existing `animateRoute` already supports indefinite looping (no `duration` → runs forever). Each route gets its own independent animation layer with unique IDs, so they won't conflict.

**Update callers** — switch from `animateRoutesSequentially` to `animateRoutesSimultaneously`:
- `src/components/Map/PresentationHUD.tsx` — `triggerRouteAnimation`
- `src/components/Map/TeacherTools.tsx` — `handleAnimateRoutes`
- `src/pages/MapPage.tsx` — if it has its own animation call

Keep `animateRoutesSequentially` in the file (no breaking change), just stop using it.

### Files Modified

| File | Change |
|------|--------|
| `src/lib/animateRoute.ts` | Add `animateRoutesSimultaneously` |
| `src/components/Map/PresentationHUD.tsx` | Use simultaneous instead of sequential |
| `src/components/Map/TeacherTools.tsx` | Use simultaneous instead of sequential |
| `src/pages/MapPage.tsx` | Update if applicable |

