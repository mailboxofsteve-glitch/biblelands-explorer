import { useState, useEffect, useCallback, useRef } from "react";
import { useMapStore } from "@/store/mapStore";
import { useOverlays } from "@/hooks/useOverlays";
import { animateRoutesSequentially, cleanupAllAnimationLayers } from "@/lib/animateRoute";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
} from "lucide-react";
import GroundViewButton from "./GroundViewButton";
import type { MapCanvasHandle } from "./MapCanvas";
import type { LessonScene } from "@/types";

interface PresentationHUDProps {
  mapRef: React.RefObject<MapCanvasHandle | null>;
  onExit: () => void;
}

export default function PresentationHUD({ mapRef, onExit }: PresentationHUDProps) {
  const scenes = useMapStore((s) => s.scenes);
  const currentSceneIndex = useMapStore((s) => s.currentSceneIndex);
  const loadScene = useMapStore((s) => s.loadScene);
  const { allOverlays: overlays } = useOverlays();
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const toggleShowAllLabels = useMapStore((s) => s.toggleShowAllLabels);

  const [showNotes, setShowNotes] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const animCancelRef = useRef<(() => void) | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = scenes.length;
  const idx = currentSceneIndex ?? 0;
  const currentScene = scenes[idx] ?? null;

  const triggerRouteAnimation = useCallback(
    (scene: LessonScene) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const lineOverlays = overlays.filter((o) => {
        if (!scene.active_overlay_ids.includes(o.id)) return false;
        const geojson = o.geojson as any;
        const geomType =
          geojson?.type === "FeatureCollection"
            ? geojson.features?.[0]?.geometry?.type
            : geojson?.type === "Feature"
              ? geojson.geometry?.type
              : geojson?.type;
        return geomType?.toLowerCase().includes("line");
      });

      if (lineOverlays.length === 0) return;

      const routes = lineOverlays.map((o) => ({
        geojson: o.geojson as unknown as GeoJSON.GeoJSON,
        color: o.default_color,
      }));

      animCancelRef.current?.();
      const { cancel } = animateRoutesSequentially(map, routes, { duration: 3000, loop: true });
      animCancelRef.current = cancel;
    },
    [mapRef, overlays]
  );

  const goToScene = useCallback(
    (index: number) => {
      const map = mapRef.current?.getMap();
      if (!map || index < 0 || index >= total) return;

      // Clear any running auto-advance timer
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      setAutoProgress(0);

      // Clean up stale animation layers before loading new scene
      animCancelRef.current?.();
      animCancelRef.current = null;
      cleanupAllAnimationLayers(map);

      loadScene(index, map);

      const scene = scenes[index];
      // Always auto-play route animations in classroom mode
      setTimeout(() => triggerRouteAnimation(scene), 1400);

      // Auto-advance if scene has auto_advance_seconds
      if (scene?.auto_advance_seconds && scene.auto_advance_seconds > 0) {
        const totalMs = scene.auto_advance_seconds * 1000;
        const intervalMs = 50;
        let elapsed = 0;
        setAutoProgress(0);

        autoTimerRef.current = setInterval(() => {
          elapsed += intervalMs;
          const pct = Math.min((elapsed / totalMs) * 100, 100);
          setAutoProgress(pct);

          if (elapsed >= totalMs) {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current);
            autoTimerRef.current = null;
            // Auto-advance to next scene
            if (index + 1 < total) {
              goToScene(index + 1);
            }
          }
        }, intervalMs);
      }
    },
    [mapRef, total, loadScene, scenes, triggerRouteAnimation]
  );

  const next = useCallback(() => goToScene(idx + 1), [goToScene, idx]);
  const prev = useCallback(() => goToScene(idx - 1), [goToScene, idx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        onExit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev, onExit]);

  // Load first scene on mount if none loaded
  useEffect(() => {
    if (total > 0 && currentSceneIndex === null) {
      goToScene(0);
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      animCancelRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (total === 0) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
        <div className="pointer-events-auto bg-card/90 backdrop-blur-sm rounded-lg px-6 py-4 text-center border border-border/40">
          <p className="text-sm text-muted-foreground mb-3">No scenes saved yet.</p>
          <button
            onClick={onExit}
            className="text-xs px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Exit Presentation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Exit button — top right */}
      <button
        onClick={onExit}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/70 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/90 border border-border/30 transition-all text-xs"
      >
        <X size={14} />
        Exit
      </button>

      {/* Bottom HUD */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {/* Scene title */}
        {currentScene && (
          <div className="pointer-events-auto bg-card/80 backdrop-blur-sm rounded-lg px-4 py-1.5 border border-border/30">
            <p className="text-sm font-serif font-semibold text-foreground tracking-wide text-center">
              {currentScene.title}
            </p>
          </div>
        )}

        {/* Nav controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border/30 px-2 py-1.5">
          <button
            onClick={prev}
            disabled={idx <= 0}
            className="p-1.5 rounded hover:bg-secondary/50 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-xs text-muted-foreground px-3 select-none whitespace-nowrap">
            Scene {idx + 1} of {total}
          </span>

          <button
            onClick={next}
            disabled={idx >= total - 1}
            className="p-1.5 rounded hover:bg-secondary/50 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          <div className="w-px h-5 bg-border/40 mx-1" />

          <label className="flex items-center gap-1 cursor-pointer px-1" title="Show all labels">
            <span className="text-[10px] text-muted-foreground">Labels</span>
            <Switch
              checked={showAllLabels}
              onCheckedChange={toggleShowAllLabels}
              className="scale-[0.6]"
            />
          </label>

          <div className="w-px h-5 bg-border/40 mx-1" />

          <GroundViewButton mapRef={mapRef} compact />

          <div className="w-px h-5 bg-border/40 mx-1" />

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded transition-colors ${
              showNotes
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
            title="Toggle notes"
          >
            <ClipboardList size={16} />
          </button>
        </div>

        {/* Notes panel */}
        {showNotes && currentScene && (
          <div className="pointer-events-auto bg-card/85 backdrop-blur-sm rounded-lg border border-border/30 px-4 py-3 max-w-md w-[90vw]">
            <p className="text-xs text-muted-foreground italic">
              {(currentScene as any).notes || "No notes for this scene."}
            </p>
          </div>
        )}
      </div>

      {/* Auto-advance progress bar */}
      {autoProgress > 0 && autoProgress < 100 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <Progress
            value={autoProgress}
            className="h-1 rounded-none bg-transparent"
          />
        </div>
      )}
    </>
  );
}
