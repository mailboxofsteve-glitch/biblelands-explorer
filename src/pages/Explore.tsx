import { useRef, useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import TimelineSlider from "@/components/Map/TimelineSlider";
import OverlayToggles from "@/components/Map/OverlayToggles";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const Explore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapRef = useRef<MapCanvasHandle | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-3 py-2 border-b border-border/40 bg-card/80 backdrop-blur-sm z-30 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span className="text-sm font-serif font-semibold text-foreground tracking-wide">
          BibleLands
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Explore
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-52 shrink-0 border-r border-border/40 bg-card/60 backdrop-blur-sm overflow-y-auto z-20">
            <div className="p-3 space-y-4">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Era
                </h3>
                <TimelineSlider />
              </div>
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Overlays
                </h3>
                <OverlayToggles />
              </div>
            </div>
          </aside>
        )}

        {/* Map */}
        <main className="flex-1 relative min-h-0">
          <MapCanvas ref={mapRef} />
        </main>
      </div>

      {/* Mobile floating button + sheet */}
      {isMobile && (
        <>
          <button
            onClick={() => setControlsOpen(true)}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border/40 px-4 py-2.5 shadow-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Layers size={16} />
            <span className="text-xs font-medium">Controls</span>
          </button>

          <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetContent side="bottom" className="h-[50vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-serif">Controls</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Era
                  </h3>
                  <TimelineSlider />
                </div>
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Overlays
                  </h3>
                  <OverlayToggles />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};

export default Explore;
