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

    // If map instance changed, reset everything
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
          continue;
        }

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
        } catch { /* map may already be removed */ }
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

function positionModel(group: THREE.Group, pin: LocationPin) {
  const scale = pin.model_scale ?? 1.0;
  const altitude = pin.model_altitude ?? 0;
  const rotX = THREE.MathUtils.degToRad(pin.model_rotation_x ?? 0);
  const rotY = THREE.MathUtils.degToRad(pin.model_rotation_y ?? 0);
  const rotZ = THREE.MathUtils.degToRad(pin.model_rotation_z ?? 0);

  const merc = mapboxgl.MercatorCoordinate.fromLngLat(
    { lng: pin.coordinates[0], lat: pin.coordinates[1] },
    altitude
  );

  const meterScale = merc.meterInMercatorCoordinateUnits();

  group.position.set(merc.x, merc.y, merc.z ?? 0);
  group.scale.set(
    scale * meterScale,
    -scale * meterScale,
    scale * meterScale
  );
  group.rotation.set(rotX, rotY, rotZ);
}
