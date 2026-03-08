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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  coords: [number, number];
  iconType: string;
  lessonId: string;
}

const PinDropModal = ({ open, onClose, coords, iconType, lessonId }: Props) => {
  const { user } = useAuth();
  const addCustomPin = useMapStore((s) => s.addCustomPin);
  const [label, setLabel] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupBody, setPopupBody] = useState("");
  const [scriptureRefs, setScriptureRefs] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setSaving(true);

    const refs = scriptureRefs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from("pins")
      .insert({
        lesson_id: lessonId,
        icon_type: iconType,
        coordinates: [lng, lat] as unknown as Json,
        label: label || "Pin",
        popup_title: popupTitle || label || "Pin",
        popup_body: popupBody || null,
        scripture_refs: refs,
        created_by: user.id,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to save pin: " + error.message);
      return;
    }

    addCustomPin(data.id);
    toast.success("Pin added!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground">
            New Pin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs">Lat</Label>
              <Input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Lng</Label>
              <Input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <span className="text-[11px] text-muted-foreground pt-4">📍 {iconType}</span>
          </div>

          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Bethlehem"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Popup Title</Label>
            <Input
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="Title shown in popup"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Popup Body</Label>
            <Textarea
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              placeholder="Description text…"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Scripture Refs (comma-separated)</Label>
            <Input
              value={scriptureRefs}
              onChange={(e) => setScriptureRefs(e.target.value)}
              placeholder="Gen 12:1, Acts 2:4"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Pin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PinDropModal;
