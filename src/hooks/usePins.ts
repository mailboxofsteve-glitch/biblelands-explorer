import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMapStore } from "@/store/mapStore";

export interface LocationPin {
  id: string;
  name_ancient: string;
  name_modern: string | null;
  name_hebrew: string | null;
  coordinates: [number, number];
  location_type: string;
  era_tags: string[];
  primary_verse: string | null;
  description: string | null;
  year_start: number | null;
  year_end: number | null;
  parent_location_id: string | null;
}

export function usePins() {
  const currentEra = useMapStore((s) => s.currentEra);
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPins = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations_with_coords" as any)
        .select("id, name_ancient, name_modern, name_hebrew, lng, lat, location_type, era_tags, primary_verse, description, year_start, year_end, parent_location_id")
        .contains("era_tags", [currentEra]);

      if (error) {
        console.error("Failed to fetch locations:", error);
        setPins([]);
      } else {
        const parsed = (data ?? []).map((loc: any) => ({
          ...loc,
          coordinates: [loc.lng ?? 0, loc.lat ?? 0] as [number, number],
        })) as LocationPin[];
        setPins(parsed);
      }
      setLoading(false);
    };

    fetchPins();
  }, [currentEra]);

  return { pins, loading };
}
