import { useRef } from "react";
import { useParams } from "react-router-dom";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";

const MapPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left sidebar — controls */}
      <aside className="w-60 shrink-0 border-r border-border/40 bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border/40">
          <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
            Controls
          </h2>
        </div>
        <div className="flex-1 px-4 py-4 text-xs text-muted-foreground">
          <p>Lesson: {lessonId ?? "none"}</p>
          <p className="mt-2">Overlays, scenes, and filters will appear here.</p>
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
