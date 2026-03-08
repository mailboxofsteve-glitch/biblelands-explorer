import { useOverlays } from "@/hooks/useOverlays";
import { useMapStore } from "@/store/mapStore";

const OverlayToggles = () => {
  const { overlays, loading } = useOverlays();
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground animate-pulse px-3 py-2">
        Loading overlays…
      </p>
    );
  }

  if (overlays.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-3 py-2">
        No overlays for this era.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {overlays.map((overlay) => {
        const active = activeOverlayIds.includes(overlay.id);
        return (
          <button
            key={overlay.id}
            onClick={() => toggleOverlay(overlay.id)}
            className={`w-full text-left px-3 py-2 text-xs rounded-sm transition-colors flex items-center gap-2 ${
              active
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className="w-1 self-stretch rounded-full shrink-0"
              style={{
                backgroundColor: active ? overlay.default_color : "transparent",
                border: active ? "none" : "1px solid hsl(var(--border))",
              }}
            />
            <span className="truncate">{overlay.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground capitalize">
              {overlay.category}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default OverlayToggles;
