import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";
import { useAuth } from "@/hooks/useAuth";
import type { LessonScene } from "@/types";
import { toast } from "sonner";

export function useScenes(lessonId: string | undefined) {
  const { user } = useAuth();
  const setScenes = useMapStore((s) => s.setScenes);
  const scenes = useMapStore((s) => s.scenes);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load scenes on mount
  useEffect(() => {
    if (!lessonId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("lesson_scenes")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("scene_order", { ascending: true });

      if (error) {
        console.error("Failed to load scenes:", error);
        return;
      }

      if (data) {
        setScenes(
          data.map((d: any) => ({
            id: d.id,
            lesson_id: d.lesson_id,
            created_by: d.created_by,
            scene_order: d.scene_order,
            title: d.title,
            center_lng: d.center_lng,
            center_lat: d.center_lat,
            zoom: d.zoom,
            bearing: d.bearing,
            pitch: d.pitch,
            active_overlay_ids: d.active_overlay_ids ?? [],
            visible_pin_ids: d.visible_pin_ids ?? [],
            highlighted_pin_id: d.highlighted_pin_id,
            animate_on_enter: d.animate_on_enter ?? false,
            auto_advance_seconds: d.auto_advance_seconds ?? null,
            era: d.era ?? "nt_ministry",
            hidden_location_ids: d.hidden_location_ids ?? [],
            textboxes: d.textboxes ?? [],
          }))
        );
      }
    };

    load();
  }, [lessonId, setScenes]);

  // Debounced scene persist (500ms)
  const persistScene = useCallback(
    async (scene: LessonScene) => {
      // Clear existing timer for this scene
      if (debounceTimers.current[scene.id]) {
        clearTimeout(debounceTimers.current[scene.id]);
      }

      debounceTimers.current[scene.id] = setTimeout(async () => {
        const { error } = await supabase.from("lesson_scenes").upsert({
          id: scene.id,
          lesson_id: scene.lesson_id,
          created_by: scene.created_by,
          title: scene.title,
          scene_order: scene.scene_order,
          center_lng: scene.center_lng,
          center_lat: scene.center_lat,
          zoom: scene.zoom,
          bearing: scene.bearing,
          pitch: scene.pitch,
          active_overlay_ids: scene.active_overlay_ids,
          visible_pin_ids: scene.visible_pin_ids,
          highlighted_pin_id: scene.highlighted_pin_id,
          animate_on_enter: scene.animate_on_enter,
          auto_advance_seconds: scene.auto_advance_seconds,
          era: scene.era,
          hidden_location_ids: scene.hidden_location_ids,
        });
        if (error) {
          console.error("Failed to save scene:", error);
          toast.error("Failed to save scene");
        } else {
          toast.success("Scene saved", { duration: 1500 });
        }
        delete debounceTimers.current[scene.id];
      }, 500);
    },
    []
  );

  const deleteSceneFromDb = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("lesson_scenes")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete scene:", error);
      toast.error("Failed to delete scene");
    }
  }, []);

  const persistOrder = useCallback(
    async (updatedScenes: LessonScene[]) => {
      for (const scene of updatedScenes) {
        await supabase
          .from("lesson_scenes")
          .update({ scene_order: scene.scene_order })
          .eq("id", scene.id);
      }
    },
    []
  );

  const updateTitle = useCallback(
    async (id: string, title: string) => {
      await supabase
        .from("lesson_scenes")
        .update({ title })
        .eq("id", id);
    },
    []
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  return { persistScene, deleteSceneFromDb, persistOrder, updateTitle };
}
