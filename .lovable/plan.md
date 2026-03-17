

## Three Fixes

### 1. Labels toggle-off bug

**Root cause**: In `src/hooks/usePinMarkers.ts`, when updating existing markers (line 149-153), the code only sets `tooltip.style.opacity = "1"` inside `if (showAllLabels)` but has no `else` to set it back to `"0"`. Additionally, markers created while `showAllLabels=true` have no hover listeners attached (line 65-68 of `createMarkerEl`), so when labels are toggled off, those markers have permanently visible tooltips with no hover behavior.

**Fix**: Force full marker recreation when `showAllLabels` or `labelFontSize` changes. Clear `markersRef.current` at the start of the effect when these values change from the previous render (track with a ref). This ensures `createMarkerEl` is called with the correct `showLabel` param, which correctly sets initial opacity and attaches/omits hover listeners.

Same pattern should be checked in `useCustomPinMarkers.ts` — it has the same stale-hover-listener issue though line 127 at least resets opacity correctly. Apply same recreation fix for consistency.

**Files**: `src/hooks/usePinMarkers.ts`, `src/hooks/useCustomPinMarkers.ts`

### 2. Classroom mode HUD hidden behind timeline

**Root cause**: `PresentationHUD` bottom HUD is positioned at `bottom-24` (line 189), but `BottomTimeline` can be taller than 6rem when an era is expanded (era bar 3.5rem + slider area ~6rem = ~9.5rem). The HUD gets covered.

**Fix**: Change the HUD position from `bottom-24` to a larger value that clears the expanded timeline. The expanded timeline is roughly `h-14` (era bar) + slider content (~8rem) ≈ 11.5rem. Use `bottom-44` (~11rem) to sit above it comfortably. This keeps the HUD visible whether the timeline is collapsed or expanded.

**File**: `src/components/Map/PresentationHUD.tsx` — line 189, change `bottom-24` to `bottom-44`

### 3. Explore page: add label size slider, labels toggle, play animation button

Add controls to the Explore page sidebar (desktop) and mobile sheet:
- **Label size slider** (`Slider` from UI, wired to `useMapStore` `labelFontSize`/`setLabelFontSize`)
- **Labels toggle** (`Switch` wired to `showAllLabels`/`toggleShowAllLabels`)
- **Play animation button** that finds active line overlays and calls `animateRoutesSimultaneously`

**File**: `src/pages/Explore.tsx` — import `Switch`, `Slider`, `useMapStore`, animation utilities; add controls above/below `OverlayToggles` in both desktop sidebar and mobile sheet.

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePinMarkers.ts` | Force marker recreation when `showAllLabels` changes |
| `src/hooks/useCustomPinMarkers.ts` | Same recreation fix for consistency |
| `src/components/Map/PresentationHUD.tsx` | Move bottom HUD from `bottom-24` to `bottom-44` |
| `src/pages/Explore.tsx` | Add label slider, labels toggle, and play animation button |

