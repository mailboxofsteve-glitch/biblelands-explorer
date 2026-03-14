import { useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { MapCanvasHandle } from "./MapCanvas";

interface GroundViewButtonProps {
  mapRef: React.RefObject<MapCanvasHandle | null>;
  compact?: boolean;
}

export default function GroundViewButton({ mapRef, compact = false }: GroundViewButtonProps) {
  const [active, setActive] = useState(false);
  const [savedView, setSavedView] = useState<{
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  } | null>(null);

  const enterGroundView = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Save current view for restoring later
    const center = map.getCenter();
    setSavedView({
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    });

    // Increase terrain exaggeration for dramatic ground-level relief
    if (map.getSource("mapbox-dem")) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 3.0 });
    }

    // Add sky layer for atmosphere
    if (!map.getLayer("sky-atmosphere")) {
      try {
        map.addLayer({
          id: "sky-atmosphere",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 45.0],
            "sky-atmosphere-sun-intensity": 5,
          },
        });
      } catch {
        // layer may already exist after style reload
      }
    }

    // Fly to ground-level perspective
    map.flyTo({
      center: map.getCenter(),
      pitch: 80,
      zoom: Math.max(map.getZoom(), 14.5),
      bearing: map.getBearing(),
      duration: 2500,
      essential: true,
    });

    setActive(true);
  }, [mapRef]);

  const exitGroundView = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Restore default terrain exaggeration
    map.setTerrain({ source: "mapbox-dem", exaggeration: 2.0 });

    // Remove sky layer
    if (map.getLayer("sky-atmosphere")) {
      try {
        map.removeLayer("sky-atmosphere");
      } catch {
        // ignore
      }
    }

    // Fly back to saved view
    if (savedView) {
      map.flyTo({
        center: savedView.center as [number, number],
        zoom: savedView.zoom,
        pitch: savedView.pitch,
        bearing: savedView.bearing,
        duration: 2000,
        essential: true,
      });
    } else {
      map.flyTo({
        pitch: 0,
        zoom: 6,
        duration: 2000,
        essential: true,
      });
    }

    setSavedView(null);
    setActive(false);
  }, [mapRef, savedView]);

  const toggle = useCallback(() => {
    if (active) exitGroundView();
    else enterGroundView();
  }, [active, enterGroundView, exitGroundView]);

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`p-1.5 rounded transition-colors ${
          active
            ? "bg-accent/20 text-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
        title={active ? "Exit Ground View" : "Ground View"}
      >
        {active ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md backdrop-blur-sm border transition-all text-xs font-medium ${
        active
          ? "bg-accent/20 text-accent border-accent/40 hover:bg-accent/30"
          : "bg-card/80 text-muted-foreground hover:text-foreground hover:bg-card border-border/30"
      }`}
      title={active ? "Exit Ground View" : "Enter Ground View"}
    >
      {active ? <EyeOff size={14} /> : <Eye size={14} />}
      {active ? "Exit Ground" : "Ground View"}
    </button>
  );
}
