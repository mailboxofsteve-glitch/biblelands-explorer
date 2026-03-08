import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useMapStore } from "@/store/mapStore";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  points: [number, number][];
  lessonId: string;
}

const DASH_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

const RouteFinishModal = ({ open, onClose, points, lessonId }: Props) => {
  const { user } = useAuth();
  const currentEra = useMapStore((s) => s.currentEra);
  const addCustomOverlay = useMapStore((s) => s.addCustomOverlay);
  const finishRoute = useMapStore((s) => s.finishRoute);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#e07020");
  const [dash, setDash] = useState("solid");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    setSaving(true);

    const slug = `custom-${Date.now()}`;
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: name.trim() },
          geometry: {
            type: "LineString",
            coordinates: points,
          },
        },
      ],
    };

    const dashArray =
      dash === "dashed" ? [8, 4] : dash === "dotted" ? [2, 4] : undefined;

    const defaultStyle: Record<string, unknown> = {
      "line-color": color,
      "line-width": 3,
      "line-opacity": 0.9,
    };
    if (dashArray) {
      defaultStyle["line-dasharray"] = dashArray;
    }

    const { data, error } = await supabase
      .from("overlays")
      .insert({
        name: name.trim(),
        slug,
        category: "custom",
        era: currentEra,
        default_color: color,
        default_style: defaultStyle as Json,
        geojson: geojson as unknown as Json,
        is_preloaded: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to save route: " + error.message);
      return;
    }

    finishRoute();
    addCustomOverlay(data.id);
    toast.success("Route saved!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[360px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground">
            Save Route
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            ✏️ {points.length} points drawn
          </p>

          <div>
            <Label className="text-xs">Route Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paul's Third Journey"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
              />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Dash Style</Label>
            <div className="flex gap-1 mt-1">
              {DASH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDash(opt.value)}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${
                    dash === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RouteFinishModal;
