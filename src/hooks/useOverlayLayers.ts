import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { OverlayRow } from "@/hooks/useOverlays";

/**
 * Syncs active overlays as Mapbox sources/layers.
 * Supports mixed-geometry FeatureCollections (e.g. LineString + Point).
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

      for (const id of addedRef.current) {
        if (!activeSet.has(id)) {
          removeOverlay(map, overlayMap.get(id)?.slug ?? id);
          addedRef.current.delete(id);
        }
      }

      for (const id of activeIds) {
        if (addedRef.current.has(id)) continue;
        const overlay = overlayMap.get(id);
        if (!overlay) continue;
        addOverlay(map, overlay);
        addedRef.current.add(id);
      }

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

/* ── helpers ─────────────────────────────────────────── */

function sourceId(slug: string) {
  return `overlay-${slug}`;
}

function labelLayerId(slug: string) {
  return `overlay-${slug}-label`;
}

type GeomKind = "line" | "polygon" | "point" | "unknown";

function classifyGeomType(type: string | undefined): GeomKind {
  if (!type) return "unknown";
  const lower = type.toLowerCase();
  if (lower.includes("line")) return "line";
  if (lower.includes("polygon")) return "polygon";
  if (lower.includes("point")) return "point";
  return "unknown";
}

/** Return the "primary" geometry kind for label placement (prefer line). */
function getPrimaryGeometryType(geojson: any): GeomKind {
  const features = geojson?.type === "FeatureCollection"
    ? geojson.features ?? []
    : geojson?.type === "Feature"
      ? [geojson]
      : [];

  let hasLine = false;
  let hasPolygon = false;
  let hasPoint = false;

  for (const f of features) {
    const k = classifyGeomType(f?.geometry?.type);
    if (k === "line") hasLine = true;
    else if (k === "polygon") hasPolygon = true;
    else if (k === "point") hasPoint = true;
  }

  if (hasLine) return "line";
  if (hasPolygon) return "polygon";
  if (hasPoint) return "point";

  // Bare geometry (not wrapped in Feature)
  return classifyGeomType(geojson?.type);
}

/* ── add / remove ────────────────────────────────────── */

function extractLineEndpoints(geojson: any): { start: [number, number]; end: [number, number] } | null {
  const features: any[] =
    geojson?.type === "FeatureCollection"
      ? geojson.features ?? []
      : geojson?.type === "Feature"
        ? [geojson]
        : [];

  let firstCoord: [number, number] | null = null;
  let lastCoord: [number, number] | null = null;

  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;
    const coords: [number, number][] =
      geom.type === "LineString"
        ? geom.coordinates
        : geom.type === "MultiLineString"
          ? geom.coordinates.flat()
          : [];
    if (coords.length === 0) continue;
    if (!firstCoord) firstCoord = coords[0];
    lastCoord = coords[coords.length - 1];
  }

  if (firstCoord && lastCoord) return { start: firstCoord, end: lastCoord };
  return null;
}

function addLineEnhancements(map: mapboxgl.Map, src: string, color: string, lineWidth: number, geojson: any) {
  // Glow layer (rendered before main line)
  map.addLayer({
    id: `${src}-glow`,
    type: "line",
    source: src,
    filter: ["any",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["geometry-type"], "MultiLineString"],
    ],
    paint: {
      "line-color": color,
      "line-width": lineWidth * 3,
      "line-opacity": 0.15,
      "line-blur": 4,
    },
  });

  // Directional arrows
  // Ensure the arrow image exists
  if (!map.hasImage("route-arrow")) {
    // Create a simple triangle arrow image
    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(size - 2, size / 2);
    ctx.lineTo(2, size - 2);
    ctx.closePath();
    ctx.fill();
    map.addImage("route-arrow", ctx.getImageData(0, 0, size, size), {
      pixelRatio: 2,
      sdf: true,
    });
  }

  map.addLayer({
    id: `${src}-arrows`,
    type: "symbol",
    source: src,
    filter: ["any",
      ["==", ["geometry-type"], "LineString"],
      ["==", ["geometry-type"], "MultiLineString"],
    ],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 80,
      "icon-image": "route-arrow",
      "icon-size": 0.6,
      "icon-allow-overlap": true,
      "icon-rotation-alignment": "map",
    },
    paint: {
      "icon-color": color,
      "icon-opacity": 0.7,
    },
  });

  // Start / end markers
  const endpoints = extractLineEndpoints(geojson);
  if (endpoints) {
    const endpointsSrc = `${src}-endpoints`;
    map.addSource(endpointsSrc, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { role: "start" }, geometry: { type: "Point", coordinates: endpoints.start } },
          { type: "Feature", properties: { role: "end" }, geometry: { type: "Point", coordinates: endpoints.end } },
        ],
      },
    });

    map.addLayer({
      id: `${endpointsSrc}-start`,
      type: "circle",
      source: endpointsSrc,
      filter: ["==", ["get", "role"], "start"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#22c55e",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 1,
      },
    });

    map.addLayer({
      id: `${endpointsSrc}-end`,
      type: "circle",
      source: endpointsSrc,
      filter: ["==", ["get", "role"], "end"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#ef4444",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 1,
      },
    });
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

  // Collect features
  const features: any[] =
    geojson?.type === "FeatureCollection"
      ? geojson.features ?? []
      : geojson?.type === "Feature"
        ? [geojson]
        : [];

  // Track which geometry kinds we've already added a layer for
  let lineAdded = false;
  let fillAdded = false;
  let circleAdded = false;

  for (const feature of features) {
    const kind = classifyGeomType(feature?.geometry?.type);

    if (kind === "line" && !lineAdded) {
      lineAdded = true;
      const lineColor = (style["line-color"] as string) ?? color;
      const lineWidth = (style["line-width"] as number) ?? 2;

      // Add glow + arrows + endpoints before the main line
      addLineEnhancements(map, src, lineColor, lineWidth, geojson);

      map.addLayer({
        id: `${src}-line`,
        type: "line",
        source: src,
        filter: ["any",
          ["==", ["geometry-type"], "LineString"],
          ["==", ["geometry-type"], "MultiLineString"],
        ],
        paint: {
          "line-color": lineColor,
          "line-width": lineWidth,
          "line-opacity": (style["line-opacity"] as number) ?? 0.8,
        },
      });
    } else if (kind === "polygon" && !fillAdded) {
      fillAdded = true;
      map.addLayer({
        id: `${src}-fill`,
        type: "fill",
        source: src,
        filter: ["any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"],
        ],
        paint: {
          "fill-color": (style["fill-color"] as string) ?? color,
          "fill-opacity": (style["fill-opacity"] as number) ?? 0.2,
        },
      });
      map.addLayer({
        id: `${src}-stroke`,
        type: "line",
        source: src,
        filter: ["any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"],
        ],
        paint: {
          "line-color": (style["line-color"] as string) ?? color,
          "line-width": (style["line-width"] as number) ?? 1.5,
          "line-opacity": (style["line-opacity"] as number) ?? 0.7,
        },
      });
    } else if (kind === "point" && !circleAdded) {
      circleAdded = true;
      map.addLayer({
        id: `${src}-circle`,
        type: "circle",
        source: src,
        filter: ["any",
          ["==", ["geometry-type"], "Point"],
          ["==", ["geometry-type"], "MultiPoint"],
        ],
        paint: {
          "circle-color": (style["circle-color"] as string) ?? color,
          "circle-radius": (style["circle-radius"] as number) ?? 5,
          "circle-opacity": (style["circle-opacity"] as number) ?? 0.8,
        },
      });
    }
  }

  // Fallback: if FeatureCollection was empty or bare geometry
  if (!lineAdded && !fillAdded && !circleAdded) {
    const kind = classifyGeomType(geojson?.type);
    if (kind === "line") {
      const lineColor = (style["line-color"] as string) ?? color;
      const lineWidth = (style["line-width"] as number) ?? 2;
      addLineEnhancements(map, src, lineColor, lineWidth, geojson);
      map.addLayer({
        id: `${src}-line`,
        type: "line",
        source: src,
        paint: {
          "line-color": lineColor,
          "line-width": lineWidth,
          "line-opacity": (style["line-opacity"] as number) ?? 0.8,
        },
      });
    }
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

/* ── label layers ────────────────────────────────────── */

function syncLabelLayers(
  map: mapboxgl.Map,
  overlays: OverlayRow[],
  _activeIds: string[],
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
      if (map.getLayer(lblId)) continue;
      if (!map.getSource(src)) continue;

      const primaryType = getPrimaryGeometryType(overlay.geojson as any);

      map.addLayer({
        id: lblId,
        type: "symbol",
        source: src,
        layout: {
          "text-field": overlay.name,
          "text-size": 13,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "symbol-placement": primaryType === "line" ? "line" : "point",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          ...(primaryType === "line" ? { "text-max-angle": 30 } : {}),
        },
        paint: {
          "text-color": "#f0e0b0",
          "text-halo-color": "#1a1208",
          "text-halo-width": 1.5,
          "text-opacity": 0.9,
        },
      });
    } else {
      if (map.getLayer(lblId)) {
        map.removeLayer(lblId);
      }
    }
  }
}
