import { useRef } from "react";
import { useParams } from "react-router-dom";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import EraSelector from "@/components/Map/EraSelector";
import OverlayToggles from "@/components/Map/OverlayToggles";

const MapPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left sidebar — controls */}
      <aside className="w-60 shrink-0 border-r border-border/40 bg-card flex flex-col overflow-y-auto">
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
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        <MapCanvas ref={mapRef} />
      </main>

      {/* Right sidebar — tools */}
      <aside className="w-[200px] shrink-0 border-l border-border/40 bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border/40">
          <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
            Tools
          </h2>
        </div>
        <div className="flex-1 px-4 py-4 text-xs text-muted-foreground">
          <p>Pin tools, measurement, and export options will appear here.</p>
        </div>
      </aside>
    </div>
  );
};

export default MapPage;
