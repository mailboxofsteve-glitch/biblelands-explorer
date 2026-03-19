
Fix the 3D model rendering in two parts:

1. Make sure the location is actually eligible to render
- The uploaded model for `944cc397-091a-4039-acee-14b68996d4a7` is saved correctly in the backend and the storage bucket is public.
- But that location belongs to the `patriarchs` era, while the map store defaults to `nt_ministry`.
- So on the default map view, Ai is filtered out before the 3D hook even runs.
- I’ll make the current-era behavior easier to understand in the UI and verify the hook only depends on pins that are truly visible.

2. Correct the 3D transform math in `use3DModels`
- Right now the hook only sets:
  - raw Mercator position
  - raw projection matrix
  - simple scale/rotation
- That is not the full Mapbox + Three.js custom-layer transform.
- For GLTF/GLB models, we need the standard model matrix composition:
  - translate to Mercator coordinate
  - scale with Mercator meter conversion
  - flip Y axis for Mapbox coordinates
  - apply a base orientation transform so model-up matches map-up
- Without that, models can render underground, sideways, or outside the visible frustum even though they loaded successfully.

Implementation steps:
- Update `src/hooks/use3DModels.ts`
  - Replace the current direct `group.position/group.scale/group.rotation` approach with the standard custom-layer transform pattern using a composed `THREE.Matrix4`.
  - Add a per-model root container so the Mercator transform and the user rotation settings are applied in the correct order.
  - Add a base X-axis rotation for GLTF scene alignment.
  - Keep caching and style reload recovery intact.
- Improve altitude handling
  - Use terrain-aware elevation when available so models sit on the ground instead of at sea level.
  - Continue applying `model_altitude` as an offset above terrain.
- Add lightweight debug logging during implementation
  - Confirm when a model is included/excluded by era filtering.
  - Confirm successful GLB/GLTF load and final transform values.
  - Remove noisy logs once verified.

Important finding from the investigation:
- The model file itself appears fine:
  - bucket exists and is public
  - object exists
  - location row has the uploaded `model_url`
  - `model_scale` is now `2000`
- So the remaining issue is not storage; it is render eligibility + transform setup.

Technical details

```text
Current failure path:
location exists
→ usePins filters by currentEra
→ Ai excluded unless era = patriarchs
→ if included, current custom-layer transform is incomplete
→ model may still not appear even though loaded
```

```text
Planned render flow:
visible pin in current era
→ load/cached GLB
→ compute Mercator coordinate at terrain elevation + altitude offset
→ compose model matrix:
   translation * scale * axis-fix * user-rotation
→ render through Mapbox custom layer camera
→ model appears anchored to terrain
```

Files to update:
- `src/hooks/use3DModels.ts` — main fix
- `src/store/mapStore.ts` or related UI surface — optional small follow-up if we want a better default era or clearer era visibility behavior
- Potentially `src/pages/Explore.tsx` / `src/pages/MapPage.tsx` — only if needed to surface current-era context more clearly

Expected result:
- Uploaded GLB models and the default city model will render when their location is in the currently selected era.
- Ai will appear after switching to the Patriarchs era.
- Models should remain visible across style reloads and sit correctly on the map instead of disappearing below terrain.

<lov-actions>
<lov-suggestion message="Test this end-to-end by switching the map to the Patriarchs era and verifying that Ai’s uploaded 3D model appears on the map.">Verify that it works</lov-suggestion>
<lov-suggestion message="Make the current era more obvious in the map UI so it’s clear why some cities or 3D models are hidden.">Show active era clearly</lov-suggestion>
<lov-suggestion message="Add a temporary 3D model debug mode that highlights model anchor points and shows whether a model is filtered, loaded, or rendered.">Add 3D debug mode</lov-suggestion>
</lov-actions>
