

## Fix: Label Font Size Slider Still Not Working

### Root Cause

The console shows the exact error: **`"zoom" expression may only be used as input to a top-level "step" or "interpolate" expression`**.

Mapbox layers like `settlement-major-label` and `state-label` use `text-size` values that are `interpolate` or `step` expressions containing `["zoom"]`, e.g.:
```js
["interpolate", ["linear"], ["zoom"], 6, 12, 14, 22]
```

The current fix wraps this in `["*", originalExpr, multiplier]`, which nests the zoom expression inside a `*` operator — Mapbox forbids this. Zoom expressions must remain at the **top level** of an interpolate/step.

### Fix

Instead of wrapping the whole expression, **walk into the interpolate/step expression and multiply only the numeric output values** while preserving the structure.

For an interpolate like `["interpolate", ["linear"], ["zoom"], 6, 12, 14, 22]`:
- Indices 0-2 are the header (`interpolate`, method, input)
- From index 3 onward, it alternates: stop (even index), output (odd index)
- Multiply only the output values (odd indices from index 3)

Result: `["interpolate", ["linear"], ["zoom"], 6, 12*factor, 14, 22*factor]`

For a step like `["step", ["zoom"], 12, 6, 14]`:
- Index 0: "step", index 1: input, index 2: default output
- From index 3: alternating stop, output
- Multiply the default (index 2) and output values (even indices from index 3)

**File: `src/components/Map/MapCanvas.tsx`** — Replace the array branch (line 246-247) with a helper that:
1. Detects if the expression is an `interpolate` or `step` expression
2. Clones the array and multiplies only numeric output values in-place
3. Falls back to `["*", orig, factor]` only for expressions that don't contain zoom (unlikely but safe)

```typescript
function scaleExpression(expr: any[], factor: number): any[] {
  const type = expr[0];
  if (type === "interpolate" || type === "interpolate-hcl" || type === "interpolate-lab") {
    // [type, method, input, stop1, out1, stop2, out2, ...]
    const result = [...expr];
    for (let i = 4; i < result.length; i += 2) {
      if (typeof result[i] === "number") result[i] = result[i] * factor;
    }
    return result;
  }
  if (type === "step") {
    // ["step", input, defaultOut, stop1, out1, ...]
    const result = [...expr];
    if (typeof result[2] === "number") result[2] = result[2] * factor;
    for (let i = 4; i < result.length; i += 2) {
      if (typeof result[i] === "number") result[i] = result[i] * factor;
    }
    return result;
  }
  // No zoom reference — safe to wrap
  return ["*", expr, factor];
}
```

### Files to modify

| File | Change |
|------|--------|
| `src/components/Map/MapCanvas.tsx` | Add `scaleExpression` helper; use it in the array branch of the label scaling effect |

