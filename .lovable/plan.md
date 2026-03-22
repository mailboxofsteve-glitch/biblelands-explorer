

## Fix Timeline Translucency + Add Presentation Remote Support

### 1. Timeline Not Visually See-Through

The translucent code IS in the codebase (`bg-card/30`), but on a dark map with a dark card color (`hsl(30 20% 8%)`), 30% opacity of near-black still looks nearly opaque. Fix:

**`src/components/Map/BottomTimeline.tsx`**:
- Change `bg-card/30` to `bg-black/15` — a much lighter wash that's clearly see-through
- On the expanded era detail section (line 195), add presenting-conditional: `bg-black/10` when presenting (currently inherits parent bg, which stacks opacity)
- On era buttons: when presenting + expanded, change `bg-accent/5` to `bg-transparent`
- Reduce border opacity when presenting: `border-border/20` → `border-transparent`

### 2. Presentation Remote (Clicker) Support

Standard presentation remotes send `PageDown`/`PageUp` and `ArrowDown`/`ArrowUp` keypresses.

**`src/components/Map/PresentationHUD.tsx`** — In the keyboard handler (line 134):
- Add `ArrowDown` and `PageDown` → call `next()` with `preventDefault()`
- Add `ArrowUp` and `PageUp` → call `prev()` with `preventDefault()`
- This maps all 4 common clicker buttons (up/down arrows + page up/down) to scene navigation
- `preventDefault()` on all of them stops the window from scrolling

**`src/components/Map/PresenterView.tsx`** — Same change in its keyboard handler for consistency.

### Files Changed

| File | Change |
|------|--------|
| `src/components/Map/BottomTimeline.tsx` | Make translucency more dramatic when presenting |
| `src/components/Map/PresentationHUD.tsx` | Add ArrowUp/Down + PageUp/Down to keyboard nav |
| `src/components/Map/PresenterView.tsx` | Add ArrowUp/Down + PageUp/Down to keyboard nav |

