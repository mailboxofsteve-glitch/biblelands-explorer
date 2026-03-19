import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "@/store/mapStore";
import type { LocationPin } from "@/hooks/usePins";

const SOURCE_ID = "pin-clusters";
const CLUSTER_LAYER = "pin-cluster-circles";
const CLUSTER_COUNT_LAYER = "pin-cluster-count";

const ICON_MAP: Record<string, string> = {
  city: "🏙",
  mountain: "⛰",
  region: "◈",
  sea: "🌊",
  river: "〜",
  battle: "⚔",
  event: "📌",
  people: "👥",
  poi: "❗",
};

/* ── helpers ─────────────────────────────────────────────── */

function pinsToGeoJSON(pins: LocationPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: pin.coordinates },
      properties: { id: pin.id },
    })),
  };
}

function createMarkerEl(
  pin: LocationPin,
  isSelected: boolean,
  showLabel: boolean,
  isHidden: boolean,
  labelFontSize: number
): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "pin-marker-wrapper";
  wrapper.style.cursor = "pointer";
  wrapper.style.opacity = isHidden ? "0.3" : "1";
  wrapper.style.transition = "opacity 0.2s";

  const el = document.createElement("div");
  el.style.cssText = `
    width: 28px; height: 28px;
    background: #2a1e0e;
    border: 2px solid #8a6040;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    transition: box-shadow 0.2s;
    ${isSelected ? "box-shadow: 0 0 14px #c8a02066;" : ""}
  `;

  const icon = document.createElement("span");
  icon.style.cssText = `
    transform: rotate(45deg);
    font-size: 13px;
    line-height: 1;
    user-select: none;
  `;
  icon.textContent = ICON_MAP[pin.location_type ?? "city"] ?? "🏙";

  el.appendChild(icon);
  wrapper.appendChild(el);

  const tooltip = document.createElement("div");
  tooltip.className = "pin-tooltip";
  tooltip.textContent = pin.name_ancient;
  tooltip.style.cssText = `
    position: absolute; bottom: 36px; left: 50%;
    transform: translateX(-50%);
    color: #3a2a1a;
    font-size: ${11 * labelFontSize}px; white-space: nowrap;
    pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.3);
    opacity: ${showLabel ? "1" : "0"};
    transition: opacity 0.15s;
    z-index: 10;
  `;
  wrapper.appendChild(tooltip);

  if (!showLabel) {
    wrapper.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
    });
    wrapper.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });
  }

  return wrapper;
}

function createPopupHTML(pin: LocationPin): string {
  const hiddenIds = useMapStore.getState().hiddenLocationIds;
  const isHidden = hiddenIds.includes(pin.id);
  const verse = pin.primary_verse
    ? `<div style="border:1px solid #c8a020;border-radius:6px;padding:8px 10px;margin-top:8px;font-style:italic;font-size:12px;color:#e8d5a0;background:#2a1e0e44;">
        📖 ${pin.primary_verse}
       </div>`
    : "";

  return `
    <div style="background:#1a1208;border:1px solid #c8a020;border-radius:10px;max-width:260px;padding:14px;color:#e8d5a0;font-family:serif;">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <div style="font-size:15px;font-weight:600;color:#f0e0b0;">${pin.name_ancient}</div>
          ${pin.name_modern ? `<div style="font-size:11px;color:#a08a60;margin-top:2px;">${pin.name_modern}</div>` : ""}
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="pin-popup-hide" title="${isHidden ? "Show in classroom" : "Hide in classroom"}" style="background:none;border:none;color:${isHidden ? "#c8a020" : "#a08a60"};font-size:14px;cursor:pointer;padding:2px;line-height:1;">
            ${isHidden ? "👁" : "👁‍🗨"}
          </button>
          <button class="pin-popup-close" style="background:none;border:none;color:#a08a60;font-size:18px;cursor:pointer;padding:0 2px;line-height:1;">×</button>
        </div>
      </div>
      ${pin.description ? `<p style="font-size:12px;margin-top:8px;line-height:1.5;color:#c8b888;">${pin.description}</p>` : ""}
      ${isHidden ? `<div style="font-size:10px;color:#a08a60;margin-top:6px;font-style:italic;">🚫 Hidden in classroom mode</div>` : ""}
      ${verse}
    </div>
  `;
}

/* ── cluster layers ──────────────────────────────────────── */

function addClusterLayers(map: mapboxgl.Map) {
  if (map.getLayer(CLUSTER_LAYER)) return;

  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#2a1e0e",
      "circle-stroke-color": "#8a6040",
      "circle-stroke-width": 2,
      "circle-radius": [
        "step",
        ["get", "point_count"],
        15, // default (< 10)
        10,
        20, // 10–49
        50,
        25, // 50+
      ],
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#e8d5a0",
    },
  });
}

function removeClusterLayers(map: mapboxgl.Map) {
  if (map.getLayer(CLUSTER_COUNT_LAYER)) map.removeLayer(CLUSTER_COUNT_LAYER);
  if (map.getLayer(CLUSTER_LAYER)) map.removeLayer(CLUSTER_LAYER);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

/* ── main hook ───────────────────────────────────────────── */

export function usePinMarkers(
  map: mapboxgl.Map | null,
  pins: LocationPin[],
  selectedPinId: string | null,
  onSelectPin: (id: string | null) => void,
  hiddenLocationIds: string[] = [],
  presenting: boolean = false
) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const labelFontSize = useMapStore((s) => s.labelFontSize);
  const listenersRef = useRef<{
    moveend?: () => void;
    clusterClick?: (e: mapboxgl.MapMouseEvent) => void;
    mapClick?: () => void;
    cursorEnter?: () => void;
    cursorLeave?: () => void;
  }>({});

  // Build a pin lookup
  const pinMapRef = useRef<Map<string, LocationPin>>(new Map());
  useEffect(() => {
    const m = new Map<string, LocationPin>();
    for (const p of pins) m.set(p.id, p);
    pinMapRef.current = m;
  }, [pins]);

  // Determine visible pins (filter hidden in presentation)
  const getVisiblePins = useCallback(() => {
    const hiddenSet = new Set(hiddenLocationIds);
    if (presenting) return pins.filter((p) => !hiddenSet.has(p.id));
    return pins;
  }, [pins, hiddenLocationIds, presenting]);

  // Sync unclustered HTML markers based on current map viewport
  const syncUnclusteredMarkers = useCallback(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const hiddenSet = new Set(hiddenLocationIds);

    // Query which features are unclustered (visible on screen, not in a cluster)
    const features = map.querySourceFeatures(SOURCE_ID, {
      filter: ["!", ["has", "point_count"]],
    });

    const visibleIds = new Set<string>();
    for (const f of features) {
      const id = f.properties?.id as string;
      if (id) visibleIds.add(id);
    }

    // Remove markers no longer visible or now clustered
    for (const [id, marker] of markersRef.current) {
      if (!visibleIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add/update markers for unclustered pins
    for (const id of visibleIds) {
      const pin = pinMapRef.current.get(id);
      if (!pin) continue;

      const isHidden = hiddenSet.has(pin.id);

      if (markersRef.current.has(id)) {
        // Update existing marker
        const marker = markersRef.current.get(id)!;
        const wrapper = marker.getElement();
        if (wrapper) {
          (wrapper as HTMLElement).style.opacity = isHidden ? "0.3" : "1";
        }
        const el = wrapper.querySelector("div") as HTMLDivElement | null;
        if (el) {
          el.style.boxShadow = selectedPinId === id ? "0 0 14px #c8a02066" : "";
        }
        const tooltip = wrapper.querySelector(".pin-tooltip") as HTMLDivElement | null;
        if (tooltip) {
          if (showAllLabels) tooltip.style.opacity = "1";
          tooltip.style.fontSize = `${11 * labelFontSize}px`;
        }
        continue;
      }

      // Create new marker
      const el = createMarkerEl(pin, selectedPinId === pin.id, showAllLabels, isHidden, labelFontSize);

      let marker: mapboxgl.Marker;
      try {
        marker = new mapboxgl.Marker({ element: el, anchor: "bottom-left" })
          .setLngLat(pin.coordinates)
          .addTo(map);
      } catch {
        continue;
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPin(pin.id);

        popupRef.current?.remove();
        try {
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: "280px",
            className: "pin-popup-container",
          })
            .setLngLat(pin.coordinates)
            .setHTML(createPopupHTML(pin))
            .addTo(map);

          setTimeout(() => {
            const closeBtn = document.querySelector(".pin-popup-close");
            closeBtn?.addEventListener("click", () => {
              popup.remove();
              onSelectPin(null);
            });
            const hideBtn = document.querySelector(".pin-popup-hide");
            hideBtn?.addEventListener("click", () => {
              useMapStore.getState().toggleHideLocation(pin.id);
            });
          }, 0);

          popupRef.current = popup;
        } catch {
          // Map container gone
        }
      });

      markersRef.current.set(id, marker);
    }
  }, [map, selectedPinId, onSelectPin, showAllLabels, hiddenLocationIds, presenting, labelFontSize]);

  // Main effect: manage source, layers, and listeners
  useEffect(() => {
    if (!map || !map.getContainer()) return;

    const visiblePins = getVisiblePins();
    const geojson = pinsToGeoJSON(visiblePins);

    // Clean up previous listeners
    const prev = listenersRef.current;
    if (prev.moveend) map.off("moveend", prev.moveend);
    if (prev.clusterClick) map.off("click", CLUSTER_LAYER, prev.clusterClick);
    if (prev.mapClick) map.off("click", prev.mapClick);
    if (prev.cursorEnter) map.off("mouseenter", CLUSTER_LAYER, prev.cursorEnter);
    if (prev.cursorLeave) map.off("mouseleave", CLUSTER_LAYER, prev.cursorLeave);

    // Source: create or update
    const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      try {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      } catch {
        return;
      }
    }

    // Layers
    addClusterLayers(map);

    // Clear all existing HTML markers (they'll be re-created by syncUnclusteredMarkers)
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    // Cluster click → zoom in
    const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: zoom + 0.5 });
      });
    };

    // Map click clears selection
    const onMapClick = () => {
      popupRef.current?.remove();
      popupRef.current = null;
      onSelectPin(null);
    };

    // Cursor style on cluster hover
    const onCursorEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onCursorLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    // Sync unclustered markers on move
    const onMoveEnd = () => syncUnclusteredMarkers();

    map.on("click", CLUSTER_LAYER, onClusterClick);
    map.on("click", onMapClick);
    map.on("mouseenter", CLUSTER_LAYER, onCursorEnter);
    map.on("mouseleave", CLUSTER_LAYER, onCursorLeave);
    map.on("moveend", onMoveEnd);

    // Also sync once the source data is loaded
    const onSourceData = (e: mapboxgl.MapSourceDataEvent) => {
      if (e.sourceId === SOURCE_ID && e.isSourceLoaded) {
        syncUnclusteredMarkers();
        map.off("sourcedata", onSourceData);
      }
    };
    map.on("sourcedata", onSourceData);

    // Initial sync
    syncUnclusteredMarkers();

    listenersRef.current = {
      moveend: onMoveEnd,
      clusterClick: onClusterClick,
      mapClick: onMapClick,
      cursorEnter: onCursorEnter,
      cursorLeave: onCursorLeave,
    };

    return () => {
      map.off("click", CLUSTER_LAYER, onClusterClick);
      map.off("click", onMapClick);
      map.off("mouseenter", CLUSTER_LAYER, onCursorEnter);
      map.off("mouseleave", CLUSTER_LAYER, onCursorLeave);
      map.off("moveend", onMoveEnd);
      map.off("sourcedata", onSourceData);
    };
  }, [map, pins, selectedPinId, onSelectPin, showAllLabels, hiddenLocationIds, presenting, labelFontSize, getVisiblePins, syncUnclusteredMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      popupRef.current?.remove();
      if (map) {
        try {
          removeClusterLayers(map);
        } catch {
          // map already removed
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
