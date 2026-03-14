import { useRef, useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import TimelineSlider from "@/components/Map/TimelineSlider";
import OverlayToggles from "@/components/Map/OverlayToggles";
import TeacherTools from "@/components/Map/TeacherTools";
import SceneList from "@/components/Map/SceneList";
import PresentationHUD from "@/components/Map/PresentationHUD";
import LessonSettingsModal from "@/components/Map/LessonSettingsModal";
import KeyboardShortcutsModal, { useKeyboardShortcuts } from "@/components/Map/KeyboardShortcutsModal";
import MobileToolbar from "@/components/Map/MobileToolbar";
import { Switch } from "@/components/ui/switch";
import { useMapStore, ERAS } from "@/store/mapStore";
import { useAuth } from "@/hooks/useAuth";
import { useScenes } from "@/hooks/useScenes";
import { useOverlays } from "@/hooks/useOverlays";
import { animateRoutesSequentially } from "@/lib/animateRoute";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Maximize, Settings, Keyboard, Monitor } from "lucide-react";
import GroundViewButton from "@/components/Map/GroundViewButton";
import PresenterView from "@/components/Map/PresenterView";

const MapPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!lessonId || lessonId.startsWith(':')) {
      navigate('/dashboard', { replace: true });
    }
  }, [lessonId, navigate]);
  const mapRef = useRef<MapCanvasHandle>(null);
  const [presenting, setPresenting] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isMobile = useIsMobile();

  const saveScene = useMapStore((s) => s.saveScene);
  const setEra = useMapStore((s) => s.setEra);
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const showAllLabels = useMapStore((s) => s.showAllLabels);
  const toggleShowAllLabels = useMapStore((s) => s.toggleShowAllLabels);
  const { persistScene } = useScenes(lessonId);
  const { overlays } = useOverlays();

  const enterPresentation = useCallback(() => {
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);

  const exitPresentation = useCallback(() => {
    setPresenting(false);
    setPresenterMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);

  // Sync state if user exits fullscreen via browser (e.g. Escape at browser level)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && presenting) {
        setPresenting(false);
        setPresenterMode(false);
        setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [presenting]);

  const enterPresenterView = useCallback(() => {
    if (!lessonId) return;
    // Open audience window
    window.open(`/present/${lessonId}`, "audience_window", "popup,width=1280,height=720");
    setPresenterMode(true);
    setPresenting(true);
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, [lessonId]);

  const handleSaveScene = useCallback(() => {
    if (!lessonId || lessonId.startsWith(':')) {
      toast.error("No lesson loaded — open a lesson from the dashboard first");
      return;
    }
    if (!user) {
      toast.error("Please sign in to save scenes");
      return;
    }
    const map = mapRef.current?.getMap();
    if (!map) {
      toast.error("Map not ready — please wait for it to load");
      return;
    }
    const center = map.getCenter();
    const scene = saveScene(
      {
        center_lng: center.lng,
        center_lat: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      },
      lessonId,
      user.id
    );
    if (scene) {
      persistScene(scene);
      toast.success("Scene saved");
    }
  }, [lessonId, user, saveScene, persistScene]);

  const handleAnimateRoutes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const lineOverlays = overlays.filter((o) => {
      if (!activeOverlayIds.includes(o.id)) return false;
      const geojson = o.geojson as any;
      const geomType =
        geojson?.type === "FeatureCollection"
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

    const routes = lineOverlays.map((o) => ({
      geojson: o.geojson as unknown as GeoJSON.GeoJSON,
      color: o.default_color,
    }));

    animateRoutesSequentially(map, routes, { duration: 3000 });
    toast.success("Animating routes…");
  }, [overlays, activeOverlayIds]);

  const handleSetEra = useCallback(
    (index: number) => {
      if (index >= 0 && index < ERAS.length) {
        setEra(ERAS[index].id);
        toast.success(`Era: ${ERAS[index].label}`);
      }
    },
    [setEra]
  );

  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts({
    onSaveScene: handleSaveScene,
    onTogglePresentation: () => {
      if (presenting) exitPresentation();
      else enterPresentation();
    },
    onAnimateRoutes: handleAnimateRoutes,
    onSetEra: handleSetEra,
    presenting,
  });

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left sidebar — controls (hidden on mobile) */}
      {!isMobile && (
        <aside
          className={`w-60 shrink-0 border-r border-border/40 bg-card flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${
            presenting ? "-translate-x-full absolute left-0 top-0 bottom-0 z-0 pointer-events-none" : "relative"
          }`}
        >
          <div className="px-4 py-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
                Controls
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer" title="Show all labels on map">
                  <span className="text-[10px] text-muted-foreground">Labels</span>
                  <Switch
                    checked={showAllLabels}
                    onCheckedChange={toggleShowAllLabels}
                    className="scale-75"
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-muted-foreground truncate">
                Lesson: {lessonId ?? "—"}
              </p>
              {lessonId && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Lesson Settings"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="px-2 py-3 border-b border-border/40">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Era
            </h3>
            <TimelineSlider />
          </div>

          <div className="px-2 py-3 flex-1">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Overlays
            </h3>
            <OverlayToggles />
          </div>

          <SceneList mapRef={mapRef} />
        </aside>
      )}

      {/* Map */}
      <main className="flex-1 relative transition-all duration-300 ease-in-out">
        <MapCanvas ref={mapRef} lessonId={lessonId} presenting={presenting} />

        {/* Desktop buttons */}
        {!presenting && !isMobile && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <button
              onClick={enterPresentation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/30 transition-all text-xs font-medium"
              title="Enter Classroom Presentation Mode"
            >
              <Maximize size={14} />
              Classroom Mode
            </button>
            <button
              onClick={enterPresenterView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/30 transition-all text-xs font-medium"
              title="Presenter View (multi-monitor)"
            >
              <Monitor size={14} />
              Presenter View
            </button>
            <GroundViewButton mapRef={mapRef} />
            <button
              onClick={() => setShowShortcuts(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/30 transition-all text-xs"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard size={14} />
            </button>
          </div>
        )}

        {/* Presentation HUD */}
        {presenting && (
          <PresentationHUD mapRef={mapRef} onExit={exitPresentation} />
        )}

        {/* Mobile toolbar */}
        {isMobile && !presenting && (
          <MobileToolbar mapRef={mapRef} onPresentationMode={enterPresentation} />
        )}
      </main>

      {/* Right sidebar — tools (hidden on mobile) */}
      {!isMobile && (
        <aside
          className={`w-[200px] shrink-0 border-l border-border/40 bg-card flex flex-col transition-transform duration-300 ease-in-out ${
            presenting ? "translate-x-full absolute right-0 top-0 bottom-0 z-0 pointer-events-none" : "relative"
          }`}
        >
          <TeacherTools mapRef={mapRef} />
        </aside>
      )}

      {/* Modals */}
      {lessonId && (
        <LessonSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          lessonId={lessonId}
        />
      )}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
};

export default MapPage;

