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

/**
 * Progressively draws a LineString on the map with a glowing head marker.
 * Returns { cancel } to abort mid-animation.
 */
export function animateRoute(
  map: mapboxgl.Map,
  geojson: GeoJSON.GeoJSON,
  options: AnimateRouteOptions = {}
): AnimationState {
  const {
    color = "#e6a817",
    duration = 3000,
    lineWidth = 3,
    segmentIndices,
    onComplete,
  } = options;

  const id = `anim-route-${++animCounter}`;
  const sourceId = `${id}-src`;
  const layerId = `${id}-line`;
  const glowLayerId = `${id}-glow`;
  const headSourceId = `${id}-head-src`;
  const headLayerId = `${id}-head`;
  const headGlowLayerId = `${id}-head-glow`;

  // Extract coordinates and densify for smooth animation
  const rawCoords = extractCoordinates(geojson, segmentIndices);
  const coords = densifyCoordinates(rawCoords, 0.1);

  if (coords.length < 2) {
    onComplete?.();
    return { cancel: () => {} };
  }

  let cancelled = false;
  let rafId: number | null = null;

  const lineData: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: [coords[0]] },
  };

  const headData: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coords[0] },
  };

  const startSourceId = `${id}-start-src`;
  const startLayerId = `${id}-start`;
  const endSourceId = `${id}-end-src`;
  const endLayerId = `${id}-end`;

  const startData: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coords[0] },
  };

  const endData: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coords[coords.length - 1] },
  };

  map.addSource(sourceId, { type: "geojson", data: lineData });
  map.addSource(headSourceId, { type: "geojson", data: headData });
  map.addSource(startSourceId, { type: "geojson", data: startData });

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

  // Persistent green start marker
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

  map.addLayer({
    id: headGlowLayerId,
    type: "circle",
    source: headSourceId,
    paint: {
      "circle-radius": 10,
      "circle-color": color,
      "circle-opacity": 0.25,
      "circle-blur": 1,
    },
  });

  map.addLayer({
    id: headLayerId,
    type: "circle",
    source: headSourceId,
    paint: {
      "circle-radius": 4,
      "circle-color": color,
      "circle-opacity": 1,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  const totalSegments = coords.length - 1;
  const startTime = performance.now();

  function tick(now: number) {
    if (cancelled) return;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const floatIndex = progress * totalSegments;
    const segIndex = Math.min(Math.floor(floatIndex), totalSegments - 1);
    const segFraction = floatIndex - segIndex;

    const drawn = coords.slice(0, segIndex + 1);

    const from = coords[segIndex];
    const to = coords[segIndex + 1];

    if (from && to) {
      const interpPoint: [number, number] = [
        from[0] + (to[0] - from[0]) * segFraction,
        from[1] + (to[1] - from[1]) * segFraction,
      ];
      drawn.push(interpPoint);
      headData.geometry.coordinates = interpPoint;
    } else {
      headData.geometry.coordinates = coords[coords.length - 1];
    }

    lineData.geometry.coordinates = drawn;

    const lineSrc = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    const headSrc = map.getSource(headSourceId) as mapboxgl.GeoJSONSource | undefined;

    if (lineSrc) lineSrc.setData(lineData);
    if (headSrc) headSrc.setData(headData);

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        cleanup(true);
        // Add red end marker
        try {
          map.addSource(endSourceId, { type: "geojson", data: endData });
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
        } catch (_) { /* map may be gone */ }
        onComplete?.();
      }, 400);
    }
  }

  rafId = requestAnimationFrame(tick);

  function cleanup(keepLine = false) {
    if (map.getLayer(headGlowLayerId)) map.removeLayer(headGlowLayerId);
    if (map.getLayer(headLayerId)) map.removeLayer(headLayerId);
    if (map.getSource(headSourceId)) map.removeSource(headSourceId);

    if (!keepLine) {
      if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }

  return {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      cleanup(false);
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

/**
 * Inserts additional points between sparse waypoints via linear interpolation.
 * `maxGap` is the maximum distance (in degrees) between consecutive points.
 * Roughly 0.1° ≈ 11 km at the equator.
 */
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

/**
 * Removes all animation-generated sources and layers from the map.
 * Call before loading a new scene to prevent stale route artifacts.
 */
export function cleanupAllAnimationLayers(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;

  const layerIds = style.layers
    .filter((l) => l.id.startsWith("anim-route-"))
    .map((l) => l.id);

  for (const id of layerIds) {
    if (map.getLayer(id)) map.removeLayer(id);
  }

  // Remove matching sources
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
