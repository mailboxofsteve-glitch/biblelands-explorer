

## Fix Jerusalem GLB Model Not Rendering

### Root Cause

The Jerusalem model file (`jerusalem_1st._temple_period._blmj_museum.glb`) likely uses **Draco compression**. The current `GLTFLoader` has no `DRACOLoader` configured, so it silently fails when encountering Draco-compressed geometry. The error callback fires but may not be visible in the captured console logs.

Additionally, even without Draco, `.glb` files from museum/archival sources sometimes use **KHR_mesh_quantization** or **KHR_draco_mesh_compression** extensions that require explicit loader configuration.

### Fix

**`src/hooks/use3DModels.ts`**:
1. Import and configure `DRACOLoader` from `three/examples/jsm/loaders/DRACOLoader.js`
2. Point the Draco decoder to the CDN path (`https://www.gstatic.com/draco/versioned/decoders/1.5.7/`)
3. Attach it to the `GLTFLoader` via `loader.setDRACOLoader(dracoLoader)`
4. Add a visible `console.error` in the failure callback so load failures are obvious

**`src/components/Admin/ModelPreview.tsx`**:
1. Configure `useGLTF` with Draco support so the admin preview also handles compressed models
2. Use `useGLTF.preload` with Draco decoder path, or manually configure the loader

### Changes

| File | Change |
|------|--------|
| `src/hooks/use3DModels.ts` | Add DRACOLoader setup to GLTFLoader; improve error logging |
| `src/components/Admin/ModelPreview.tsx` | Add Draco support to useGLTF for preview compatibility |

