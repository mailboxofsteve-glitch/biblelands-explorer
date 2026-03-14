import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";
import MapCanvas, { type MapCanvasHandle } from "@/components/Map/MapCanvas";

const CHANNEL_NAME = "presentation_sync";

const PresentationWindow = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const loadScene = useMapStore((s) => s.loadScene);
  const scenes = useMapStore((s) => s.scenes);
  const setScenes = useMapStore((s) => s.setScenes);

  // Validate lesson exists
  useEffect(() => {
    if (!lessonId) { setValid(false); return; }
    supabase.from("lessons").select("id").eq("id", lessonId).single()
      .then(({ data }) => setValid(!!data));
  }, [lessonId]);

  // Load scenes into store
  useEffect(() => {
    if (!lessonId || valid !== true) return;
    supabase
      .from("lesson_scenes")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("scene_order")
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((r) => ({
            id: r.id,
            lesson_id: r.lesson_id,
            title: r.title,
            scene_order: r.scene_order,
            center_lng: r.center_lng,
            center_lat: r.center_lat,
            zoom: r.zoom,
            bearing: r.bearing,
            pitch: r.pitch,
            era: r.era,
            active_overlay_ids: r.active_overlay_ids ?? [],
            visible_pin_ids: r.visible_pin_ids ?? [],
            hidden_location_ids: r.hidden_location_ids ?? [],
            highlighted_pin_id: r.highlighted_pin_id ?? null,
            animate_on_enter: r.animate_on_enter,
            auto_advance_seconds: r.auto_advance_seconds ?? null,
            created_by: r.created_by,
          }));
          setScenes(mapped);
        }
      });
  }, [lessonId, valid, setScenes]);

  // Auto-enter fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  // Listen for commands from presenter window
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      if (e.data?.type === "GO_TO_SCENE") {
        loadScene(e.data.index, map);
      }
    };
    return () => channel.close();
  }, [loadScene]);

  if (valid === false) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <p className="text-white/60 text-sm">Invalid lesson.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black">
      <MapCanvas ref={mapRef} lessonId={lessonId} presenting />
    </div>
  );
};

export default PresentationWindow;
