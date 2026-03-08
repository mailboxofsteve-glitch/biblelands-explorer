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

const MapCanvas = forwardRef<MapCanvasHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [skin, setSkin] = useState<MapSkin>("ancient");

  const { overlays } = useOverlays();
  const { pins } = usePins();
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const selectedPinId = useMapStore((s) => s.selectedPinId);
  const selectPin = useMapStore((s) => s.selectPin);

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
      pitch: 0,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      hideModernLayers(map);
      setMapReady(true);
    });
    map.on("style.load", () => {
      hideModernLayers(map);
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
    map.setStyle(STYLES[skin]);
  }, [skin]);

  // Overlay layer sync
  useOverlayLayers(
    mapReady ? mapRef.current : null,
    overlays,
    activeOverlayIds
  );

  // Pin markers
  usePinMarkers(
    mapReady ? mapRef.current : null,
    pins,
    selectedPinId,
    selectPin
  );

  // Tool interactions (pin drop click, route drawing)
  useToolInteractions(mapReady ? mapRef.current : null);

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
