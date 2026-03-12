import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "@/store/mapStore";
import type { LocationPin } from "@/hooks/usePins";

const ICON_MAP: Record<string, string> = {
  city: "🏙",
  mountain: "⛰",
  region: "◈",
  sea: "🌊",
  river: "〜",
  battle: "⚔",
  event: "📌",
  people: "👥",
};

function createMarkerEl(pin: LocationPin, isSelected: boolean, showLabel: boolean): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "pin-marker-wrapper";
  wrapper.style.cursor = "pointer";

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

  // Tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "pin-tooltip";
  tooltip.textContent = pin.name_ancient;
  tooltip.style.cssText = `
    position: absolute; bottom: 36px; left: 50%;
    transform: translateX(-50%);
    background: #1a1208; color: #e8d5a0;
    border: 1px solid #8a6040;
    padding: 3px 8px; border-radius: 4px;
    font-size: 11px; white-space: nowrap;
    pointer-events: none; opacity: ${showLabel ? "1" : "0"};
    transition: opacity 0.15s;
    z-index: 10;
  `;
  wrapper.appendChild(tooltip);

  if (!showLabel) {
    wrapper.addEventListener("mouseenter", () => { tooltip.style.opacity = "1"; });
    wrapper.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });
  }

  return wrapper;
}

function createPopupHTML(pin: LocationPin): string {
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
        <button class="pin-popup-close" style="background:none;border:none;color:#a08a60;font-size:18px;cursor:pointer;padding:0 2px;line-height:1;">×</button>
      </div>
      ${pin.description ? `<p style="font-size:12px;margin-top:8px;line-height:1.5;color:#c8b888;">${pin.description}</p>` : ""}
      ${verse}
    </div>
  `;
}

export function usePinMarkers(
  map: mapboxgl.Map | null,
  pins: LocationPin[],
  selectedPinId: string | null,
  onSelectPin: (id: string | null) => void
) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const showAllLabels = useMapStore((s) => s.showAllLabels);

  // Sync markers
  useEffect(() => {
    if (!map || !map.getContainer()) return;

    const currentIds = new Set(pins.map((p) => p.id));
    const existingIds = markersRef.current;

    // Remove old markers
    for (const [id, marker] of existingIds) {
      if (!currentIds.has(id)) {
        marker.remove();
        existingIds.delete(id);
      }
    }

    // Add/update markers
    for (const pin of pins) {
      if (existingIds.has(pin.id)) {
        // Update selection state and label visibility
        const marker = existingIds.get(pin.id)!;
        const el = marker.getElement().querySelector("div") as HTMLDivElement | null;
        if (el) {
          el.style.boxShadow = selectedPinId === pin.id ? "0 0 14px #c8a02066" : "";
        }
        const tooltip = marker.getElement().querySelector(".pin-tooltip") as HTMLDivElement | null;
        if (tooltip) {
          tooltip.style.opacity = showAllLabels ? "1" : "0";
        }
        continue;
      }

      const el = createMarkerEl(pin, selectedPinId === pin.id, showAllLabels);

      try {
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom-left" })
          .setLngLat(pin.coordinates)
          .addTo(map);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPin(pin.id);

        // Show popup
        popupRef.current?.remove();
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: "280px",
          className: "pin-popup-container",
        })
          .setLngLat(pin.coordinates)
          .setHTML(createPopupHTML(pin))
          .addTo(map);

        // Close button handler
        setTimeout(() => {
          const closeBtn = document.querySelector(".pin-popup-close");
          closeBtn?.addEventListener("click", () => {
            popup.remove();
            onSelectPin(null);
          });
        }, 0);

        popupRef.current = popup;
      });

      existingIds.set(pin.id, marker);
    }

    // Map click clears selection
    const onMapClick = () => {
      popupRef.current?.remove();
      popupRef.current = null;
      onSelectPin(null);
    };
    map.on("click", onMapClick);

    return () => {
      map.off("click", onMapClick);
    };
  }, [map, pins, selectedPinId, onSelectPin, showAllLabels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      popupRef.current?.remove();
    };
  }, []);
}
