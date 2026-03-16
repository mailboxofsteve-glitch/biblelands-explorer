import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMapStore } from "@/store/mapStore";

export interface OverlayRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  era: string;
  default_color: string;
  default_style: Record<string, unknown>;
  geojson: Record<string, unknown>;
  is_preloaded: boolean;
  year_start: number | null;
  year_end: number | null;
}

export function useOverlays() {
  const { user } = useAuth();
  const currentEra = useMapStore((s) => s.currentEra);
  const customOverlayIds = useMapStore((s) => s.customOverlayIds);
  const [allOverlays, setAllOverlays] = useState<OverlayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverlays = async () => {
      setLoading(true);

      const { data: preloaded } = await supabase
        .from("overlays")
        .select("id, name, slug, category, era, default_color, default_style, geojson, is_preloaded, year_start, year_end")
        .eq("is_preloaded", true);

      let userOverlays: typeof preloaded = [];
      if (user) {
        const { data } = await supabase
          .from("overlays")
          .select("id, name, slug, category, era, default_color, default_style, geojson, is_preloaded, year_start, year_end")
          .eq("created_by", user.id)
          .eq("is_preloaded", false);
        userOverlays = data;
      }

      const merged = [...(preloaded ?? []), ...(userOverlays ?? [])];
      const unique = Array.from(new window.Map(merged.map((o) => [o.id, o])).values());
      setAllOverlays(unique as OverlayRow[]);
      setLoading(false);
    };

    fetchOverlays();
  }, [user, customOverlayIds]);

  const yearFilter = useMapStore((s) => s.yearFilter);

  // Memoize filtered overlays by era + year
  const overlays = useMemo(() => {
    const eraFiltered = allOverlays.filter((o) => o.era === currentEra);
    if (!yearFilter) return eraFiltered;
    return eraFiltered.filter((o) => {
      if (o.year_start == null) return true; // undated always visible
      return o.year_start <= yearFilter[1];
    });
  }, [allOverlays, currentEra, yearFilter]);

  return { overlays, allOverlays, loading };
}
