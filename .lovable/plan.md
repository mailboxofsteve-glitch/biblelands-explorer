

## Fix 3D Models Not Rendering

### Root Cause

The `use3DModels` hook has a stale-ref bug: it tracks whether the custom layer was added via `layerAddedRef`, but Mapbox silently removes custom layers on every `style.load` event. The ref stays `true`, so the layer is never re-created after the initial style load completes.

Additionally, when `mapReady` toggles (which happens on style load in `MapCanvas`), the Three.js scene/camera/renderer refs from the old layer's `onAdd` become invalid but are never cleared.

### Fix (single file: `src/hooks/use3DModels.ts`)

1. **Listen for `style.load` and re-add the layer**: After adding the custom layer, register a `style.load` handler on the map that resets `layerAddedRef` and clears the scene/camera/renderer refs. This ensures the next effect run will re-create the layer.

2. **Guard `addOrUpdateModels` on scene existence**: Already done (`if (!scene) return`), but ensure the `else` branch also checks this.

3. **Reset layer ref when map changes**: At the top of the main effect, detect if the map instance changed and reset `layerAddedRef`.

4. **Add a `map.on('style.load', ...)` listener** inside the effect that:
   - Sets `layerAddedRef.current = false`
   - Clears `sceneRef`, `cameraRef`, `rendererRef`
   - Clears `modelsRef`
   
   This way, the next time the effect runs (triggered by `mapReady` going true), it will re-create the layer fresh.

5. **Add diagnostic console.log** statements (temporary) to confirm the layer is being added and models are loading, to verify the fix works.

### Technical Details

```text
Effect flow after fix:
  map ready + pins loaded
    → layerAddedRef = false (reset by style.load handler)
    → !layerAddedRef && !map.getLayer(LAYER_ID) → true
    → map.addLayer(customLayer)
    → onAdd fires → scene/camera/renderer created
    → addOrUpdateModels() → loads GLTFs for city pins
    → map.triggerRepaint() → models render
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/use3DModels.ts` | Add style.load listener to reset refs; track map instance to reset layer state; ensure proper re-initialization |

