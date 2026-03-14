

## True Fullscreen + Presenter View for Classroom Mode

### 1. True Fullscreen (Browser Fullscreen API)

Yes -- the browser's Fullscreen API (`document.documentElement.requestFullscreen()`) hides the browser toolbar, address bar, and tabs, producing a PowerPoint-like experience. This works in all modern browsers.

**Changes in `src/pages/MapPage.tsx`**:
- When entering presentation mode, call `document.documentElement.requestFullscreen()` after setting `presenting = true`.
- Listen for `fullscreenchange` event to detect if the user presses Escape at the browser level (which exits fullscreen without our button), and sync `presenting` state accordingly.

**Changes in `src/components/Map/PresentationHUD.tsx`**:
- When "Exit" is clicked, call `document.exitFullscreen()` in addition to `onExit()`.
- The Escape key handler should also call `document.exitFullscreen()`.

**Changes in `src/pages/SharedLesson.tsx`**:
- Same fullscreen enter/exit logic for the shared lesson's classroom mode.

### 2. Presenter View (Multi-Monitor via `window.open`)

This is feasible using the same pattern PowerPoint uses: open a **second browser window** for the audience display, and keep the original window as the presenter console. The `window.open()` API with the experimental Window Management API (`window.getScreenDetails()`) can even target a specific monitor when available, though the fallback (user drags the window) works universally.

**New file: `src/pages/PresentationWindow.tsx`** (+ route `/present/:lessonId`):
- A minimal page that renders only `MapCanvas` fullscreen with no controls.
- Listens to a `BroadcastChannel` for scene-change messages from the presenter window.
- Auto-enters browser fullscreen on load.

**New file: `src/components/Map/PresenterView.tsx`**:
- Replaces the standard PresentationHUD when presenter mode is active.
- Shows: current scene notes, next scene preview (title + thumbnail or description), scene navigation controls, timer/clock.
- Sends scene index changes over `BroadcastChannel` to the audience window.

**Changes in `src/pages/MapPage.tsx`**:
- Add a "Presenter View" option alongside the existing "Classroom Mode" button (e.g., a dropdown or second button).
- When selected: open `/present/${lessonId}` in a new window via `window.open()`, keep the current window as the presenter console showing `PresenterView`.

**Changes in `src/App.tsx`**:
- Add route: `<Route path="/present/:lessonId" element={<PresentationWindow />} />`

**Communication via `BroadcastChannel`**:
```typescript
// Presenter sends:
channel.postMessage({ type: "GO_TO_SCENE", index: 3 });
// Audience window receives and calls loadScene(3, map)
```

This is the same cross-tab communication pattern used by Google Slides and PowerPoint Online -- no server needed, works instantly between same-origin tabs/windows.

### Files Summary

| File | Change |
|------|--------|
| `src/pages/MapPage.tsx` | Add fullscreen API calls on enter/exit; add presenter view launch option |
| `src/components/Map/PresentationHUD.tsx` | Call `document.exitFullscreen()` on exit; sync with `fullscreenchange` event |
| `src/pages/SharedLesson.tsx` | Add fullscreen API for shared lesson classroom mode |
| `src/pages/PresentationWindow.tsx` | **New** -- audience-facing fullscreen map, listens to BroadcastChannel |
| `src/components/Map/PresenterView.tsx` | **New** -- presenter console with notes, next scene preview, timer, BroadcastChannel sender |
| `src/App.tsx` | Add `/present/:lessonId` route |

### No backend changes needed

Both features are purely client-side browser APIs.

