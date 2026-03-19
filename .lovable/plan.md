

## Add Projector Mode for High-Light Environments

A toggleable "Projector Mode" that boosts contrast and brightness for screen projection in well-lit rooms, without changing the default aesthetic.

### Approach

Add a CSS class (`projector-mode`) to the root element that applies targeted overrides. A toggle button will be available in the presentation HUD and the map controls.

### Changes

**1. `src/store/mapStore.ts`** — Add `projectorMode` boolean + `toggleProjectorMode` action to the store.

**2. `src/index.css`** — Add a `.projector-mode` class with overrides:
- Map canvas filter: reduce sepia, increase brightness and contrast (`sepia(15%) brightness(1.15) contrast(1.1)`)
- Pin markers: brighter backgrounds, thicker/lighter borders, white label text with dark text-stroke for readability
- Popup backgrounds: slightly lighter with higher-contrast text
- HUD elements: more opaque backgrounds, bolder text
- Fog adjustments handled in MapCanvas

**3. `src/components/Map/MapCanvas.tsx`** — Read `projectorMode` from store; adjust the CSS filter on the map container and the fog colors when projector mode is active. In projector mode: `sepia(15%) brightness(1.15) contrast(1.1)` instead of `sepia(40%) brightness(0.9)`.

**4. `src/hooks/usePinMarkers.ts`** — Read `projectorMode` from store in `createMarkerEl`. When active:
- Pin dot background: `#4a3820` → slightly lighter
- Pin border: `#c8a020` (gold, more visible)
- Label text: white with dark text-stroke (`-webkit-text-stroke: 0.5px #1a1208; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8)`)
- Label font-weight: bold

**5. `src/components/Map/PresentationHUD.tsx`** — Add a projector-mode toggle button (sun icon) in the bottom HUD bar, next to the Labels toggle.

**6. `src/pages/MapPage.tsx`** — Add the same toggle in the left sidebar controls so teachers can preview projector mode before presenting.

### What stays the same
- The normal (non-projector) appearance is completely unchanged
- The parchment/candlelight aesthetic is preserved — projector mode just brightens and increases contrast within the same color palette
- All other functionality (overlays, scenes, animations) works identically

### Files Changed

| File | Change |
|------|--------|
| `src/store/mapStore.ts` | Add `projectorMode` state + toggle |
| `src/index.css` | `.projector-mode` CSS overrides |
| `src/components/Map/MapCanvas.tsx` | Conditional filter + fog for projector mode |
| `src/hooks/usePinMarkers.ts` | Brighter markers/labels in projector mode |
| `src/components/Map/PresentationHUD.tsx` | Projector mode toggle button |
| `src/pages/MapPage.tsx` | Projector mode toggle in sidebar |

