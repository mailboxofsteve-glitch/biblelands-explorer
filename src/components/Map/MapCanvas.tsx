import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapSkinToggle from "./MapSkinToggle";
import { useOverlays } from "@/hooks/useOverlays";
import { useOverlayLayers } from "@/hooks/useOverlayLayers";
import { usePins } from "@/hooks/usePins";
import { usePinMarkers } from "@/hooks/usePinMarkers";
import { useCustomPins } from "@/hooks/useCustomPins";
import { useCustomPinMarkers } from "@/hooks/useCustomPinMarkers";
import { useToolInteractions } from "@/hooks/useToolInteractions";
import { useMapStore } from "@/store/mapStore";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3JvZ2Vyczg2IiwiYSI6ImNtbWg0YXNiaTBjZjgycnB0c21mbzA1MDMifQ.snS_DuU14Far-Noo4WX_rA";

const STYLES = {
  ancient: "mapbox://styles/mapbox/outdoors-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

const ROAD_KEYWORDS = ["road", "street", "bridge", "tunnel", "turning", "link", "motorway", "trunk", "path", "pedestrian"];
const BORDER_KEYWORDS = ["boundary", "border", "admin"];
const LABEL_KEYWORDS = ["label", "symbol", "place", "poi"];
const WATER_KEYWORDS = ["water", "sea", "ocean", "lake", "river"];

function hideModernLayers(map: mapboxgl.Map) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    const id = layer.id.toLowerCase();
    if (ROAD_KEYWORDS.some((k) => id.includes(k))) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    if (BORDER_KEYWORDS.some((k) => id.includes(k))) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    if (LABEL_KEYWORDS.some((k) => id.includes(k)) && !WATER_KEYWORDS.some((k) => id.includes(k))) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

export type MapSkin = keyof typeof STYLES;

export interface MapCanvasHandle {
  getMap: () => mapboxgl.Map | null;
}

const MapCanvas = forwardRef<MapCanvasHandle, { lessonId?: string; presenting?: boolean }>(({ lessonId, presenting = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [skin, setSkin] = useState<MapSkin>("ancient");

  const { allOverlays } = useOverlays();
  const { pins } = usePins();
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const selectedPinId = useMapStore((s) => s.selectedPinId);
  const selectPin = useMapStore((s) => s.selectPin);
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const hiddenLocationIds = useMapStore((s) => s.hiddenLocationIds);
  const fogEnabled = useMapStore((s) => s.fogEnabled);
  const labelFontSize = useMapStore((s) => s.labelFontSize);
  const originalTextSizes = useRef<Record<string, any>>({});

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES[skin],
      center: [35.5, 32.0],
      zoom: 6,
      bearing: 0,
      pitch: 35,
      maxPitch: 85,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const addTerrainSource = () => {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 2.0 });

      if (!map.getLayer("hillshade-layer")) {
        // Insert before first symbol layer for proper z-order
        const layers = map.getStyle()?.layers;
        let firstSymbol: string | undefined;
        if (layers) {
          for (const layer of layers) {
            if (layer.type === "symbol") { firstSymbol = layer.id; break; }
          }
        }
        try {
          map.addLayer({
            id: "hillshade-layer",
            type: "hillshade",
            source: "mapbox-dem",
            paint: {
              "hillshade-exaggeration": 0.6,
              "hillshade-shadow-color": "#473B2B",
              "hillshade-highlight-color": "#FDFCFA",
              "hillshade-accent-color": "#5a4a3a",
              "hillshade-illumination-direction": 315,
            },
          }, firstSymbol);
        } catch { /* layer may already exist */ }
      }
    };

    const applyFog = () => {
      map.setFog({
        color: "rgb(220, 210, 195)",
        "high-color": "rgb(180, 165, 145)",
        "horizon-blend": 0.08,
        "space-color": "rgb(25, 25, 35)",
        "star-intensity": 0.3,
      });
    };

    map.on("load", () => {
      hideModernLayers(map);
      addTerrainSource();
      applyFog();
      originalTextSizes.current = {};
      setMapReady(true);
    });
    map.on("style.load", () => {
      hideModernLayers(map);
      addTerrainSource();
      applyFog();
      originalTextSizes.current = {};
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update style when skin changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setMapReady(false);
    map.setStyle(STYLES[skin]);
    // mapReady will be restored via the "style.load" handler
  }, [skin]);

  // Overlay layer sync
  useOverlayLayers(
    mapReady ? mapRef.current : null,
    allOverlays,
    activeOverlayIds,
    showAllLabels
  );

  // Pin markers
  usePinMarkers(
    mapReady ? mapRef.current : null,
    pins,
    selectedPinId,
    selectPin,
    hiddenLocationIds,
    presenting
  );

  // Custom pins from the pins table
  const { pins: customPins } = useCustomPins(lessonId);
  useCustomPinMarkers(
    mapReady ? mapRef.current : null,
    customPins,
    selectedPinId,
    selectPin
  );

  // Tool interactions (pin drop click, route drawing)
  useToolInteractions(mapReady ? mapRef.current : null);

  // Fog toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (fogEnabled) {
      map.setFog({
        color: "rgb(220, 210, 195)",
        "high-color": "rgb(180, 165, 145)",
        "horizon-blend": 0.08,
        "space-color": "rgb(25, 25, 35)",
        "star-intensity": 0.3,
      });
    } else {
      map.setFog(null as any);
    }
  }, [fogEnabled, mapReady]);

  // Label font size scaling
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const layers = map.getStyle()?.layers;
    if (!layers) return;
    for (const layer of layers) {
      if (layer.type !== "symbol") continue;
      // Cache original text-size on first encounter
      if (!(layer.id in originalTextSizes.current)) {
        try {
          originalTextSizes.current[layer.id] = map.getLayoutProperty(layer.id, "text-size") ?? 12;
        } catch {
          originalTextSizes.current[layer.id] = 12;
        }
      }
      const orig = originalTextSizes.current[layer.id];
      try {
        if (typeof orig === "number") {
          map.setLayoutProperty(layer.id, "text-size", orig * labelFontSize);
        } else if (Array.isArray(orig)) {
          map.setLayoutProperty(layer.id, "text-size", scaleExpression(orig, labelFontSize));
        } else if (typeof orig === "object" && orig !== null && "stops" in orig) {
          const scaled = { ...orig, stops: (orig as any).stops.map((s: [number, number]) => [s[0], s[1] * labelFontSize]) };
          map.setLayoutProperty(layer.id, "text-size", scaled);
        }
      } catch { /* skip layers that don't support text-size */ }
    }
  }, [labelFontSize, mapReady]);

  const toggleSkin = useCallback(
    () => setSkin((prev) => (prev === "ancient" ? "satellite" : "ancient")),
    []
  );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={
          skin === "ancient"
            ? { filter: "sepia(40%) brightness(0.9)" }
            : undefined
        }
      />
      <MapSkinToggle skin={skin} onToggle={toggleSkin} />
    </div>
  );
});

MapCanvas.displayName = "MapCanvas";

export default MapCanvas;
