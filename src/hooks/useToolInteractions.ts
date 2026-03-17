import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "@/store/mapStore";

/**
 * Manages map interactions for pin drop and route drawing tools.
 * Renders a live route preview when in draw_route mode.
 */
export function useToolInteractions(map: mapboxgl.Map | null) {
  const toolMode = useMapStore((s) => s.toolMode);
  const setPendingPinCoords = useMapStore((s) => s.setPendingPinCoords);
  const addRoutePoint = useMapStore((s) => s.addRoutePoint);
  const setPendingTextboxCoords = useMapStore((s) => s.setPendingTextboxCoords);
  const routePoints = useMapStore((s) => s.routePoints);
  const previewAdded = useRef(false);

  // Map click handler for tool modes
  useEffect(() => {
    if (!map) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const mode = useMapStore.getState().toolMode;

      if (mode === "pin_drop") {
        setPendingPinCoords(coords);
      } else if (mode === "draw_route") {
        addRoutePoint(coords);
      } else if (mode === "textbox_drop") {
        setPendingTextboxCoords(coords);
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, setPendingPinCoords, addRoutePoint, setPendingTextboxCoords]);

  // Cursor style
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    if (toolMode === "pin_drop" || toolMode === "draw_route" || toolMode === "textbox_drop") {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
    return () => {
      canvas.style.cursor = "";
    };
  }, [map, toolMode]);

  // Live route preview
  useEffect(() => {
    if (!map) return;

    const sourceId = "__route_preview";
    const layerId = "__route_preview_line";

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        routePoints.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: routePoints },
              },
            ]
          : [],
    };

    // Also add point markers for each click
    const pointFeatures: GeoJSON.Feature[] = routePoints.map((pt, i) => ({
      type: "Feature",
      properties: { index: i },
      geometry: { type: "Point", coordinates: pt },
    }));

    const pointGeojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pointFeatures,
    };

    const pointSourceId = "__route_preview_pts";
    const pointLayerId = "__route_preview_pts_layer";

    if (toolMode === "draw_route") {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#e07020",
            "line-width": 3,
            "line-opacity": 0.8,
            "line-dasharray": [4, 2],
          },
        });
        previewAdded.current = true;
      }

      const lastIdx = routePoints.length - 1;
      if (map.getSource(pointSourceId)) {
        (map.getSource(pointSourceId) as mapboxgl.GeoJSONSource).setData(pointGeojson);
      } else {
        map.addSource(pointSourceId, { type: "geojson", data: pointGeojson });
        map.addLayer({
          id: pointLayerId,
          type: "circle",
          source: pointSourceId,
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "index"], 0], "#22c55e",
              ["==", ["get", "index"], lastIdx], "#ef4444",
              "#e07020",
            ] as any,
            "circle-radius": [
              "case",
              ["any", ["==", ["get", "index"], 0], ["==", ["get", "index"], lastIdx]], 6,
              5,
            ] as any,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
      }
    } else {
      // Cleanup preview
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getSource(pointSourceId)) map.removeSource(pointSourceId);
      previewAdded.current = false;
    }
  }, [map, toolMode, routePoints]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      const ids = [
        ["__route_preview_line", "__route_preview"],
        ["__route_preview_pts_layer", "__route_preview_pts"],
      ];
      for (const [layerId, sourceId] of ids) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
