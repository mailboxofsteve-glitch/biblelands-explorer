

## Translucent Timeline + Auto-hiding Toolbar in Classroom Mode

### Overview
Make the BottomTimeline see-through during classroom presentations so the map shows through, and make the PresentationHUD toolbar appear only on mouse hover.

### Changes

**1. Pass `presenting` prop to BottomTimeline**

In `MapPage.tsx` and `SharedLesson.tsx`, pass `presenting={presenting}` to `<BottomTimeline>`.

**2. BottomTimeline — translucent in presenting mode**

Accept optional `presenting?: boolean` prop. When true:
- Root container: change from `bg-card/95` to `bg-card/30 backdrop-blur-[2px]` — mostly transparent but enough contrast for text
- Era bar buttons: reduce background opacity, add text-shadow for projector legibility
- Expanded detail section: similarly transparent background
- Year labels and entry count text: add `drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]` for readability on bright projector screens
- Track and markers keep their existing colors (they're small enough to not block much)

**3. PresentationHUD — toolbar auto-hides**

The bottom HUD bar (nav controls + labels/projector/notes toggles) should:
- Default to `opacity-0 translate-y-2` (hidden, shifted down slightly)
- On mouse enter of a hover zone at the bottom of the screen: `opacity-100 translate-y-0`
- Use a wrapper `div` with `onMouseEnter`/`onMouseLeave` and CSS `transition-all duration-300`
- The scene title stays always visible (it's small and useful context)
- The exit button (top-right) stays always visible

Implementation: wrap the nav controls `div` in a hover-detection container. Add state `hudVisible` toggled by mouse events. Apply opacity/transform classes conditionally.

### Files Changed

| File | Change |
|------|--------|
| `src/components/Map/BottomTimeline.tsx` | Add `presenting` prop; apply translucent styles when true |
| `src/components/Map/PresentationHUD.tsx` | Auto-hide toolbar on idle, show on mouse hover |
| `src/pages/MapPage.tsx` | Pass `presenting` to `<BottomTimeline>` |
| `src/pages/SharedLesson.tsx` | Pass `presenting` to `<BottomTimeline>` |

