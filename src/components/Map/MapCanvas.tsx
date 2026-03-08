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
import { useOverlays, type OverlayRow } from "@/hooks/useOverlays";
import { useOverlayLayers } from "@/hooks/useOverlayLayers";
import { useMapStore } from "@/store/mapStore";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3JvZ2Vyczg2IiwiYSI6ImNtbWg0YXNiaTBjZjgycnB0c21mbzA1MDMifQ.snS_DuU14Far-Noo4WX_rA";

const STYLES = {
  ancient: "mapbox://styles/mapbox/outdoors-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

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
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);

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
    map.on("load", () => setMapReady(true));

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
