import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LocationPin } from "./usePins";

const LAYER_ID = "3d-models-layer";
const DEFAULT_CITY_MODEL_URL = "/models/default-city.gltf";

interface ModelEntry {
  group: THREE.Group;
  pinId: string;
}

/**
 * Renders 3D GLB/glTF models on the Mapbox terrain using a Three.js custom layer.
 */
export function use3DModels(
  map: mapboxgl.Map | null,
  pins: LocationPin[],
  hiddenLocationIds: string[] = []
) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelsRef = useRef<Map<string, ModelEntry>>(new Map());
  const loaderRef = useRef(new GLTFLoader());
  const modelCacheRef = useRef<Map<string, THREE.Group>>(new Map());
  const layerAddedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    // Filter pins that should have 3D models
    const modelPins = pins.filter((pin) => {
      // Explicitly opted out
      if (pin.model_url === "none") return false;
      // Has a custom model URL
      if (pin.model_url) return true;
      // Default: city-type locations get the default model
      if (pin.location_type === "city") return true;
      return false;
    });

    const hiddenSet = new Set(hiddenLocationIds);

    const addOrUpdateModels = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentIds = new Set(modelPins.map((p) => p.id));
      const existing = modelsRef.current;

      // Remove models no longer needed
      for (const [id, entry] of existing) {
        if (!currentIds.has(id)) {
          scene.remove(entry.group);
          existing.delete(id);
        }
      }

      // Add/update models
      for (const pin of modelPins) {
        const modelUrl = pin.model_url || DEFAULT_CITY_MODEL_URL;
        const isHidden = hiddenSet.has(pin.id);

        if (existing.has(pin.id)) {
          // Update visibility
          const entry = existing.get(pin.id)!;
          entry.group.visible = !isHidden;
          continue;
        }

        // Load and place model
        const cached = modelCacheRef.current.get(modelUrl);
        if (cached) {
          const clone = cached.clone();
          positionModel(clone, pin);
          clone.visible = !isHidden;
          scene.add(clone);
          existing.set(pin.id, { group: clone, pinId: pin.id });
        } else {
          loaderRef.current.load(
            modelUrl,
            (gltf) => {
              modelCacheRef.current.set(modelUrl, gltf.scene);
              const clone = gltf.scene.clone();
              positionModel(clone, pin);
              clone.visible = !isHidden;
              if (sceneRef.current) {
                sceneRef.current.add(clone);
                modelsRef.current.set(pin.id, { group: clone, pinId: pin.id });
                map.triggerRepaint();
              }
            },
            undefined,
            (err) => console.warn(`Failed to load 3D model for ${pin.name_ancient}:`, err)
          );
        }
      }

      map.triggerRepaint();
    };

    // Create custom layer if not already added
    if (!layerAddedRef.current && !map.getLayer(LAYER_ID)) {
      const customLayer: mapboxgl.CustomLayerInterface = {
        id: LAYER_ID,
        type: "custom",
        renderingMode: "3d",

        onAdd(_map, gl) {
          const scene = new THREE.Scene();
          const camera = new THREE.Camera();
          const renderer = new THREE.WebGLRenderer({
            canvas: _map.getCanvas(),
            context: gl,
            antialias: true,
          });
          renderer.autoClear = false;

          // Add ambient + directional light
          scene.add(new THREE.AmbientLight(0xffffff, 0.7));
          const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
          dirLight.position.set(1, 3, 2);
          scene.add(dirLight);

          sceneRef.current = scene;
          cameraRef.current = camera;
          rendererRef.current = renderer;

          // Now that the layer is ready, add models
          addOrUpdateModels();
        },

        render(_gl, matrix) {
          const scene = sceneRef.current;
          const camera = cameraRef.current;
          const renderer = rendererRef.current;
          if (!scene || !camera || !renderer) return;

          // Apply Mapbox's projection matrix to the Three.js camera
          const m = new THREE.Matrix4().fromArray(matrix);
          camera.projectionMatrix = m;

          renderer.resetState();
          renderer.render(scene, camera);
        },
      };

      try {
        map.addLayer(customLayer);
        layerAddedRef.current = true;
      } catch (e) {
        console.warn("Failed to add 3D model layer:", e);
      }
    } else {
      addOrUpdateModels();
    }

    return () => {
      // Don't remove the layer on every re-render — only on full unmount
    };
  }, [map, pins, hiddenLocationIds]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (map && layerAddedRef.current) {
        try {
          if (map.getLayer(LAYER_ID)) {
            map.removeLayer(LAYER_ID);
          }
        } catch { /* map may already be removed */ }
        layerAddedRef.current = false;
      }
      // Clear scene
      const scene = sceneRef.current;
      if (scene) {
        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }
      }
      modelsRef.current.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Position and scale a Three.js group to sit at the correct map coordinates.
 */
function positionModel(group: THREE.Group, pin: LocationPin) {
  const scale = pin.model_scale ?? 1.0;
  const altitude = pin.model_altitude ?? 0;
  const rotX = THREE.MathUtils.degToRad(pin.model_rotation_x ?? 0);
  const rotY = THREE.MathUtils.degToRad(pin.model_rotation_y ?? 0);
  const rotZ = THREE.MathUtils.degToRad(pin.model_rotation_z ?? 0);

  // Convert lng/lat to Mercator coordinates
  const merc = mapboxgl.MercatorCoordinate.fromLngLat(
    { lng: pin.coordinates[0], lat: pin.coordinates[1] },
    altitude
  );

  // Scale factor: Mapbox Mercator units per meter at this latitude
  const meterScale = merc.meterInMercatorCoordinateUnits();

  group.position.set(merc.x, merc.y, merc.z ?? 0);
  group.scale.set(
    scale * meterScale,
    -scale * meterScale, // Flip Y (Mapbox Y is inverted)
    scale * meterScale
  );
  group.rotation.set(rotX, rotY, rotZ);
}
