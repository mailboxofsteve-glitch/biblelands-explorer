

## Enhance Route Rendering with Start/End Markers and Directional Arrows

Currently routes render as flat colored lines with no indication of direction, start, or end. This plan adds three visual enhancements while keeping things clean and simple.

### Visual Result

```text
  🟢 ──── ▸ ──── ▸ ──── ▸ ──── 🔴
 start   arrows along path      end
  (with subtle glow behind the line)
```

- **Start marker**: Green circle with white stroke at the first coordinate
- **End marker**: Red circle with white stroke at the last coordinate  
- **Directional arrows**: Small chevron/triangle symbols placed along the line at intervals
- **Glow effect**: A wider, semi-transparent copy of the line rendered behind it for depth

### Files to modify

#### 1. `src/hooks/useOverlayLayers.ts` — Static route rendering
In the `addOverlay` function, when a LineString layer is added:
- Add a **glow layer** (same source, wider line, lower opacity, blur) rendered before the main line
- Extract the **first and last coordinates** from LineString features
- Create a separate GeoJSON source with two Point features (start + end) and add two circle layers: green for start, red for end
- Add an **arrow symbol layer** using `symbol-placement: "line"` with a built-in Mapbox arrow image (`▸` or the `triangle-11` sprite)

Update `removeOverlay` to also clean up the new layer/source IDs (`-glow`, `-endpoints`, `-endpoints-start`, `-endpoints-end`, `-arrows`).

#### 2. `src/lib/animateRoute.ts` — Animated route rendering
- Add a **persistent start marker** (green circle layer) at `coords[0]` that stays visible throughout the animation
- The existing glowing head already serves as a moving endpoint indicator — keep it as-is
- When animation completes and the head is removed, add a **red end marker** at the final coordinate

#### 3. `src/hooks/useToolInteractions.ts` — Live route preview while drawing
- Add start/end point markers to the existing preview point layer: color the first point green and the last point red using data-driven styling (`["case", ["==", ["get", "index"], 0], "#22c55e", ...]`)

### No backend or store changes needed
All changes are purely visual — Mapbox layer styling on existing GeoJSON data.

