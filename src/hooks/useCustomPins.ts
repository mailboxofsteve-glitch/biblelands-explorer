import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";

export interface CustomPin {
  id: string;
  label: string;
  popup_title: string;
  popup_body: string | null;
  icon_type: string;
  coordinates: [number, number];
  scripture_refs: string[] | null;
}

export function useCustomPins(lessonId: string | undefined) {
  const [pins, setPins] = useState<CustomPin[]>([]);
  const customPinIds = useMapStore((s) => s.customPinIds);

  useEffect(() => {
    if (!lessonId) {
      setPins([]);
      return;
    }

    const fetch = async () => {
      const { data, error } = await supabase
        .from("pins")
        .select("id, label, popup_title, popup_body, icon_type, coordinates, scripture_refs")
        .eq("lesson_id", lessonId);

      if (error) {
        console.error("Failed to fetch custom pins:", error.message);
        return;
      }

      const parsed: CustomPin[] = (data ?? []).map((row) => ({
        ...row,
        coordinates: (Array.isArray(row.coordinates)
          ? row.coordinates
          : [0, 0]) as [number, number],
      }));

      setPins(parsed);
    };

    fetch();
  }, [lessonId, customPinIds]);

  return { pins };
}
