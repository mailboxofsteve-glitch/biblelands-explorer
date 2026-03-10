import { useOverlays } from "@/hooks/useOverlays";
import { useMapStore } from "@/store/mapStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const OverlayToggles = () => {
  const { overlays, loading } = useOverlays();
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);

  const handleDelete = async (e: React.MouseEvent, overlay: { id: string; name: string }) => {
    e.stopPropagation();
    const { error } = await supabase.from("overlays").delete().eq("id", overlay.id);
    if (error) {
      toast.error("Failed to delete overlay");
      return;
    }
    useMapStore.getState().removeCustomOverlay(overlay.id);
    toast.success(`Deleted "${overlay.name}"`);
  };

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
          <div key={overlay.id} className="group flex items-center">
            <button
              onClick={() => toggleOverlay(overlay.id)}
              className={`flex-1 text-left px-3 py-2 text-xs rounded-sm transition-colors flex items-center gap-2 ${
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
            {!overlay.is_preloaded && (
              <button
                onClick={(e) => handleDelete(e, overlay)}
                title="Delete overlay"
                className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-destructive/60 hover:text-destructive transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OverlayToggles;
