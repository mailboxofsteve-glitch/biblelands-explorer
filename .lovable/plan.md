

## Fix Route Animation Crash

### Root Cause
The runtime error `Cannot read properties of undefined (reading '0')` occurs in the `tick` function of `animateRoute.ts`. Due to floating-point arithmetic, `segIndex` can occasionally equal `totalSegments`, making `coords[segIndex + 1]` out of bounds. The existing guard `segIndex < totalSegments` should prevent this, but edge cases in the animation frame timing can slip through.

### Fix (1 file)

**`src/lib/animateRoute.ts`** — Add defensive clamping in `tick`:
- Clamp `segIndex` to `Math.min(segIndex, totalSegments - 1)` before accessing `coords[segIndex]` and `coords[segIndex + 1]`
- Add a null check: if `from` or `to` is undefined, skip to the else branch (draw full line)
- This prevents the crash regardless of floating-point edge cases

```
// In tick(), after computing segIndex:
const clampedIndex = Math.min(segIndex, totalSegments - 1);
```

And use `clampedIndex` instead of `segIndex` for array access.

