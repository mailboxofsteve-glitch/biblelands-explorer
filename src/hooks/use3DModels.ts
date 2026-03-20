import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { LocationPin } from "./usePins";
import { useMapStore } from "@/store/mapStore";

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
  const loaderRef = useRef(() => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    loader.setDRACOLoader(dracoLoader);
    return loader;
  });
  const gltfLoader = useRef(loaderRef.current());
  const modelCacheRef = useRef<Map<string, THREE.Group>>(new Map());
  const layerAddedRef = useRef(false);
  const contextLostRef = useRef(false);
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

  const show3DModels = useMapStore((s) => s.show3DModels);

  // Toggle visibility of all models when show3DModels changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const [, entry] of modelsRef.current) {
      entry.group.visible = show3DModels && !hiddenLocationIds.includes(entry.pinId);
    }
    if (map) map.triggerRepaint();
  }, [show3DModels, map, hiddenLocationIds]);

  useEffect(() => {
    if (!map || !show3DModels) return;

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
        const isHidden = hiddenSet.has(pin.id) || !show3DModels;

        if (existing.has(pin.id)) {
          const entry = existing.get(pin.id)!;
          entry.group.visible = !isHidden;
          // Update transform in case pin data changed
          const mat = buildModelMatrix(pin, entry.merc);
          entry.group.matrix.copy(mat);
          continue;
        }

        // Compute Mercator position once per pin
        const altitudeOffset = pin.model_altitude ?? 0;
        const lngLat: mapboxgl.LngLatLike = { lng: pin.coordinates[0], lat: pin.coordinates[1] };
        const terrainElev = map.queryTerrainElevation(lngLat) ?? 0;
        const merc = mapboxgl.MercatorCoordinate.fromLngLat(
          lngLat,
          terrainElev + altitudeOffset
        );
        const mercData = {
          x: merc.x,
          y: merc.y,
          z: merc.z ?? 0,
          meterScale: merc.meterInMercatorCoordinateUnits(),
        };

        const addModel = (sourceGroup: THREE.Group) => {
          const clone = sourceGroup.clone();

          // Fix materials for Y-flip winding order
          clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => { m.side = THREE.DoubleSide; });
              } else {
                mesh.material.side = THREE.DoubleSide;
              }
            }
          });

          // We'll manage the matrix manually
          clone.matrixAutoUpdate = false;
          clone.matrix.copy(buildModelMatrix(pin, mercData));
          clone.visible = !isHidden;
          clone.updateMatrixWorld(true);

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
          gltfLoader.current.load(
            modelUrl,
            (gltf) => {
              modelCacheRef.current.set(modelUrl, gltf.scene);
              addModel(gltf.scene);
            },
            undefined,
            (err) =>
              console.error(
                `[3D] Failed to load model for ${pin.name_ancient} (${modelUrl}):`,
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
            preserveDrawingBuffer: false,
          });
          renderer.autoClear = false;

          scene.add(new THREE.AmbientLight(0xffffff, 0.5));
          const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
          dirLight.position.set(0.5, -0.5, 1);
          scene.add(dirLight);
          const hemiLight = new THREE.HemisphereLight(0xfdfcfa, 0x473b2b, 0.4);
          scene.add(hemiLight);

          sceneRef.current = scene;
          cameraRef.current = camera;
          rendererRef.current = renderer;

          // Handle WebGL context loss/restoration
          const canvas = _map.getCanvas();
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn("[3D] WebGL context lost — pausing 3D rendering");
            contextLostRef.current = true;
          }, false);
          canvas.addEventListener("webglcontextrestored", () => {
            console.info("[3D] WebGL context restored — reinitializing renderer");
            contextLostRef.current = false;
            // Recreate renderer with the new context
            const newGl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            if (newGl) {
              const newRenderer = new THREE.WebGLRenderer({
                canvas,
                context: newGl,
                antialias: true,
                preserveDrawingBuffer: false,
              });
              newRenderer.autoClear = false;
              rendererRef.current = newRenderer;
            }
            // Reload all models
            if (sceneRef.current) {
              while (sceneRef.current.children.length > 3) {
                sceneRef.current.remove(sceneRef.current.children[sceneRef.current.children.length - 1]);
              }
              modelsRef.current.clear();
            }
            addOrUpdateModels();
            _map.triggerRepaint();
          }, false);

          addOrUpdateModels();
        },

        render(_gl, matrix) {
          if (contextLostRef.current) return;
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
  }, [map, pins, hiddenLocationIds, show3DModels]);

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
