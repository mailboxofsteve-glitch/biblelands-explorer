

## Add Width & Height Controls to Textbox Overlays

### Changes

**`src/types/index.ts`** — Add `width: number` and `height: number` to `SceneTextbox`. Width in px (default 240), height in px (default 0 = auto-fit content).

**`src/hooks/useTextboxMarkers.ts`** — Apply `tb.width` and `tb.height` to the wrapper element. Replace hardcoded `maxWidth: 240px` / `minWidth: 140px` with the stored width. If height > 0, set explicit height + `overflow: auto`; otherwise leave auto.

**`src/components/Map/TextboxModal.tsx`** — Add two sliders:
- Width: 100–500px, default 240
- Height: 0 (auto) to 400px, default 0 (auto)
- Pre-fill from `editingTextbox` when editing
- Include in save payload
- Apply to the preview box

**`src/store/mapStore.ts`** — No changes needed; `updateTextbox` already accepts `Partial<SceneTextbox>`.

### Files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `width: number; height: number` to `SceneTextbox` |
| `src/components/Map/TextboxModal.tsx` | Add width/height sliders, include in save, apply to preview |
| `src/hooks/useTextboxMarkers.ts` | Use `tb.width`/`tb.height` for element sizing instead of hardcoded values |

