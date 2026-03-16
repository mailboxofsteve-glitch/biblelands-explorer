

## Conveyor-Belt Arrow Animation for Routes

### Concept
Replace the current "progressive draw with glowing head" animation with a **conveyor-belt style**: the full route line is shown immediately, covered with evenly-spaced arrow markers that continuously slide forward along the path, creating a flowing directional motion.

### Technique
1. **Static line layers** — Draw the full route immediately (glow + solid line), plus green start / red end markers
2. **Arrow point cloud** — Generate a set of evenly-spaced point features along the densified path, each with a computed `bearing` property for rotation
3. **Animation loop** — On each `requestAnimationFrame`, advance an offset value that shifts all arrow positions forward along the path (wrapping around), then update the GeoJSON source. This creates the illusion of arrows flowing like a conveyor belt
4. **Custom arrow image** — Register a small triangle/chevron icon on the map using `map.addImage()` (generated via canvas), then use a `symbol` layer with `symbol-placement: "point"` and `icon-rotate` bound to the bearing property

### Implementation Details

**Arrow generation**: Given the densified coordinate array, place an arrow every ~N points (e.g., every 8-12 points). Each frame, increment a global offset, compute `(baseIndex + offset) % totalPoints` for each arrow, and look up the coordinate + bearing at that position.

**Bearing calculation**: For each arrow position index `i`, compute `Math.atan2(coords[i+1][1] - coords[i][1], coords[i+1][0] - coords[i][0])` converted to degrees.

**Speed**: The offset advances at a configurable rate (pixels per second mapped to coordinate indices per frame). The animation runs indefinitely until cancelled — no finite `duration` needed for the conveyor effect. The `onComplete` callback fires after an optional duration or is removed.

**Backward compatibility**: Keep the same `AnimateRouteOptions` interface and `animateRoute` / `animateRoutesSequentially` API signatures. The `duration` option becomes optional — if provided, the animation auto-stops after that time; if omitted, it runs until `cancel()` is called.

### File Modified

| File | Change |
|------|--------|
| `src/lib/animateRoute.ts` | Rewrite `animateRoute` to use conveyor-belt arrow animation; keep all existing exports and signatures intact |

### What stays the same
- `animateRoutesSequentially`, `cleanupAllAnimationLayers` — unchanged API
- Start (green) and end (red) circle markers
- Glow layer under the main line
- `extractCoordinates` and `densifyCoordinates` helpers
- All layer/source cleanup logic

