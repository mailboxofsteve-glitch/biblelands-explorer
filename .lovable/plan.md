

## Loop Route Animations Until Stopped

### Change
In `animateRoutesSequentially`, add a `loop` option (default `false`). When `true`, after the last route finishes, reset `currentIndex` to 0 and call `playNext()` again instead of invoking `onAllComplete`.

### File: `src/lib/animateRoute.ts`
- Add `loop?: boolean` to the options parameter of `animateRoutesSequentially`
- In `playNext()`, when `currentIndex >= routes.length` and `loop` is true, reset `currentIndex = 0` and recurse instead of stopping

### File: `src/components/Map/TeacherTools.tsx`
- Pass `loop: true` when calling `animateRoutesSequentially`

### File: `src/components/Map/PresentationHUD.tsx`
- Pass `loop: true` when calling `animateRoutesSequentially`

