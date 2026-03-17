import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "@/store/mapStore";
import type { SceneTextbox } from "@/types";

export function useTextboxMarkers(
  map: mapboxgl.Map | null,
  presenting: boolean
) {
  const sceneTextboxes = useMapStore((s) => s.sceneTextboxes);
  const removeTextbox = useMapStore((s) => s.removeTextbox);
  const updateTextbox = useMapStore((s) => s.updateTextbox);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(sceneTextboxes.map((t) => t.id));

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Create / update markers — rebuild if content changed
    for (const tb of sceneTextboxes) {
      const existing = markersRef.current.get(tb.id);
      if (existing) {
        // Remove and recreate to pick up content/style changes
        existing.remove();
        markersRef.current.delete(tb.id);
      }

      const el = createTextboxEl(tb, presenting, () => removeTextbox(tb.id), () => {
        useMapStore.getState().setEditingTextbox(tb);
      });

      try {
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "top-left",
          draggable: !presenting,
        })
          .setLngLat([tb.lng, tb.lat])
          .addTo(map);

        if (!presenting) {
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            updateTextbox(tb.id, { lng: lngLat.lng, lat: lngLat.lat });
          });
        }

        markersRef.current.set(tb.id, marker);
      } catch {
        // map container may be absent
      }
    }
  }, [map, sceneTextboxes, presenting, removeTextbox, updateTextbox]);

  // Full re-render when presenting changes
  useEffect(() => {
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
  }, [presenting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
    };
  }, []);
}

function createTextboxEl(
  tb: SceneTextbox,
  presenting: boolean,
  onDelete: () => void,
  onEdit: () => void
): HTMLDivElement {
  const scale = tb.font_size ?? 1;
  const wrapper = document.createElement("div");
  wrapper.style.maxWidth = "240px";
  wrapper.style.minWidth = "140px";
  wrapper.style.padding = "10px 14px";
  wrapper.style.borderRadius = "8px";
  wrapper.style.backgroundColor = tb.fill_color;
  wrapper.style.opacity = String(tb.fill_opacity);
  wrapper.style.color = "#ffffff";
  wrapper.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
  wrapper.style.position = "relative";
  wrapper.style.cursor = presenting ? "default" : "grab";
  wrapper.style.pointerEvents = "auto";

  if (!presenting) {
    wrapper.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      onEdit();
    });
  }

  const heading = document.createElement("h4");
  heading.textContent = tb.heading;
  heading.style.fontWeight = "700";
  heading.style.fontSize = `${Math.round(13 * scale)}px`;
  heading.style.lineHeight = "1.3";
  heading.style.margin = "0";
  wrapper.appendChild(heading);

  if (tb.body) {
    const body = document.createElement("p");
    body.textContent = tb.body;
    body.style.fontSize = `${Math.round(11 * scale)}px`;
    body.style.marginTop = "4px";
    body.style.opacity = "0.9";
    body.style.lineHeight = "1.4";
    body.style.margin = "4px 0 0";
    wrapper.appendChild(body);
  }

  if (!presenting) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.style.position = "absolute";
    del.style.top = "2px";
    del.style.right = "6px";
    del.style.background = "none";
    del.style.border = "none";
    del.style.color = "#ffffff";
    del.style.fontSize = "16px";
    del.style.cursor = "pointer";
    del.style.opacity = "0.6";
    del.style.lineHeight = "1";
    del.addEventListener("mouseenter", () => (del.style.opacity = "1"));
    del.addEventListener("mouseleave", () => (del.style.opacity = "0.6"));
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      onDelete();
    });
    wrapper.appendChild(del);
  }

  return wrapper;
}
