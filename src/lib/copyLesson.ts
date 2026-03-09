import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

/**
 * Deep-copy a public lesson and all its related data to the current user.
 * Returns the new lesson ID.
 */
export async function copyLesson(sourceLessonId: string, userId: string): Promise<string> {
  // 1. Fetch source lesson
  const { data: source, error: lessonErr } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", sourceLessonId)
    .single();

  if (lessonErr || !source) throw new Error("Could not fetch source lesson");

  // 2. Insert new lesson
  const { data: newLesson, error: insertErr } = await supabase
    .from("lessons")
    .insert({
      teacher_id: userId,
      title: `${source.title} (Copy)`,
      description: source.description,
      era: source.era,
      is_public: false,
      share_token: null,
      scene_count: source.scene_count,
      thumbnail_url: (source as any).thumbnail_url ?? null,
    })
    .select("id")
    .single();

  if (insertErr || !newLesson) throw new Error("Could not create lesson copy");

  const newLessonId = newLesson.id;

  // 3. Copy scenes
  const { data: scenes } = await supabase
    .from("lesson_scenes")
    .select("*")
    .eq("lesson_id", sourceLessonId)
    .order("scene_order", { ascending: true });

  if (scenes && scenes.length > 0) {
    const newScenes = scenes.map((s) => ({
      lesson_id: newLessonId,
      created_by: userId,
      scene_order: s.scene_order,
      title: s.title,
      center_lng: s.center_lng,
      center_lat: s.center_lat,
      zoom: s.zoom,
      bearing: s.bearing,
      pitch: s.pitch,
      active_overlay_ids: s.active_overlay_ids,
      visible_pin_ids: s.visible_pin_ids,
      highlighted_pin_id: s.highlighted_pin_id,
      animate_on_enter: s.animate_on_enter,
      auto_advance_seconds: s.auto_advance_seconds,
    }));

    await supabase.from("lesson_scenes").insert(newScenes);
  }

  // 4. Copy pins
  const { data: pins } = await supabase
    .from("pins")
    .select("*")
    .eq("lesson_id", sourceLessonId);

  if (pins && pins.length > 0) {
    const newPins = pins.map((p) => ({
      lesson_id: newLessonId,
      created_by: userId,
      icon_type: p.icon_type,
      coordinates: p.coordinates,
      label: p.label,
      popup_title: p.popup_title,
      popup_body: p.popup_body,
      scripture_refs: p.scripture_refs,
    }));

    await supabase.from("pins").insert(newPins);
  }

  // 5. Copy custom overlays (non-preloaded, owned by source teacher)
  const { data: overlays } = await supabase
    .from("overlays")
    .select("*")
    .eq("created_by", source.teacher_id)
    .eq("is_preloaded", false);

  if (overlays && overlays.length > 0) {
    const newOverlays = overlays.map((o) => ({
      name: o.name,
      slug: `${o.slug}-copy-${nanoid(6)}`,
      category: o.category,
      era: o.era,
      default_color: o.default_color,
      default_style: o.default_style,
      geojson: o.geojson,
      is_preloaded: false,
      created_by: userId,
    }));

    await supabase.from("overlays").insert(newOverlays);
  }

  return newLessonId;
}
