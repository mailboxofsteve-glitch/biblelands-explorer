import { ERAS, type EraId, useMapStore } from "@/store/mapStore";

const EraSelector = () => {
  const currentEra = useMapStore((s) => s.currentEra);
  const setEra = useMapStore((s) => s.setEra);

  return (
    <div className="space-y-0.5">
      {ERAS.map((era) => {
        const active = currentEra === era.id;
        return (
          <button
            key={era.id}
            onClick={() => setEra(era.id as EraId)}
            className={`w-full text-left px-3 py-2 text-xs rounded-sm transition-colors ${
              active
                ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-l-2 border-transparent"
            }`}
          >
            {era.label}
          </button>
        );
      })}
    </div>
  );
};

export default EraSelector;
