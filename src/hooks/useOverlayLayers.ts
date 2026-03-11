import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { OverlayRow } from "@/hooks/useOverlays";

/**
 * Syncs active overlays as Mapbox sources/layers.
 * When showAllLabels is true, adds symbol layers with overlay names.
 */
export function useOverlayLayers(
  map: mapboxgl.Map | null,
  overlays: OverlayRow[],
  activeIds: string[],
  showAllLabels: boolean = false
) {
  const addedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

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

      // Sync label layers
      syncLabelLayers(map, overlays, activeIds, addedRef.current, showAllLabels);
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [map, overlays, activeIds, showAllLabels]);

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

  // Re-add overlays when style changes
  useEffect(() => {
    if (!map) return;
    const onStyleLoad = () => {
      const overlayMap = new Map(overlays.map((o) => [o.id, o]));
      const previouslyAdded = new Set(addedRef.current);
      addedRef.current.clear();
      for (const id of previouslyAdded) {
        const overlay = overlayMap.get(id);
        if (overlay) {
          addOverlay(map, overlay);
          addedRef.current.add(id);
        }
      }
      syncLabelLayers(map, overlays, activeIds, addedRef.current, showAllLabels);
    };
    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map, overlays, activeIds, showAllLabels]);
}

function sourceId(slug: string) {
  return `overlay-${slug}`;
}

function labelLayerId(slug: string) {
  return `overlay-${slug}-label`;
}

function syncLabelLayers(
  map: mapboxgl.Map,
  overlays: OverlayRow[],
  activeIds: string[],
  addedIds: Set<string>,
  showAllLabels: boolean
) {
  const overlayMap = new Map(overlays.map((o) => [o.id, o]));

  for (const id of addedIds) {
    const overlay = overlayMap.get(id);
    if (!overlay) continue;
    const src = sourceId(overlay.slug);
    const lblId = labelLayerId(overlay.slug);

    if (showAllLabels) {
      if (map.getLayer(lblId)) continue; // already exists
      if (!map.getSource(src)) continue;

      const geojson = overlay.geojson as any;
      const geometryType = getGeometryType(geojson);

      map.addLayer({
        id: lblId,
        type: "symbol",
        source: src,
        layout: {
          "text-field": overlay.name,
          "text-size": 13,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-placement": geometryType === "line" ? "line" : "point",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          ...(geometryType === "line" ? { "text-max-angle": 30 } : {}),
        },
        paint: {
          "text-color": "#f0e0b0",
          "text-halo-color": "#1a1208",
          "text-halo-width": 1.5,
          "text-opacity": 0.9,
        },
      });
    } else {
      // Remove label layer if it exists
      if (map.getLayer(lblId)) {
        map.removeLayer(lblId);
      }
    }
  }
}

function addOverlay(map: mapboxgl.Map, overlay: OverlayRow) {
  const src = sourceId(overlay.slug);
  if (map.getSource(src)) return;

  map.addSource(src, {
    type: "geojson",
    data: overlay.geojson as unknown as GeoJSON.GeoJSON,
  });

  const style = overlay.default_style as Record<string, unknown>;
  const color = overlay.default_color;

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
  const suffixes = ["-line", "-fill", "-stroke", "-circle", "-label"];
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
