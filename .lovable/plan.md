

## Fix: Textboxes Not Showing on First Scene in Classroom Mode

### Root Cause

Race condition between two effects in `useTextboxMarkers.ts`:

1. **Cleanup effect** (line 64-68): Runs when `presenting` changes → clears all markers
2. **Main effect** (line 15-62): Runs when `sceneTextboxes` changes → creates markers

When entering Classroom Mode:
- `presenting` flips to `true` → cleanup effect clears markers
- `PresentationHUD` mounts → `goToScene(0)` fires in a `useEffect([], [])` → `loadScene` sets `sceneTextboxes`
- The cleanup effect for `presenting` can fire **after** the main effect has already created markers for the first scene's textboxes, destroying them

The cleanup effect on `[presenting]` is meant to force a full re-render of markers with new presenting styles, but it doesn't trigger a subsequent recreation — it just destroys.

### Fix (`src/hooks/useTextboxMarkers.ts`)

Remove the separate cleanup-on-presenting-change effect (lines 64-68). The main effect already has `presenting` in its dependency array, and it already removes+recreates every marker on each run. The separate cleanup effect is redundant and causes the race condition.

```
// DELETE lines 64-68:
// useEffect(() => {
//   for (const marker of markersRef.current.values()) marker.remove();
//   markersRef.current.clear();
// }, [presenting]);
```

The main effect (lines 15-62) already handles the `presenting` change correctly — it removes existing markers and recreates them with the right `presenting` flag on every run.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTextboxMarkers.ts` | Remove redundant cleanup effect that races with marker creation |

