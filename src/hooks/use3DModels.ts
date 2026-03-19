import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LocationPin } from "./usePins";

const LAYER_ID = "3d-models-layer";
const DEFAULT_CITY_MODEL_URL = "/models/default-city.gltf";
const DEFAULT_MODEL_SCALE = 2000;

interface ModelEntry {
  group: THREE.Group;
  pinId: string;
  /** The Mercator coordinate used to build the model matrix */
  merc: { x: number; y: number; z: number; meterScale: number };
}

/**
 * Build a world-space model matrix for a pin.
 *
 * Mapbox custom layers work in Mercator coordinates where the
 * projection matrix supplied in `render(gl, matrix)` already maps
 * Mercator → clip space.  We need to:
 *   1. Translate to the pin's Mercator position
 *   2. Scale from real-world meters into Mercator units
 *   3. Flip Y (Mapbox Y points down in Mercator space)
 *   4. Rotate X by -π/2 so GLTF +Y-up becomes +Z-up (map-up)
 *   5. Apply user rotations on top
 */
function buildModelMatrix(
  pin: LocationPin,
  merc: { x: number; y: number; z: number; meterScale: number }
): THREE.Matrix4 {
  const scale = pin.model_scale ?? DEFAULT_MODEL_SCALE;
  const s = scale * merc.meterScale;

  const rotX = THREE.MathUtils.degToRad(pin.model_rotation_x ?? 0);
  const rotY = THREE.MathUtils.degToRad(pin.model_rotation_y ?? 0);
  const rotZ = THREE.MathUtils.degToRad(pin.model_rotation_z ?? 0);

  // Translation
  const T = new THREE.Matrix4().makeTranslation(merc.x, merc.y, merc.z);

  // Scale (flip Y for Mapbox coordinate convention)
  const S = new THREE.Matrix4().makeScale(s, -s, s);

  // Base rotation: align GLTF Y-up to map Z-up
  const Rbase = new THREE.Matrix4().makeRotationX(Math.PI / 2);

  // User rotations (applied after base alignment)
  const Ruser = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotX, rotY, rotZ, "XYZ")
  );

  // Final: T * S * Rbase * Ruser
  return T.multiply(S).multiply(Rbase).multiply(Ruser);
}

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
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Reset state when map instance changes or on style.load
  useEffect(() => {
    if (!map) return;

    if (mapInstanceRef.current !== map) {
      layerAddedRef.current = false;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      modelsRef.current.clear();
      mapInstanceRef.current = map;
    }

    const onStyleLoad = () => {
      layerAddedRef.current = false;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      modelsRef.current.clear();
    };

    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const modelPins = pins.filter((pin) => {
      if (pin.model_url === "none") return false;
      if (pin.model_url) return true;
      if (pin.location_type === "city") return true;
      return false;
    });

    const hiddenSet = new Set(hiddenLocationIds);

    const addOrUpdateModels = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentIds = new Set(modelPins.map((p) => p.id));
      const existing = modelsRef.current;

      // Remove stale models
      for (const [id, entry] of existing) {
        if (!currentIds.has(id)) {
          scene.remove(entry.group);
          existing.delete(id);
        }
      }

      for (const pin of modelPins) {
        const modelUrl = pin.model_url || DEFAULT_CITY_MODEL_URL;
        const isHidden = hiddenSet.has(pin.id);

        if (existing.has(pin.id)) {
          const entry = existing.get(pin.id)!;
          entry.group.visible = !isHidden;
          // Update transform in case pin data changed
          const mat = buildModelMatrix(pin, entry.merc);
          entry.group.matrix.copy(mat);
          continue;
        }

        // Compute Mercator position once per pin
        const altitude = pin.model_altitude ?? 0;
        const merc = mapboxgl.MercatorCoordinate.fromLngLat(
          { lng: pin.coordinates[0], lat: pin.coordinates[1] },
          altitude
        );
        const mercData = {
          x: merc.x,
          y: merc.y,
          z: merc.z ?? 0,
          meterScale: merc.meterInMercatorCoordinateUnits(),
        };

        const addModel = (sourceGroup: THREE.Group) => {
          const clone = sourceGroup.clone();
          // We'll manage the matrix manually
          clone.matrixAutoUpdate = false;
          clone.matrix.copy(buildModelMatrix(pin, mercData));
          clone.visible = !isHidden;

          if (sceneRef.current) {
            sceneRef.current.add(clone);
            modelsRef.current.set(pin.id, {
              group: clone,
              pinId: pin.id,
              merc: mercData,
            });
            map.triggerRepaint();
          }
        };

        const cached = modelCacheRef.current.get(modelUrl);
        if (cached) {
          addModel(cached);
        } else {
          loaderRef.current.load(
            modelUrl,
            (gltf) => {
              modelCacheRef.current.set(modelUrl, gltf.scene);
              addModel(gltf.scene);
            },
            undefined,
            (err) =>
              console.warn(
                `Failed to load 3D model for ${pin.name_ancient}:`,
                err
              )
          );
        }
      }

      map.triggerRepaint();
    };

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

          scene.add(new THREE.AmbientLight(0xffffff, 0.7));
          const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
          dirLight.position.set(1, 3, 2);
          scene.add(dirLight);

          sceneRef.current = scene;
          cameraRef.current = camera;
          rendererRef.current = renderer;

          addOrUpdateModels();
        },

        render(_gl, matrix) {
          const scene = sceneRef.current;
          const camera = cameraRef.current;
          const renderer = rendererRef.current;
          if (!scene || !camera || !renderer) return;

          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

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
    } else if (sceneRef.current) {
      addOrUpdateModels();
    }
  }, [map, pins, hiddenLocationIds]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      const m = mapInstanceRef.current;
      if (m && layerAddedRef.current) {
        try {
          if (m.getLayer(LAYER_ID)) m.removeLayer(LAYER_ID);
        } catch {
          /* map may already be removed */
        }
        layerAddedRef.current = false;
      }
      const scene = sceneRef.current;
      if (scene) {
        while (scene.children.length > 0) scene.remove(scene.children[0]);
      }
      modelsRef.current.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);
}
