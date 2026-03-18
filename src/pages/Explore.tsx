import { useRef, useState, useCallback } from "react";
import { ArrowLeft, Layers, Play, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import BottomTimeline from "@/components/Map/BottomTimeline";
import OverlayToggles from "@/components/Map/OverlayToggles";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useMapStore } from "@/store/mapStore";
import { useOverlays } from "@/hooks/useOverlays";
import { animateRoutesSimultaneously, cleanupAllAnimationLayers } from "@/lib/animateRoute";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AppHeader from "@/components/AppHeader";

function ExploreControls({ mapRef }: { mapRef: React.RefObject<MapCanvasHandle | null> }) {
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const toggleShowAllLabels = useMapStore((s) => s.toggleShowAllLabels);
  const labelFontSize = useMapStore((s) => s.labelFontSize);
  const setLabelFontSize = useMapStore((s) => s.setLabelFontSize);
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const { allOverlays } = useOverlays();
  const [animating, setAnimating] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handlePlayAnimation = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (animating) {
      cancelRef.current?.();
      cleanupAllAnimationLayers(map);
      cancelRef.current = null;
      setAnimating(false);
      return;
    }

    const routes = allOverlays
      .filter((o) => activeOverlayIds.includes(o.id))
      .filter((o) => {
        const gj = o.geojson as any;
        const type = gj?.type === "Feature" ? gj.geometry?.type : gj?.type;
        return type === "LineString" || type === "MultiLineString";
      })
      .map((o) => ({ geojson: o.geojson as any, color: o.default_color }));

    if (!routes.length) return;

    const { cancel } = animateRoutesSimultaneously(map, routes, {
      loop: true,
      onAllComplete: () => setAnimating(false),
    });
    cancelRef.current = cancel;
    setAnimating(true);
  }, [mapRef, allOverlays, activeOverlayIds, animating]);

  return (
    <div className="space-y-4">
      {/* Labels */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Labels
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Show All</span>
          <Switch checked={showAllLabels} onCheckedChange={toggleShowAllLabels} />
        </div>
        <div className="mt-2">
          <span className="text-[10px] text-muted-foreground">Size</span>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={[labelFontSize]}
            onValueChange={([v]) => setLabelFontSize(v)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Overlays */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Overlays
        </h3>
        <OverlayToggles />
      </div>

      {/* Animation */}
      <div>
        <button
          onClick={handlePlayAnimation}
          className="flex items-center gap-1.5 w-full px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {animating ? <Square size={14} /> : <Play size={14} />}
          {animating ? "Stop Animation" : "Play Routes"}
        </button>
      </div>
    </div>
  );
}

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
            <div className="p-3">
              <ExploreControls mapRef={mapRef} />
            </div>
          </aside>
        )}

        {/* Map */}
        <main className="flex-1 relative min-h-0">
          <MapCanvas ref={mapRef} />
        </main>
      </div>

      {/* Bottom timeline */}
      <BottomTimeline />

      {/* Mobile floating button + sheet */}
      {isMobile && (
        <>
          <button
            onClick={() => setControlsOpen(true)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border/40 px-4 py-2.5 shadow-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Layers size={16} />
            <span className="text-xs font-medium">Controls</span>
          </button>

          <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
            <SheetContent side="bottom" className="h-[50vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-serif">Controls</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <ExploreControls mapRef={mapRef} />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};

export default Explore;
