

## Auto-Play Route Animations on Classroom Mode Entry

### Change
In `PresentationHUD.tsx`, modify `goToScene` to **always** trigger route animation when in presentation mode, removing the `scene.animate_on_enter` guard. Every scene that has active line overlays will automatically animate its routes on entry.

### File: `src/components/Map/PresentationHUD.tsx`
- In `goToScene`, replace:
  ```ts
  if (scene?.animate_on_enter) {
    setTimeout(() => triggerRouteAnimation(scene), 1400);
  }
  ```
  with:
  ```ts
  // Always auto-play route animations in classroom mode
  setTimeout(() => triggerRouteAnimation(scene), 1400);
  ```
- `triggerRouteAnimation` already gracefully exits if there are no line overlays on the scene, so no guard is needed.

Single line change, one file.

