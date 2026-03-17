

## Add Edit Support for Existing Textbox Overlays

### Changes

**`src/store/mapStore.ts`** — Add `editingTextbox: SceneTextbox | null` and `setEditingTextbox(tb | null)` to track which textbox is being edited.

**`src/components/Map/TextboxModal.tsx`** — Accept an optional `editingTextbox?: SceneTextbox` prop. When provided:
- Pre-fill all fields (heading, body, color, opacity, font size) from the existing textbox
- Title changes to "Edit Text Box"
- Save calls `updateTextbox(id, updates)` instead of `addTextbox`
- Keeps the existing `id` and coordinates (unless dragged separately)

**`src/hooks/useTextboxMarkers.ts`** — Add a double-click listener on the textbox wrapper element (when not presenting). On double-click, call `setEditingTextbox(tb)` to open the modal in edit mode.

**`src/components/Map/TeacherTools.tsx`** — Read `editingTextbox` from the store, pass it to `TextboxModal`, and open the modal when it's set. On close, clear `editingTextbox`.

### Flow
1. User double-clicks an existing textbox on the map
2. Store sets `editingTextbox` to that textbox's data
3. `TextboxModal` opens pre-filled with current values (heading, body, color, opacity, font size)
4. User edits and saves → `updateTextbox` is called → auto-sync persists changes
5. Marker is rebuilt with updated styles via the existing re-render logic

### Files

| File | Change |
|------|--------|
| `src/store/mapStore.ts` | Add `editingTextbox` state + `setEditingTextbox` action |
| `src/components/Map/TextboxModal.tsx` | Support edit mode via optional prop, pre-fill fields, call `updateTextbox` on save |
| `src/hooks/useTextboxMarkers.ts` | Add double-click handler on wrapper to trigger edit; force marker rebuild on textbox content changes |
| `src/components/Map/TeacherTools.tsx` | Wire `editingTextbox` to `TextboxModal` open state |

