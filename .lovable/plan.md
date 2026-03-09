

## Problem

When entering presentation mode, the sidebars switch from `relative` to `absolute` positioning and slide off-screen. The flex layout *should* reclaim the space, but Mapbox doesn't know its container resized — it needs an explicit `map.resize()` call after the CSS transition completes.

From the screenshot, the right ~200px stays blank because Mapbox is still rendering at the old container size.

## Fix (single file: `MapPage.tsx`)

1. After `setPresenting(true)` or `setPresenting(false)`, wait for the 300ms CSS transition to finish, then call `mapRef.current?.getMap()?.resize()`.

```ts
const enterPresentation = useCallback(() => {
  setPresenting(true);
  setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
}, []);

const exitPresentation = useCallback(() => {
  setPresenting(false);
  setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
}, []);
```

This single change ensures Mapbox recalculates its canvas dimensions after the sidebar transition completes, filling the entire viewport.

