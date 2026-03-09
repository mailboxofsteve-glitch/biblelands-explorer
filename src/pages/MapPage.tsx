import { useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import EraSelector from "@/components/Map/EraSelector";
import OverlayToggles from "@/components/Map/OverlayToggles";
import TeacherTools from "@/components/Map/TeacherTools";
import SceneList from "@/components/Map/SceneList";
import PresentationHUD from "@/components/Map/PresentationHUD";
import LessonSettingsModal from "@/components/Map/LessonSettingsModal";
import { Maximize, Settings } from "lucide-react";

const MapPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);
  const [presenting, setPresenting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const enterPresentation = useCallback(() => {
    setPresenting(true);
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);
  const exitPresentation = useCallback(() => {
    setPresenting(false);
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left sidebar — controls */}
      <aside
        className={`w-60 shrink-0 border-r border-border/40 bg-card flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${
          presenting ? "-translate-x-full absolute left-0 top-0 bottom-0 z-0 pointer-events-none" : "relative"
        }`}
      >
        <div className="px-4 py-3 border-b border-border/40">
          <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
            Controls
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            Lesson: {lessonId ?? "—"}
          </p>
        </div>

        {/* Era selector */}
        <div className="px-2 py-3 border-b border-border/40">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Era
          </h3>
          <EraSelector />
        </div>

        {/* Overlay toggles */}
        <div className="px-2 py-3 flex-1">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Overlays
          </h3>
          <OverlayToggles />
        </div>

        {/* Lesson Scenes */}
        <SceneList mapRef={mapRef} />
      </aside>

      {/* Map */}
      <main className="flex-1 relative transition-all duration-300 ease-in-out">
        <MapCanvas ref={mapRef} lessonId={lessonId} />

        {/* Classroom mode button — only when NOT presenting */}
        {!presenting && (
          <button
            onClick={enterPresentation}
            className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/30 transition-all text-xs font-medium"
            title="Enter Classroom Presentation Mode"
          >
            <Maximize size={14} />
            Classroom Mode
          </button>
        )}

        {/* Presentation HUD overlay */}
        {presenting && (
          <PresentationHUD mapRef={mapRef} onExit={exitPresentation} />
        )}
      </main>

      {/* Right sidebar — tools */}
      <aside
        className={`w-[200px] shrink-0 border-l border-border/40 bg-card flex flex-col transition-transform duration-300 ease-in-out ${
          presenting ? "translate-x-full absolute right-0 top-0 bottom-0 z-0 pointer-events-none" : "relative"
        }`}
      >
        <TeacherTools mapRef={mapRef} />
      </aside>
    </div>
  );
};

export default MapPage;
