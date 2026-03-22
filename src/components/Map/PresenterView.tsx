import { useState, useEffect, useCallback, useRef } from "react";
import { useMapStore } from "@/store/mapStore";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  Clock,
} from "lucide-react";
import type { MapCanvasHandle } from "./MapCanvas";

const CHANNEL_NAME = "presentation_sync";

interface PresenterViewProps {
  mapRef: React.RefObject<MapCanvasHandle | null>;
  onExit: () => void;
}

export default function PresenterView({ mapRef, onExit }: PresenterViewProps) {
  const scenes = useMapStore((s) => s.scenes);
  const currentSceneIndex = useMapStore((s) => s.currentSceneIndex);
  const loadScene = useMapStore((s) => s.loadScene);

  const [elapsed, setElapsed] = useState(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const total = scenes.length;
  const idx = currentSceneIndex ?? 0;
  const currentScene = scenes[idx] ?? null;
  const nextScene = scenes[idx + 1] ?? null;

  // Open BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    return () => channelRef.current?.close();
  }, []);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const goToScene = useCallback(
    (index: number) => {
      const map = mapRef.current?.getMap();
      if (!map || index < 0 || index >= total) return;
      loadScene(index, map);
      channelRef.current?.postMessage({ type: "GO_TO_SCENE", index });
    },
    [mapRef, total, loadScene]
  );

  const next = useCallback(() => goToScene(idx + 1), [goToScene, idx]);
  const prev = useCallback(() => goToScene(idx - 1), [goToScene, idx]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); onExit(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev, onExit]);

  // Load first scene on mount
  useEffect(() => {
    if (total > 0 && currentSceneIndex === null) goToScene(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (total === 0) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
        <div className="pointer-events-auto bg-card/90 backdrop-blur-sm rounded-lg px-6 py-4 text-center border border-border/40">
          <p className="text-sm text-muted-foreground mb-3">No scenes saved yet.</p>
          <button
            onClick={onExit}
            className="text-xs px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Exit Presenter View
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Exit + timer — top right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/70 backdrop-blur-sm border border-border/30 text-xs text-muted-foreground">
          <Clock size={14} />
          {formatTime(elapsed)}
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/70 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/90 border border-border/30 transition-all text-xs"
        >
          <X size={14} />
          Exit
        </button>
      </div>

      {/* Bottom presenter console */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border/40 p-4">
        <div className="max-w-4xl mx-auto flex gap-6">
          {/* Current scene info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Current Scene
            </p>
            <p className="text-sm font-serif font-semibold text-foreground truncate">
              {currentScene?.title ?? "Untitled"}
            </p>
            <div className="mt-2 text-xs text-muted-foreground italic max-h-20 overflow-y-auto">
              <ClipboardList size={12} className="inline mr-1" />
              {(currentScene as any)?.notes || "No notes for this scene."}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                disabled={idx <= 0}
                className="p-2 rounded hover:bg-secondary/50 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-muted-foreground px-3 select-none whitespace-nowrap">
                {idx + 1} / {total}
              </span>
              <button
                onClick={next}
                disabled={idx >= total - 1}
                className="p-2 rounded hover:bg-secondary/50 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Next scene preview */}
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Up Next
            </p>
            {nextScene ? (
              <p className="text-sm font-serif text-foreground/70 truncate">
                {nextScene.title}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">End of lesson</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
