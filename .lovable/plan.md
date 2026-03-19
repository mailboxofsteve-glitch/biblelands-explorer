

## Fix Textbox Opacity + Investigate Disappearing Textboxes

### 1. Disappearing Textboxes

**Finding**: Both scenes (`793ca...` and `d39844...`) currently have `textboxes: []` in the database. The textboxes were overwritten to empty at some point.

**Root cause**: The auto-persist effect in `MapPage.tsx` (line 58-74) fires on every `sceneTextboxes` change. It uses a `_textboxSyncSkip` flag to avoid persisting when `loadScene` sets textboxes. However, if two consecutive scene loads have the same textbox array (e.g., both empty), the Zustand state doesn't change, the effect doesn't fire, and `_textboxSyncSkip` stays `true`. On the next *real* textbox edit, the persist is incorrectly skipped, and the change is lost. Alternatively, calling `updateScene` while the wrong scene's textboxes are loaded would overwrite with stale data.

**Fix**: Replace the brittle `_textboxSyncSkip` flag with a `_textboxSyncSource` discriminator. Instead of a boolean, store a `"load"` or `"edit"` origin. The auto-persist effect should only persist when the change source is `"edit"` (the default). `loadScene` sets source to `"load"`, and the effect resets it without persisting.

**Changes — `src/store/mapStore.ts`**:
- Replace `_textboxSyncSkip: boolean` with `_textboxSyncSource: "edit" | "load"` (default `"edit"`)
- In `loadScene`, set `_textboxSyncSource: "load"`

**Changes — `src/pages/MapPage.tsx`** (line 58-74):
- Read `_textboxSyncSource` instead of `_textboxSyncSkip`
- If `"load"`, reset to `"edit"` and return without persisting
- If `"edit"`, persist as usual

**Unfortunately the data is already lost.** I cannot restore the textboxes that were in those two scenes — they were overwritten in the database. You'll need to re-add them manually.

---

### 2. Zoom Affects Textbox Opacity

**Root cause**: Mapbox GL's **fog/atmosphere** system applies opacity attenuation to HTML markers (`.mapboxgl-marker`) based on distance from the camera. When you zoom out, fog makes markers progressively transparent. This is separate from the `fill_opacity` fix — the RGBA background is correct, but Mapbox is adding its own `opacity` inline style to the marker container.

**Fix**: Add a CSS rule that prevents fog from attenuating textbox markers. We'll add a `data-textbox` attribute to textbox marker elements and override the fog opacity via CSS.

**Changes — `src/hooks/useTextboxMarkers.ts`**:
- Add `wrapper.dataset.textbox = "true"` in `createTextboxEl`

**Changes — `src/index.css`**:
- Add rule: `.mapboxgl-marker:has([data-textbox]) { opacity: 1 !important; }`

---

### Summary of File Changes

| File | Change |
|------|--------|
| `src/store/mapStore.ts` | Replace `_textboxSyncSkip` with `_textboxSyncSource` |
| `src/pages/MapPage.tsx` | Update auto-persist effect to use new source flag |
| `src/hooks/useTextboxMarkers.ts` | Add `data-textbox` attribute to wrapper |
| `src/index.css` | Add CSS rule to prevent fog opacity on textbox markers |

