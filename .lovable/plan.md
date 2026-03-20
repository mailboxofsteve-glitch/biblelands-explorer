

## Add 3D Models Toggle + Screenshot Assessment

### Screenshot Assessment
The 3D models in the screenshot **are rendering correctly**. The default city model shows:
- Proper 3D depth with distinct faces visible
- Correct lighting (lighter tops, darker sides from the directional + hemisphere lights)
- Appropriate positioning on terrain
- The model is a simple low-poly ancient building cluster — blocky shapes with pointed towers — which is exactly what the bundled `default-city.gltf` is designed to look like

### Toggle Implementation

Add a `show3DModels` boolean to the map store and wire it into the sidebar controls, matching the existing Fog/Labels/Projector toggle pattern.

**`src/store/mapStore.ts`**:
- Add `show3DModels: boolean` (default `true`) to state
- Add `toggleShow3DModels` action

**`src/hooks/use3DModels.ts`**:
- Read `show3DModels` from store
- When `false`, hide all model groups (set `visible = false`) and skip loading new ones
- When toggled back on, restore visibility

**`src/pages/MapPage.tsx`**:
- Add a "3D" toggle switch in the sidebar controls row (next to Fog, Labels, Projector)

**`src/components/Map/MobileToolbar.tsx`**:
- Add the same toggle in the mobile controls sheet

| File | Change |
|------|--------|
| `src/store/mapStore.ts` | Add `show3DModels` + toggle action |
| `src/hooks/use3DModels.ts` | Respect `show3DModels` flag |
| `src/pages/MapPage.tsx` | Add toggle switch in sidebar |
| `src/components/Map/MobileToolbar.tsx` | Add toggle in mobile controls |

