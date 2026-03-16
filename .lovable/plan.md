

## Fix: Labels Disappearing on Hover + Label Size Slider Not Working

### Bug 1: Labels disappear on hover

In `src/hooks/usePinMarkers.ts`, the tooltip visibility is managed in two places that conflict:

- **Hover listeners** (set once at creation, lines 66-68): toggle opacity on mouseenter/mouseleave.
- **Effect update loop** (runs on every dependency change, line 150): resets `tooltip.style.opacity` to `showAllLabels ? "1" : "0"` for ALL existing markers.

The effect depends on `selectedPinId`, `pins`, `hiddenLocationIds`, etc. When the user hovers a pin and then anything triggers a re-render (e.g., the map fires an event that changes state), the effect re-runs and **resets the hovered tooltip back to opacity "0"**, making it flash/disappear.

**Fix**: Stop force-resetting tooltip opacity for existing markers when `showAllLabels` is false. Only force opacity when `showAllLabels` is true. When false, leave the hover listeners in control. Additionally, re-attach hover listeners when updating existing markers so they work correctly after state changes.

### Bug 2: Label size slider doesn't change font size

Two problems in `src/components/Map/MapCanvas.tsx` (lines 226-252):

1. **Expression handling is broken** (line 248): Mapbox outdoors-v12 uses interpolate expressions for `text-size` like `["interpolate", ["linear"], ["zoom"], 10, 12, 14, 16]`. The current code wraps these in `["*", ["number", orig], labelFontSize]` which is invalid — `["number", array]` doesn't evaluate an expression. The correct Mapbox expression is simply `["*", orig, labelFontSize]`.

2. **Object-based stops not handled**: Some layers use legacy `{stops: [[zoom, size], ...]}` format. These are objects (not arrays, not numbers), so neither branch executes and the layer is skipped entirely.

**Fix**: 
- For array expressions: use `["*", orig, labelFontSize]` directly.
- For object-based stops: multiply each stop value by the multiplier and pass the modified stops object.

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/usePinMarkers.ts` | Fix tooltip opacity reset logic — only force when `showAllLabels` is true; otherwise let hover listeners control it |
| `src/components/Map/MapCanvas.tsx` | Fix expression scaling: use `["*", orig, multiplier]` for arrays; handle stops objects; handle edge cases |

