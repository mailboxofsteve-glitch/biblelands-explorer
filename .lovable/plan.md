

## Build the /explore Page — Public Read-Only Map

Replace the placeholder with a full-screen interactive map that lets anyone browse biblical locations and overlays by era, without needing to sign in or having any lesson context.

### Layout

```text
┌──────────────────────────────────────────────┐
│ ← Back   BibleLands   Era: [selector ▾]     │  ← thin top bar
├────────┬─────────────────────────────────────┤
│ Era    │                                     │
│ list   │         MapCanvas                   │
│        │      (full map, no lesson tools)    │
│ ────── │                                     │
│Overlays│                                     │
│ toggles│                                     │
├────────┴─────────────────────────────────────┤
```

On mobile: sidebar collapses; a bottom sheet or floating button opens era/overlay controls.

### Changes

#### 1. `src/pages/Explore.tsx` — Full rewrite
- Full-screen layout with a narrow left sidebar (era selector + overlay toggles) and the map filling the rest.
- Render `MapCanvas` without `lessonId` — already supported (custom pins / tool interactions simply won't fire without a lesson).
- Include `EraSelector` and `OverlayToggles` components (already built, just need to mount them).
- Add a small header bar with "BibleLands" branding and a "Back" link to `/`.
- No login required, no scene list, no teacher tools, no presentation mode.
- On mobile (`useIsMobile`): hide sidebar, show a floating button that opens a Sheet with era/overlay controls.

#### 2. No backend or store changes needed
- `MapCanvas` already works without a `lessonId` — it renders pins and overlays via the existing hooks.
- `useOverlays` fetches preloaded overlays without auth.
- `usePins` fetches era-filtered locations without auth.
- The map store's era/overlay state drives everything already.

### Files to modify
- **`src/pages/Explore.tsx`** — Full rewrite (the only file changed)

