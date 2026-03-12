import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";
import PresentationHUD from "@/components/Map/PresentationHUD";
import EraSelector from "@/components/Map/EraSelector";
import OverlayToggles from "@/components/Map/OverlayToggles";
import SceneList from "@/components/Map/SceneList";
import { Maximize, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedLessonData {
  id: string;
  title: string;
  description: string | null;
}

const SharedLesson = () => {
  const { token } = useParams<{ token: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);
  const [lesson, setLesson] = useState<SharedLessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchLesson = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, description")
        .eq("share_token", token)
        .eq("is_public", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setLesson(data);
      }
      setLoading(false);
    };

    fetchLesson();
  }, [token]);

  const enterPresentation = useCallback(() => {
    setPresenting(true);
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);

  const exitPresentation = useCallback(() => {
    setPresenting(false);
    setTimeout(() => mapRef.current?.getMap()?.resize(), 350);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse font-serif text-lg">
          Loading lesson…
        </div>
      </div>
    );
  }

  if (notFound || !lesson) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Lesson not found
        </h1>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          This shared lesson link may have expired or the lesson may no longer be public.
        </p>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Sign-in banner */}
      {!presenting && (
        <div className="shrink-0 bg-accent/10 border-b border-border/40 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{lesson.title}</span>
            {" — "}Read-only view
          </p>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
              <LogIn size={14} />
              Sign in to edit
            </Button>
          </Link>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — read-only controls */}
        <aside
          className={`w-60 shrink-0 border-r border-border/40 bg-card flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${
            presenting ? "-translate-x-full absolute left-0 top-0 bottom-0 z-0 pointer-events-none" : "relative"
          }`}
        >
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-serif font-semibold text-foreground tracking-wide">
              Explore
            </h2>
          </div>

          <div className="px-2 py-3 border-b border-border/40">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Era
            </h3>
            <EraSelector />
          </div>

          <div className="px-2 py-3 flex-1">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Overlays
            </h3>
            <OverlayToggles />
          </div>

          <SceneList mapRef={mapRef} />
        </aside>

        {/* Map */}
        <main className="flex-1 relative transition-all duration-300 ease-in-out">
          <MapCanvas ref={mapRef} lessonId={lesson.id} presenting={presenting} />

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

          {presenting && (
            <PresentationHUD mapRef={mapRef} onExit={exitPresentation} />
          )}
        </main>
      </div>
    </div>
  );
};

export default SharedLesson;
