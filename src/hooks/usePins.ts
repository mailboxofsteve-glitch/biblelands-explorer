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
}

export function usePins() {
  const currentEra = useMapStore((s) => s.currentEra);
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPins = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations")
        .select("id, name_ancient, name_modern, name_hebrew, coordinates, location_type, era_tags, primary_verse, description")
        .contains("era_tags", [currentEra]);

      if (error) {
        console.error("Failed to fetch locations:", error);
        setPins([]);
      } else {
        // Parse coordinates from PostGIS point to [lng, lat]
        const parsed = (data ?? []).map((loc: any) => {
          let coords: [number, number] = [0, 0];
          if (loc.coordinates) {
            // PostGIS returns as object {type:"Point",coordinates:[lng,lat]} or string
            if (typeof loc.coordinates === "object" && loc.coordinates.coordinates) {
              coords = loc.coordinates.coordinates;
            } else if (typeof loc.coordinates === "string") {
              // POINT(lng lat) format
              const match = loc.coordinates.match(/POINT\(([^ ]+) ([^ ]+)\)/);
              if (match) coords = [parseFloat(match[1]), parseFloat(match[2])];
            }
          }
          return { ...loc, coordinates: coords } as LocationPin;
        });
        setPins(parsed);
      }
      setLoading(false);
    };

    fetchPins();
  }, [currentEra]);

  return { pins, loading };
}
