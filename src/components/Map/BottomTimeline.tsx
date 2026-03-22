import { useState, useEffect, useMemo, useRef } from "react";
import { ERAS, type EraId, useMapStore } from "@/store/mapStore";
import { supabase } from "@/integrations/supabase/client";
import { Tent, Footprints, Scale, Crown, GitBranch, Link, Cross, ScrollText, type LucideIcon } from "lucide-react";

const ERA_ICONS: Record<EraId, LucideIcon> = {
  patriarchs: Tent,
  exodus: Footprints,
  judges: Scale,
  united_kingdom: Crown,
  divided_kingdom: GitBranch,
  exile: Link,
  nt_ministry: Cross,
  early_church: ScrollText,
};

// Approximate year ranges per era for positioning
const ERA_YEAR_RANGES: Record<EraId, [number, number]> = {
  patriarchs: [-2100, -1800],
  exodus: [-1450, -1200],
  judges: [-1200, -1020],
  united_kingdom: [-1020, -930],
  divided_kingdom: [-930, -586],
  exile: [-586, -538],
  nt_ministry: [-4, 33],
  early_church: [33, 100],
};

interface TimelineEntry {
  id: string;
  name: string;
  year_start: number | null;
  year_end: number | null;
  type: "location" | "overlay";
}

function formatYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;
}

export default function BottomTimeline({ presenting = false }: { presenting?: boolean }) {
  const currentEra = useMapStore((s) => s.currentEra);
  const setEra = useMapStore((s) => s.setEra);
  const yearFilter = useMapStore((s) => s.yearFilter);
  const setYearFilter = useMapStore((s) => s.setYearFilter);
  const clearYearFilter = useMapStore((s) => s.clearYearFilter);

  const [expandedEra, setExpandedEra] = useState<EraId | null>(currentEra);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setExpandedEra(currentEra);
  }, [currentEra]);

  useEffect(() => {
    if (!expandedEra) {
      setEntries([]);
      return;
    }

    const fetchEntries = async () => {
      const [{ data: locs }, { data: ovls }] = await Promise.all([
        supabase
          .from("locations_with_coords" as any)
          .select("id, name_ancient, year_start, year_end")
          .contains("era_tags", [expandedEra])
          .not("year_start", "is", null),
        supabase
          .from("overlays")
          .select("id, name, year_start, year_end")
          .eq("era", expandedEra)
          .not("year_start", "is", null),
      ]);

      const combined: TimelineEntry[] = [
        ...(locs ?? []).map((l: any) => ({
          id: l.id,
          name: l.name_ancient,
          year_start: l.year_start,
          year_end: l.year_end,
          type: "location" as const,
        })),
        ...(ovls ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          year_start: o.year_start,
          year_end: o.year_end,
          type: "overlay" as const,
        })),
      ];
      setEntries(combined);
    };

    fetchEntries();
  }, [expandedEra]);

  const eraRange = expandedEra ? ERA_YEAR_RANGES[expandedEra] : null;

  const handleEraClick = (eraId: EraId) => {
    setEra(eraId);
    setExpandedEra(eraId);
    clearYearFilter();
  };

  const getYearFromPosition = (clientX: number): number => {
    if (!sliderRef.current || !eraRange) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(eraRange[0] + pct * (eraRange[1] - eraRange[0]));
  };

  const handleSliderInteraction = (clientX: number) => {
    const year = getYearFromPosition(clientX);
    if (eraRange) {
      setYearFilter([eraRange[0], year]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSliderInteraction(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleSliderInteraction(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      const up = () => setIsDragging(false);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
      return () => {
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
    }
  }, [isDragging]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.year_start ?? 0) - (b.year_start ?? 0)),
    [entries]
  );

  const sliderPct = useMemo(() => {
    if (!yearFilter || !eraRange) return 100;
    return ((yearFilter[1] - eraRange[0]) / (eraRange[1] - eraRange[0])) * 100;
  }, [yearFilter, eraRange]);

  return (
    <div className={`w-full border-t border-border/40 select-none z-50 shrink-0 transition-colors duration-300 ${
      presenting ? "bg-card/30 backdrop-blur-[2px]" : "bg-card/95 backdrop-blur-sm"
    }`}>
      {/* Era bar */}
      <div className="flex w-full h-14 items-stretch">
        {ERAS.map((era) => {
          const isExpanded = expandedEra === era.id;
          const isActive = currentEra === era.id;
          return (
            <button
              key={era.id}
              onClick={() => handleEraClick(era.id as EraId)}
              className={`relative flex items-center justify-center transition-all duration-300 ease-in-out border-r last:border-r-0 border-border/20 overflow-hidden ${
                isExpanded
                  ? presenting ? "flex-[5] bg-accent/5" : "flex-[5] bg-accent/10"
                  : "flex-1 hover:bg-secondary/40"
              } ${isActive ? "text-accent font-semibold" : "text-muted-foreground"}`}
              style={presenting ? { textShadow: "0 1px 3px rgba(0,0,0,0.8)" } : undefined}
            >
              {(() => {
                const Icon = ERA_ICONS[era.id as EraId];
                return isExpanded ? (
                  <span className="flex items-center gap-2 whitespace-nowrap text-lg font-serif">
                    <Icon size={18} />
                    {era.label}
                  </span>
                ) : (
                  <Icon size={16} />
                );
              })()}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded era detail: year range slider + entry markers */}
      {expandedEra && eraRange && (
        <div className="px-4 py-2 space-y-1">
          {/* Year labels */}
          <div className="flex justify-between text-xl text-muted-foreground" style={presenting ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" } : undefined}>
            <span>{formatYear(eraRange[0])}</span>
            {yearFilter && (
              <span className="text-accent font-medium">
                Showing up to {formatYear(yearFilter[1])}
                <button
                  onClick={clearYearFilter}
                  className="ml-2 text-muted-foreground hover:text-foreground underline"
                >
                  Reset
                </button>
              </span>
            )}
            <span>{formatYear(eraRange[1])}</span>
          </div>

          {/* Track */}
          <div
            ref={sliderRef}
            className="relative w-full h-10 cursor-pointer group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => {
              setIsDragging(true);
              handleSliderInteraction(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (isDragging) handleSliderInteraction(e.touches[0].clientX);
            }}
          >
            {/* Background track */}
            <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 rounded-full bg-secondary" />

            {/* Active fill */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full bg-accent/50 transition-[width] duration-75"
              style={{ width: `${sliderPct}%` }}
            />

            {/* Entry markers */}
            {sortedEntries.map((entry) => {
              if (entry.year_start == null) return null;
              const pct =
                ((entry.year_start - eraRange[0]) / (eraRange[1] - eraRange[0])) * 100;
              const isFiltered =
                yearFilter && entry.year_start > yearFilter[1];
              return (
                <div
                  key={entry.id}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-opacity ${
                    isFiltered ? "opacity-20" : "opacity-100"
                  }`}
                  style={{ left: `${Math.max(1, Math.min(99, pct))}%` }}
                  title={`${entry.name}: ${formatYear(entry.year_start)}${entry.year_end ? ` – ${formatYear(entry.year_end)}` : ""}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      entry.type === "location"
                        ? "bg-primary"
                        : "bg-accent"
                    } ring-2 ring-background`}
                  />
                </div>
              );
            })}

            {/* Slider thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-6 h-6 rounded-full bg-accent border-2 border-background shadow-md cursor-grab active:cursor-grabbing transition-[left] duration-75"
              style={{ left: `${sliderPct}%` }}
            />
          </div>

          {/* Entry count */}
          {sortedEntries.length > 0 && (
            <div className="text-lg text-muted-foreground text-center">
              {sortedEntries.filter(
                (e) => !yearFilter || (e.year_start != null && e.year_start <= yearFilter[1])
              ).length}
              / {sortedEntries.length} dated entries visible
            </div>
          )}
        </div>
      )}
    </div>
  );
}
