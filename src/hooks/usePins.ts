import { useEffect, useState, useMemo } from "react";
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
  model_url: string | null;
  model_scale: number | null;
  model_rotation_x: number | null;
  model_rotation_y: number | null;
  model_rotation_z: number | null;
  model_altitude: number | null;
}

export function usePins() {
  const currentEra = useMapStore((s) => s.currentEra);
  const yearFilter = useMapStore((s) => s.yearFilter);
  const [allPins, setAllPins] = useState<LocationPin[]>([]);
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
        setAllPins([]);
      } else {
        const parsed = (data ?? []).map((loc: any) => ({
          ...loc,
          coordinates: [loc.lng ?? 0, loc.lat ?? 0] as [number, number],
        })) as LocationPin[];
        setAllPins(parsed);
      }
      setLoading(false);
    };

    fetchPins();
  }, [currentEra]);

  // Apply year filter: show pins with no year data (undated) + pins within range
  const pins = useMemo(() => {
    if (!yearFilter) return allPins;
    return allPins.filter((pin) => {
      if (pin.year_start == null) return true; // undated always visible
      return pin.year_start <= yearFilter[1];
    });
  }, [allPins, yearFilter]);

  return { pins, loading };
}
