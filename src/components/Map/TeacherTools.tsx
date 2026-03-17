import { useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useMapStore } from "@/store/mapStore";
import { useAuth } from "@/hooks/useAuth";
import { useOverlays } from "@/hooks/useOverlays";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2,
  Tent,
  Church,
  Swords,
  Ship,
  User,
  CalendarDays,
  AlertCircle,
  Route,
  Undo2,
  Trash2,
  X,
  Play,
  Square,
  Camera,
  FileText,
  Type,
} from "lucide-react";
import PinDropModal from "./PinDropModal";
import RouteFinishModal from "./RouteFinishModal";
import TextboxModal from "./TextboxModal";
import { animateRoutesSimultaneously } from "@/lib/animateRoute";
import { downloadMapScreenshot, generatePDFHandout } from "@/lib/exportUtils";
import type { MapCanvasHandle } from "./MapCanvas";

const PIN_ICONS = [
  { type: "city", label: "City", icon: Building2 },
  { type: "tent", label: "Tent", icon: Tent },
  { type: "temple", label: "Temple", icon: Church },
  { type: "battle", label: "Battle", icon: Swords },
  { type: "ship", label: "Ship", icon: Ship },
  { type: "person", label: "Person", icon: User },
  { type: "event", label: "Event", icon: CalendarDays },
  { type: "poi", label: "POI", icon: AlertCircle },
];

interface TeacherToolsProps {
  mapRef?: React.RefObject<MapCanvasHandle | null>;
}

const TeacherTools = ({ mapRef }: TeacherToolsProps) => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const toolMode = useMapStore((s) => s.toolMode);
  const startPinDrop = useMapStore((s) => s.startPinDrop);
  const startDrawRoute = useMapStore((s) => s.startDrawRoute);
  const startTextboxDrop = useMapStore((s) => s.startTextboxDrop);
  const cancelTool = useMapStore((s) => s.cancelTool);
  const undoLast = useMapStore((s) => s.undoLast);
  const clearAllCustom = useMapStore((s) => s.clearAllCustom);
  const pendingPinCoords = useMapStore((s) => s.pendingPinCoords);
  const pendingTextboxCoords = useMapStore((s) => s.pendingTextboxCoords);
  const pinDropIconType = useMapStore((s) => s.pinDropIconType);
  const routePoints = useMapStore((s) => s.routePoints);
  const customPinIds = useMapStore((s) => s.customPinIds);
  const customOverlayIds = useMapStore((s) => s.customOverlayIds);
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showTextboxModal, setShowTextboxModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  const { overlays } = useOverlays();

  // Open pin modal when coords are captured
  const handlePinModalOpen = pendingPinCoords && toolMode === "pin_drop";

  const handleClearAll = async () => {
    if (!user || !lessonId) return;

    // Delete custom pins for this lesson
    for (const pinId of customPinIds) {
      await supabase.from("pins").delete().eq("id", pinId);
    }

    // Delete custom overlays
    for (const overlayId of customOverlayIds) {
      await supabase.from("overlays").delete().eq("id", overlayId);
    }

    clearAllCustom();
    toast.success("Cleared all custom content");
  };

  const handleAnimateRoutes = useCallback(() => {
    const map = mapRef?.current?.getMap();
    if (!map) {
      toast.error("Map not ready");
      return;
    }

    // Get active overlays with LineString geometry
    const lineOverlays = overlays.filter((o) => {
      if (!activeOverlayIds.includes(o.id)) return false;
      const geojson = o.geojson as any;
      const geomType = geojson?.type === "FeatureCollection"
        ? geojson.features?.[0]?.geometry?.type
        : geojson?.type === "Feature"
          ? geojson.geometry?.type
          : geojson?.type;
      return geomType?.toLowerCase().includes("line");
    });

    if (lineOverlays.length === 0) {
      toast.error("No active route overlays to animate");
      return;
    }

    setIsAnimating(true);

    // Expand multi-feature overlays into one route per LineString feature
    const routes: { geojson: GeoJSON.GeoJSON; color: string }[] = [];
    for (const o of lineOverlays) {
      const geojson = o.geojson as any;
      if (geojson?.type === "FeatureCollection" && Array.isArray(geojson.features)) {
        for (const feature of geojson.features) {
          const geomType = feature?.geometry?.type;
          if (geomType === "LineString" || geomType === "MultiLineString") {
            routes.push({
              geojson: { type: "Feature", ...feature } as GeoJSON.GeoJSON,
              color: o.default_color,
            });
          }
        }
      } else {
        routes.push({
          geojson: geojson as GeoJSON.GeoJSON,
          color: o.default_color,
        });
      }
    }

    const { cancel } = animateRoutesSimultaneously(map, routes, {
      loop: true,
    });

    cancelAnimRef.current = () => {
      cancel();
      setIsAnimating(false);
    };
  }, [mapRef, overlays, activeOverlayIds]);

  const handleStopAnimation = useCallback(() => {
    cancelAnimRef.current?.();
    cancelAnimRef.current = null;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/40">
        <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
          Tools
        </h2>
      </div>

      {/* Active tool indicator */}
      {toolMode !== "none" && (
        <div className="px-3 py-2 bg-accent/10 border-b border-border/40 flex items-center justify-between">
          <span className="text-[11px] font-medium text-accent">
            {toolMode === "pin_drop" ? "📍 Pin Drop" : toolMode === "draw_route" ? "✏️ Drawing Route" : "📝 Place Text Box"}
          </span>
          <button
            onClick={cancelTool}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pin drop tools */}
      <div className="px-3 py-3 border-b border-border/40">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Drop Pin
        </h3>
        <div className="grid grid-cols-4 gap-1">
          {PIN_ICONS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => startPinDrop(type)}
              title={label}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded text-[10px] transition-colors ${
                toolMode === "pin_drop" && pinDropIconType === type
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon size={16} />
              <span className="truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Route draw tool */}
      <div className="px-3 py-3 border-b border-border/40">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Custom Route
        </h3>
        {toolMode === "draw_route" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Click map to add points ({routePoints.length} pts)
            </p>
            <button
              onClick={() => {
                if (routePoints.length < 2) {
                  toast.error("Need at least 2 points");
                  return;
                }
                setShowRouteModal(true);
              }}
              className="w-full text-xs py-1.5 rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Finish Route
            </button>
          </div>
        ) : (
          <button
            onClick={startDrawRoute}
            className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Route size={14} />
            Draw Route
          </button>
        )}
      </div>

      {/* Text box tool */}
      <div className="px-3 py-3 border-b border-border/40">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Text Box
        </h3>
        <button
          onClick={startTextboxDrop}
          className={`w-full flex items-center gap-2 text-xs py-2 px-2 rounded transition-colors ${
            toolMode === "textbox_drop"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <Type size={14} />
          Place Text Box
        </button>
      </div>

      {/* Animate routes */}
      <div className="px-3 py-3 border-b border-border/40">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Animation
        </h3>
        {isAnimating ? (
          <button
            onClick={handleStopAnimation}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 px-2 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Square size={14} />
            Stop Animation
          </button>
        ) : (
          <button
            onClick={handleAnimateRoutes}
            className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Play size={14} />
            Animate Routes
          </button>
        )}
      </div>

      {/* Export */}
      <div className="px-3 py-3 border-b border-border/40">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Export
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => {
              const title = lessonId ? "lesson" : "map";
              downloadMapScreenshot(title);
              toast.success("Screenshot downloaded");
            }}
            className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Camera size={14} />
            Screenshot
          </button>
          <button
            onClick={() => {
              const activeNames = overlays
                .filter((o) => activeOverlayIds.includes(o.id))
                .map((o) => ({ name: o.name, color: o.default_color }));

              // Gather visible pins from custom pins
              supabase
                .from("pins")
                .select("id, label, popup_title, popup_body, icon_type, coordinates, scripture_refs")
                .eq("lesson_id", lessonId ?? "")
                .then(({ data }) => {
                  const pins = (data ?? []).map((row) => ({
                    ...row,
                    coordinates: (Array.isArray(row.coordinates) ? row.coordinates : [0, 0]) as [number, number],
                  }));
                  generatePDFHandout("Lesson Handout", activeNames, pins);
                  toast.success("PDF handout downloaded");
                });
            }}
            className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <FileText size={14} />
            PDF Handout
          </button>
        </div>
      </div>

      {/* Undo / Clear */}
      <div className="px-3 py-3 mt-auto border-t border-border/40 space-y-1">
        <button
          onClick={undoLast}
          className="w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Undo2 size={14} />
          Undo
        </button>
        <button
          onClick={handleClearAll}
          disabled={customPinIds.length === 0 && customOverlayIds.length === 0}
          className="w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 size={14} />
          Clear Custom
        </button>
      </div>

      {/* Modals */}
      {handlePinModalOpen && (
        <PinDropModal
          open={true}
          onClose={() => {
            useMapStore.getState().clearPendingPin();
            setShowPinModal(false);
          }}
          coords={pendingPinCoords!}
          iconType={pinDropIconType}
          lessonId={lessonId!}
        />
      )}

      {showRouteModal && (
        <RouteFinishModal
          open={true}
          onClose={() => setShowRouteModal(false)}
          points={routePoints}
          lessonId={lessonId!}
        />
      )}
    </div>
  );
};

export default TeacherTools;
