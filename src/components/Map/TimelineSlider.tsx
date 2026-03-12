import { ERAS, type EraId, useMapStore } from "@/store/mapStore";

const ERA_SHORT_LABELS: Record<string, string> = {
  patriarchs: "Patriarchs",
  exodus: "Exodus",
  judges: "Judges",
  united_kingdom: "UK",
  divided_kingdom: "DK",
  exile: "Exile",
  nt_ministry: "NT",
  early_church: "EC",
};

export default function TimelineSlider() {
  const currentEra = useMapStore((s) => s.currentEra);
  const setEra = useMapStore((s) => s.setEra);
  const currentIndex = ERAS.findIndex((e) => e.id === currentEra);

  return (
    <div className="w-full select-none">
      {/* Era labels */}
      <div className="flex w-full">
        {ERAS.map((era, i) => (
          <button
            key={era.id}
            onClick={() => setEra(era.id as EraId)}
            className={`flex-1 text-center transition-colors pb-1 ${
              i === currentIndex
                ? "text-accent font-bold text-[10px]"
                : "text-muted-foreground text-[9px] hover:text-foreground"
            }`}
          >
            {ERA_SHORT_LABELS[era.id] ?? era.label}
          </button>
        ))}
      </div>

      {/* Track */}
      <div className="relative w-full h-5 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-secondary" />

        {/* Active fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent/40 transition-all duration-200"
          style={{
            left: 0,
            width: `${((currentIndex + 0.5) / ERAS.length) * 100}%`,
          }}
        />

        {/* Tick marks + click targets */}
        {ERAS.map((era, i) => {
          const pct = ((i + 0.5) / ERAS.length) * 100;
          const active = i === currentIndex;
          return (
            <button
              key={era.id}
              onClick={() => setEra(era.id as EraId)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1 group"
              style={{ left: `${pct}%` }}
              title={era.label}
            >
              <span
                className={`block rounded-full transition-all duration-200 ${
                  active
                    ? "w-3.5 h-3.5 bg-accent shadow-md ring-2 ring-accent/30"
                    : "w-1.5 h-1.5 bg-muted-foreground/50 group-hover:bg-foreground group-hover:scale-125"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
