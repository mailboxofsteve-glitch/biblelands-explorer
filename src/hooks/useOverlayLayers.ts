import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { OverlayRow } from "@/hooks/useOverlays";

/**
 * Syncs active overlays as Mapbox sources/layers.
 * Call this hook inside MapCanvas or a sibling that has access to the map instance.
 */
export function useOverlayLayers(
  map: mapboxgl.Map | null,
  overlays: OverlayRow[],
  activeIds: string[]
) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    // Wait for style to load before manipulating layers
    const apply = () => {
      const activeSet = new Set(activeIds);
      const overlayMap = new Map(overlays.map((o) => [o.id, o]));

      // Remove layers/sources no longer active
      for (const id of addedRef.current) {
        if (!activeSet.has(id)) {
          removeOverlay(map, overlayMap.get(id)?.slug ?? id);
          addedRef.current.delete(id);
        }
      }

      // Add newly active overlays
      for (const id of activeIds) {
        if (addedRef.current.has(id)) continue;
        const overlay = overlayMap.get(id);
        if (!overlay) continue;
        addOverlay(map, overlay);
        addedRef.current.add(id);
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [map, overlays, activeIds]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const id of addedRef.current) {
        const overlay = overlays.find((o) => o.id === id);
        if (overlay) removeOverlay(map, overlay.slug);
      }
      addedRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-add overlays when style changes (style.load fires after setStyle)
  useEffect(() => {
    if (!map) return;
    const onStyleLoad = () => {
      const overlayMap = new Map(overlays.map((o) => [o.id, o]));
      // Re-add all currently active overlays since sources/layers are cleared
      const previouslyAdded = new Set(addedRef.current);
      addedRef.current.clear();
      for (const id of previouslyAdded) {
        const overlay = overlayMap.get(id);
        if (overlay) {
          addOverlay(map, overlay);
          addedRef.current.add(id);
        }
      }
    };
    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map, overlays]);
}

function sourceId(slug: string) {
  return `overlay-${slug}`;
}

function addOverlay(map: mapboxgl.Map, overlay: OverlayRow) {
  const src = sourceId(overlay.slug);
  if (map.getSource(src)) return; // already added

  map.addSource(src, {
    type: "geojson",
    data: overlay.geojson as unknown as GeoJSON.GeoJSON,
  });

  const style = overlay.default_style as Record<string, unknown>;
  const color = overlay.default_color;

  // Determine geometry type from geojson
  const geojson = overlay.geojson as any;
  const geometryType = getGeometryType(geojson);

  if (geometryType === "line") {
    map.addLayer({
      id: `${src}-line`,
      type: "line",
      source: src,
      paint: {
        "line-color": (style["line-color"] as string) ?? color,
        "line-width": (style["line-width"] as number) ?? 2,
        "line-opacity": (style["line-opacity"] as number) ?? 0.8,
      },
    });
  } else if (geometryType === "polygon") {
    map.addLayer({
      id: `${src}-fill`,
      type: "fill",
      source: src,
      paint: {
        "fill-color": (style["fill-color"] as string) ?? color,
        "fill-opacity": (style["fill-opacity"] as number) ?? 0.2,
      },
    });
    map.addLayer({
      id: `${src}-stroke`,
      type: "line",
      source: src,
      paint: {
        "line-color": (style["line-color"] as string) ?? color,
        "line-width": (style["line-width"] as number) ?? 1.5,
        "line-opacity": (style["line-opacity"] as number) ?? 0.7,
      },
    });
  } else if (geometryType === "point") {
    map.addLayer({
      id: `${src}-circle`,
      type: "circle",
      source: src,
      paint: {
        "circle-color": (style["circle-color"] as string) ?? color,
        "circle-radius": (style["circle-radius"] as number) ?? 5,
        "circle-opacity": (style["circle-opacity"] as number) ?? 0.8,
      },
    });
  }
}

function removeOverlay(map: mapboxgl.Map, slug: string) {
  const src = sourceId(slug);
  const suffixes = ["-line", "-fill", "-stroke", "-circle"];
  for (const suffix of suffixes) {
    const layerId = `${src}${suffix}`;
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(src)) map.removeSource(src);
}

function getGeometryType(geojson: any): "line" | "polygon" | "point" | "unknown" {
  const type = geojson?.type;
  let geomType: string | undefined;

  if (type === "FeatureCollection") {
    geomType = geojson.features?.[0]?.geometry?.type;
  } else if (type === "Feature") {
    geomType = geojson.geometry?.type;
  } else {
    geomType = type;
  }

  if (!geomType) return "unknown";
  const lower = geomType.toLowerCase();
  if (lower.includes("line")) return "line";
  if (lower.includes("polygon")) return "polygon";
  if (lower.includes("point")) return "point";
  return "unknown";
}
