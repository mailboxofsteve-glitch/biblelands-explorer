import { useState } from "react";
import { Layers, Settings, Map, Route, Maximize } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import OverlayToggles from "@/components/Map/OverlayToggles";
import OverlayToggles from "@/components/Map/OverlayToggles";
import SceneList from "@/components/Map/SceneList";
import TeacherTools from "@/components/Map/TeacherTools";
import { useMapStore } from "@/store/mapStore";
import type { MapCanvasHandle } from "@/components/Map/MapCanvas";

type MobilePanel = "controls" | "tools" | null;

interface MobileToolbarProps {
  mapRef: React.RefObject<MapCanvasHandle | null>;
  onPresentationMode: () => void;
}

export default function MobileToolbar({
  mapRef,
  onPresentationMode,
}: MobileToolbarProps) {
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const toggleShowAllLabels = useMapStore((s) => s.toggleShowAllLabels);
  const fogEnabled = useMapStore((s) => s.fogEnabled);
  const toggleFog = useMapStore((s) => s.toggleFog);
  const labelFontSize = useMapStore((s) => s.labelFontSize);
  const setLabelFontSize = useMapStore((s) => s.setLabelFontSize);

  const toggle = (panel: MobilePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <>
      {/* Floating bottom toolbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full border border-border/40 px-2 py-1.5 shadow-lg">
        <button
          onClick={() => toggle("controls")}
          className={`p-2.5 rounded-full transition-colors ${
            activePanel === "controls"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
          title="Controls"
        >
          <Layers size={18} />
        </button>

        <button
          onClick={() => toggle("tools")}
          className={`p-2.5 rounded-full transition-colors ${
            activePanel === "tools"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
          title="Tools"
        >
          <Settings size={18} />
        </button>

        <div className="w-px h-6 bg-border/40 mx-0.5" />

        <button
          onClick={onPresentationMode}
          className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          title="Classroom Mode"
        >
          <Maximize size={18} />
        </button>
      </div>

      {/* Controls bottom sheet */}
      <Sheet
        open={activePanel === "controls"}
        onOpenChange={(open) => !open && setActivePanel(null)}
      >
        <SheetContent side="bottom" className="h-[50vh] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="font-serif">Controls</SheetTitle>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer" title="Atmospheric fog">
                  <span className="text-[10px] text-muted-foreground">Fog</span>
                  <Switch
                    checked={fogEnabled}
                    onCheckedChange={toggleFog}
                    className="scale-75"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer" title="Show all labels">
                  <span className="text-[10px] text-muted-foreground">Labels</span>
                  <Switch
                    checked={showAllLabels}
                    onCheckedChange={toggleShowAllLabels}
                    className="scale-75"
                  />
                </label>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Label font size slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Label Size</span>
                <span className="text-[10px] text-muted-foreground">{labelFontSize.toFixed(1)}×</span>
              </div>
              <Slider
                value={[labelFontSize]}
                onValueChange={([v]) => setLabelFontSize(v)}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

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

            <SceneList mapRef={mapRef} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Tools bottom sheet */}
      <Sheet
        open={activePanel === "tools"}
        onOpenChange={(open) => !open && setActivePanel(null)}
      >
        <SheetContent side="bottom" className="h-[50vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">Tools</SheetTitle>
          </SheetHeader>

          <div className="py-4">
            <TeacherTools mapRef={mapRef} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
