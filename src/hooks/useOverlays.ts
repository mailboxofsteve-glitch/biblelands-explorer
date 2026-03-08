import { useEffect, useState } from "react";
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
}

export function useOverlays() {
  const { user } = useAuth();
  const currentEra = useMapStore((s) => s.currentEra);
  const [allOverlays, setAllOverlays] = useState<OverlayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverlays = async () => {
      setLoading(true);

      // Fetch preloaded overlays
      const { data: preloaded } = await supabase
        .from("overlays")
        .select("id, name, slug, category, era, default_color, default_style, geojson, is_preloaded")
        .eq("is_preloaded", true);

      let userOverlays: typeof preloaded = [];
      if (user) {
        const { data } = await supabase
          .from("overlays")
          .select("id, name, slug, category, era, default_color, default_style, geojson, is_preloaded")
          .eq("created_by", user.id)
          .eq("is_preloaded", false);
        userOverlays = data;
      }

      // Merge and deduplicate
      const merged = [...(preloaded ?? []), ...(userOverlays ?? [])];
      const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values());
      setAllOverlays(unique as OverlayRow[]);
      setLoading(false);
    };

    fetchOverlays();
  }, [user]);

  // Filter to current era
  const overlays = allOverlays.filter((o) => o.era === currentEra);

  return { overlays, loading };
}
