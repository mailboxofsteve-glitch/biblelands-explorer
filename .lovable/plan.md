

## Fix 3D Models Rendering as Flat White Silhouettes

### Root Cause

The models load and position correctly (the shapes are visible), but they appear as flat white shapes with no shading. Two issues:

1. **Flipped normals from negative Y scale**: The transform uses `makeScale(s, -s, s)` to flip Y for Mapbox coordinates. This flips the triangle winding order, causing normals to point inward. Three.js defaults to `FrontSide` rendering, so the lighting calculations produce incorrect/uniform results — making everything appear flat white.

2. **Normal matrix not updated**: With `matrixAutoUpdate = false` and manual `matrix` assignment, the normal matrix (used for lighting calculations) may not be recomputed properly during render. This further breaks shading.

### Fix (`src/hooks/use3DModels.ts`)

1. **Set all materials to `DoubleSide`**: After cloning a model, traverse all meshes and set `material.side = THREE.DoubleSide`. This ensures faces render correctly regardless of the winding order flip from the negative Y scale.

2. **Force matrix world update**: After setting `clone.matrix`, call `clone.updateMatrixWorld(true)` so Three.js recomputes the normal matrix for proper lighting.

3. **Improve lighting setup**: Adjust the directional light to better illuminate the scene. Add a secondary hemisphere light for more natural ambient fill, replacing the single flat ambient light.

### Changes

**`src/hooks/use3DModels.ts`**:

In the `addModel` function, after cloning:
```typescript
// Fix materials for Y-flip winding order
clone.traverse((child) => {
  if ((child as THREE.Mesh).isMesh) {
    const mesh = child as THREE.Mesh;
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => { m.side = THREE.DoubleSide; });
    } else {
      mesh.material.side = THREE.DoubleSide;
    }
  }
});
clone.updateMatrixWorld(true);
```

In the `onAdd` function, improve lighting:
```typescript
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(0.5, -0.5, 1); // Light from above-front
scene.add(dirLight);
const hemiLight = new THREE.HemisphereLight(0xfdfcfa, 0x473b2b, 0.4);
scene.add(hemiLight);
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/use3DModels.ts` | DoubleSide materials, matrix world update, improved lighting |

