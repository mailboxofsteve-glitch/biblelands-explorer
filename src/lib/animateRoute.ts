import mapboxgl from "mapbox-gl";

export interface AnimateRouteOptions {
  color?: string;
  duration?: number;
  lineWidth?: number;
  segmentIndices?: number[];
  onComplete?: () => void;
}

interface AnimationState {
  cancel: () => void;
}

let animCounter = 0;
const ARROW_IMAGE_ID = "__conveyor-arrow";

/**
 * Registers a small chevron arrow image on the map for use in symbol layers.
 */
function ensureArrowImage(map: mapboxgl.Map, color: string) {
  const id = `${ARROW_IMAGE_ID}-${color.replace("#", "")}`;
  if (map.hasImage(id)) return id;

  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw a right-pointing chevron/triangle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(14, 8);
  ctx.lineTo(2, 14);
  ctx.closePath();
  ctx.fill();

  map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  return id;
}

/**
 * Computes bearing in degrees from point a to point b (geographic coords).
 */
function bearing(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  // atan2 gives angle from positive x-axis; convert to map bearing (0=north, CW)
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return angle;
}

/**
 * Draws a route with a conveyor-belt arrow animation.
 * The full line is shown immediately; evenly-spaced arrows slide along the path.
 */
export function animateRoute(
  map: mapboxgl.Map,
  geojson: GeoJSON.GeoJSON,
  options: AnimateRouteOptions = {}
): AnimationState {
  const {
    color = "#e6a817",
    duration,
    lineWidth = 3,
    segmentIndices,
    onComplete,
  } = options;

  const id = `anim-route-${++animCounter}`;
  const sourceId = `${id}-src`;
  const layerId = `${id}-line`;
  const glowLayerId = `${id}-glow`;
  const arrowSourceId = `${id}-arrows-src`;
  const arrowLayerId = `${id}-arrows`;
  const startSourceId = `${id}-start-src`;
  const startLayerId = `${id}-start`;
  const endSourceId = `${id}-end-src`;
  const endLayerId = `${id}-end`;

  const rawCoords = extractCoordinates(geojson, segmentIndices);
  const coords = densifyCoordinates(rawCoords, 0.05);

  if (coords.length < 2) {
    onComplete?.();
    return { cancel: () => {} };
  }

  let cancelled = false;
  let rafId: number | null = null;

  // Precompute bearings for every segment
  const bearings: number[] = [];
  for (let i = 0; i < coords.length; i++) {
    const next = i < coords.length - 1 ? i + 1 : i;
    bearings.push(bearing(coords[i], coords[next]));
  }

  // Full line data
  const lineData: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };

  // Arrow spacing: one arrow every ARROW_SPACING points
  const ARROW_SPACING = 10;
  const arrowCount = Math.max(1, Math.floor(coords.length / ARROW_SPACING));

  // Build arrow GeoJSON
  function buildArrowFeatures(offset: number): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < arrowCount; i++) {
      const rawIdx = (i * ARROW_SPACING + offset) % coords.length;
      const idx = Math.floor(rawIdx);
      const frac = rawIdx - idx;
      const nextIdx = (idx + 1) % coords.length;

      // Interpolate position
      const lng = coords[idx][0] + (coords[nextIdx][0] - coords[idx][0]) * frac;
      const lat = coords[idx][1] + (coords[nextIdx][1] - coords[idx][1]) * frac;

      features.push({
        type: "Feature",
        properties: { bearing: bearings[idx] },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
    return features;
  }

  const arrowData: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: buildArrowFeatures(0),
  };

  // Register arrow image
  const arrowImageId = ensureArrowImage(map, color);

  // Add sources
  map.addSource(sourceId, { type: "geojson", data: lineData });
  map.addSource(arrowSourceId, { type: "geojson", data: arrowData });
  map.addSource(startSourceId, {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coords[0] } },
  });
  map.addSource(endSourceId, {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coords[coords.length - 1] } },
  });

  // Glow line
  map.addLayer({
    id: glowLayerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": color,
      "line-width": lineWidth * 3,
      "line-opacity": 0.15,
      "line-blur": 6,
    },
  });

  // Main line
  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": color,
      "line-width": lineWidth,
      "line-opacity": 0.9,
    },
  });

  // Start marker (green)
  map.addLayer({
    id: startLayerId,
    type: "circle",
    source: startSourceId,
    paint: {
      "circle-radius": 5,
      "circle-color": "#22c55e",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 1,
    },
  });

  // End marker (red)
  map.addLayer({
    id: endLayerId,
    type: "circle",
    source: endSourceId,
    paint: {
      "circle-radius": 5,
      "circle-color": "#ef4444",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 1,
    },
  });

  // Arrow symbol layer
  map.addLayer({
    id: arrowLayerId,
    type: "symbol",
    source: arrowSourceId,
    layout: {
      "icon-image": arrowImageId,
      "icon-size": 0.9,
      "icon-rotate": ["get", "bearing"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": 0.85,
    },
  });

  // Animation loop — conveyor belt
  let offset = 0;
  const SPEED = 0.15; // points per frame
  const startTime = performance.now();

  function tick() {
    if (cancelled) return;

    offset = (offset + SPEED) % coords.length;

    arrowData.features = buildArrowFeatures(offset);
    const src = map.getSource(arrowSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(arrowData);

    // If duration is set, auto-stop after that time
    if (duration && performance.now() - startTime >= duration) {
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  function cleanup() {
    const layerIds = [arrowLayerId, endLayerId, startLayerId, layerId, glowLayerId];
    const sourceIds = [arrowSourceId, endSourceId, startSourceId, sourceId];

    for (const lid of layerIds) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    for (const sid of sourceIds) {
      if (map.getSource(sid)) map.removeSource(sid);
    }
  }

  return {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      cleanup();
    },
  };
}

/* ── Coordinate extraction ──────────────────────────── */

function extractCoordinates(
  geojson: GeoJSON.GeoJSON,
  segmentIndices?: number[]
): [number, number][] {
  const features: GeoJSON.Feature[] = [];

  if (geojson.type === "FeatureCollection") {
    if (segmentIndices && segmentIndices.length > 0) {
      for (const i of segmentIndices) {
        if (geojson.features[i]) features.push(geojson.features[i]);
      }
    } else {
      features.push(...geojson.features);
    }
  } else if (geojson.type === "Feature") {
    features.push(geojson);
  }

  const allCoords: [number, number][] = [];

  for (const feature of features) {
    const geom = feature.geometry;
    if (geom.type === "LineString") {
      allCoords.push(...(geom.coordinates as [number, number][]));
    } else if (geom.type === "MultiLineString") {
      for (const line of geom.coordinates) {
        allCoords.push(...(line as [number, number][]));
      }
    }
  }

  return allCoords;
}

/* ── Coordinate densification ───────────────────────── */

function densifyCoordinates(
  coords: [number, number][],
  maxGap: number = 0.1
): [number, number][] {
  if (coords.length < 2) return coords;

  const result: [number, number][] = [coords[0]];

  for (let i = 0; i < coords.length - 1; i++) {
    const from = coords[i];
    const to = coords[i + 1];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxGap) {
      const segments = Math.ceil(dist / maxGap);
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        result.push([from[0] + dx * t, from[1] + dy * t]);
      }
    }

    result.push(to);
  }

  return result;
}

/* ── Cleanup all animation layers ────────────────────── */

export function cleanupAllAnimationLayers(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;

  const layerIds = style.layers
    .filter((l) => l.id.startsWith("anim-route-"))
    .map((l) => l.id);

  for (const id of layerIds) {
    if (map.getLayer(id)) map.removeLayer(id);
  }

  const sources = style.sources ?? {};
  for (const srcId of Object.keys(sources)) {
    if (srcId.startsWith("anim-route-") && map.getSource(srcId)) {
      map.removeSource(srcId);
    }
  }
}

/* ── Sequential animation ───────────────────────────── */

export function animateRoutesSequentially(
  map: mapboxgl.Map,
  routes: { geojson: GeoJSON.GeoJSON; color: string }[],
  options: { duration?: number; pauseMs?: number; loop?: boolean; onAllComplete?: () => void } = {}
): { cancel: () => void } {
  const { duration = 3000, pauseMs = 400, loop = false, onAllComplete } = options;
  let currentIndex = 0;
  let currentAnim: AnimationState | null = null;
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function playNext() {
    if (cancelled) return;
    if (currentIndex >= routes.length) {
      if (loop) {
        currentIndex = 0;
        timeoutId = setTimeout(playNext, pauseMs);
        return;
      }
      onAllComplete?.();
      return;
    }

    const route = routes[currentIndex];
    currentIndex++;

    currentAnim = animateRoute(map, route.geojson, {
      color: route.color,
      duration,
      onComplete: () => {
        if (cancelled) return;
        timeoutId = setTimeout(playNext, pauseMs);
      },
    });
  }

  playNext();

  return {
    cancel: () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      currentAnim?.cancel();
    },
  };
}
