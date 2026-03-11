

## Show All Labels Toggle

Add a toggle that makes labels permanently visible on all displayed pins, overlays, and routes — instead of only on hover.

### How it works

**1. Add `showAllLabels` to map store (`src/store/mapStore.ts`)**
- New boolean state `showAllLabels: false` with a `toggleShowAllLabels` action.

**2. Update pin marker hooks to respect the flag**

Both `usePinMarkers.ts` and `useCustomPinMarkers.ts` currently create tooltip divs with `opacity: 0` that show on hover. When `showAllLabels` is true:
- Set tooltip `opacity: 1` by default (always visible)
- Skip the mouseenter/mouseleave handlers
- React to changes in the flag by updating existing marker tooltip elements

**3. Add overlay/route labels via Mapbox symbol layers (`useOverlayLayers.ts`)**

When `showAllLabels` is true, add a `symbol` layer for each active overlay source:
- For **line** overlays: add a symbol layer with `symbol-placement: "line"` and `text-field` set to the overlay name — text follows the route path
- For **polygon** overlays: add a symbol layer with `symbol-placement: "point"` to label the centroid
- Style: parchment-themed text (`#f0e0b0`, serif font, halo `#1a1208`)
- Remove these symbol layers when `showAllLabels` is toggled off

**4. Add toggle UI**

- **Left sidebar** (`MapPage.tsx`): Add a small switch/checkbox labeled "Show Labels" in the Controls header area, wired to `toggleShowAllLabels`
- **Mobile toolbar** (`MobileToolbar.tsx`): Add the same toggle in the Controls sheet
- **Presentation HUD** (`PresentationHUD.tsx`): Add the toggle so it's available during presentations too

### Files to modify
- `src/store/mapStore.ts` — add `showAllLabels` + `toggleShowAllLabels`
- `src/hooks/usePinMarkers.ts` — read flag, set tooltip opacity accordingly
- `src/hooks/useCustomPinMarkers.ts` — same
- `src/hooks/useOverlayLayers.ts` — add/remove symbol label layers based on flag, accept overlays' names
- `src/components/Map/MapCanvas.tsx` — pass `showAllLabels` to `useOverlayLayers`
- `src/pages/MapPage.tsx` — add toggle switch in sidebar
- `src/components/Map/MobileToolbar.tsx` — add toggle in mobile controls
- `src/components/Map/PresentationHUD.tsx` — add toggle

