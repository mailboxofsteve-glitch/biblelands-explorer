import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";
import { toast } from "sonner";
import type { CustomPin } from "@/hooks/useCustomPins";

const ICON_MAP: Record<string, string> = {
  city: "🏙",
  mountain: "⛰",
  region: "◈",
  sea: "🌊",
  river: "〜",
  tent: "⛺",
  temple: "🏛",
  battle: "⚔",
  well: "💧",
  star: "⭐",
  event: "📌",
  people: "👥",
};

function createMarkerEl(pin: CustomPin, isSelected: boolean, showLabel: boolean): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-pin-marker";
  wrapper.style.cursor = "pointer";

  const el = document.createElement("div");
  el.style.cssText = `
    width: 28px; height: 28px;
    background: #2a1e0e;
    border: 2px solid #c8a020;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    transition: box-shadow 0.2s;
    ${isSelected ? "box-shadow: 0 0 14px #c8a02088;" : ""}
  `;

  const icon = document.createElement("span");
  icon.style.cssText = `transform: rotate(45deg); font-size: 13px; line-height: 1; user-select: none;`;
  icon.textContent = ICON_MAP[pin.icon_type] ?? "📍";

  el.appendChild(icon);
  wrapper.appendChild(el);

  const tooltip = document.createElement("div");
  tooltip.className = "custom-pin-tooltip";
  tooltip.textContent = pin.label;
  tooltip.style.cssText = `
    position: absolute; bottom: 36px; left: 50%;
    transform: translateX(-50%);
    color: #3a2a1a;
    font-size: 11px; white-space: nowrap;
    pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.3);
    opacity: ${showLabel ? "1" : "0"};
    transition: opacity 0.15s; z-index: 10;
  `;
  wrapper.appendChild(tooltip);

  if (!showLabel) {
    wrapper.addEventListener("mouseenter", () => { tooltip.style.opacity = "1"; });
    wrapper.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });
  }

  return wrapper;
}

function createPopupHTML(pin: CustomPin): string {
  const refs = pin.scripture_refs?.length
    ? `<div style="border:1px solid #c8a020;border-radius:6px;padding:8px 10px;margin-top:8px;font-style:italic;font-size:12px;color:#e8d5a0;background:#2a1e0e44;">
        📖 ${pin.scripture_refs.join(", ")}
       </div>`
    : "";

  return `
    <div style="background:#1a1208;border:1px solid #c8a020;border-radius:10px;max-width:260px;padding:14px;color:#e8d5a0;font-family:serif;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
        <div style="font-size:15px;font-weight:600;color:#f0e0b0;">${pin.popup_title}</div>
        <div style="display:flex;gap:4px;align-items:center;shrink:0;">
          <button class="custom-pin-popup-delete" title="Delete pin" style="background:none;border:none;color:#e85050;font-size:14px;cursor:pointer;padding:2px;line-height:1;opacity:0.7;transition:opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">🗑</button>
          <button class="custom-pin-popup-close" style="background:none;border:none;color:#a08a60;font-size:18px;cursor:pointer;padding:0 2px;line-height:1;">×</button>
        </div>
      </div>
      ${pin.popup_body ? `<p style="font-size:12px;margin-top:8px;line-height:1.5;color:#c8b888;">${pin.popup_body}</p>` : ""}
      ${refs}
    </div>
  `;
}

export function useCustomPinMarkers(
  map: mapboxgl.Map | null,
  pins: CustomPin[],
  selectedPinId: string | null,
  onSelectPin: (id: string | null) => void
) {
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const labelFontSize = useMapStore((s) => s.labelFontSize);

  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(pins.map((p) => p.id));
    const existing = markersRef.current;

    // Remove stale
    for (const [id, marker] of existing) {
      if (!currentIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // Add / update
    for (const pin of pins) {
      if (existing.has(pin.id)) {
        const marker = existing.get(pin.id)!;
        const el = marker.getElement().querySelector("div") as HTMLDivElement | null;
        if (el) {
          el.style.boxShadow = selectedPinId === pin.id ? "0 0 14px #c8a02088" : "";
        }
        const tooltip = marker.getElement().querySelector(".custom-pin-tooltip") as HTMLDivElement | null;
        if (tooltip) {
          tooltip.style.opacity = showAllLabels ? "1" : "0";
          tooltip.style.fontSize = `${11 * labelFontSize}px`;
        }
        continue;
      }

      const el = createMarkerEl(pin, selectedPinId === pin.id, showAllLabels);
      const createdTooltip = el.querySelector(".custom-pin-tooltip") as HTMLDivElement | null;
      if (createdTooltip) createdTooltip.style.fontSize = `${11 * labelFontSize}px`;
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom-left" })
        .setLngLat(pin.coordinates)
        .addTo(map);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPin(pin.id);

        popupRef.current?.remove();
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: "280px",
          className: "custom-pin-popup-container",
        })
          .setLngLat(pin.coordinates)
          .setHTML(createPopupHTML(pin))
          .addTo(map);

        setTimeout(() => {
          document.querySelector(".custom-pin-popup-close")?.addEventListener("click", () => {
            popup.remove();
            onSelectPin(null);
          });

          document.querySelector(".custom-pin-popup-delete")?.addEventListener("click", async () => {
            const { error } = await supabase.from("pins").delete().eq("id", pin.id);
            if (error) {
              toast.error("Failed to delete pin");
              return;
            }
            useMapStore.getState().removeCustomPin(pin.id);
            marker.remove();
            existing.delete(pin.id);
            popup.remove();
            onSelectPin(null);
            toast.success(`Deleted "${pin.label}"`);
          });
        }, 0);

        popupRef.current = popup;
      });

      existing.set(pin.id, marker);
    }
  }, [map, pins, selectedPinId, onSelectPin, showAllLabels, labelFontSize]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      popupRef.current?.remove();
    };
  }, []);
}
