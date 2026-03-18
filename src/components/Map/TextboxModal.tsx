import { useState, useEffect } from "react";
import { useMapStore } from "@/store/mapStore";
import type { SceneTextbox } from "@/types";
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
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  coords?: [number, number];
  editingTextbox?: SceneTextbox | null;
}

const TextboxModal = ({ open, onClose, coords, editingTextbox }: Props) => {
  const addTextbox = useMapStore((s) => s.addTextbox);
  const updateTextbox = useMapStore((s) => s.updateTextbox);
  const clearPendingTextbox = useMapStore((s) => s.clearPendingTextbox);

  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [fillColor, setFillColor] = useState("#1e3a5f");
  const [fillOpacity, setFillOpacity] = useState(0.85);
  const [fontSize, setFontSize] = useState(1.0);
  const [width, setWidth] = useState(240);
  const [height, setHeight] = useState(0);

  const isEditing = !!editingTextbox;

  // Pre-fill fields when editing
  useEffect(() => {
    if (editingTextbox) {
      setHeading(editingTextbox.heading);
      setBody(editingTextbox.body);
      setFillColor(editingTextbox.fill_color);
      setFillOpacity(editingTextbox.fill_opacity);
      setFontSize(editingTextbox.font_size ?? 1.0);
      setWidth(editingTextbox.width ?? 240);
      setHeight(editingTextbox.height ?? 0);
    } else {
      setHeading("");
      setBody("");
      setFillColor("#1e3a5f");
      setFillOpacity(0.85);
      setFontSize(1.0);
      setWidth(240);
      setHeight(0);
    }
  }, [editingTextbox, open]);

  const handleSave = () => {
    if (!heading.trim()) return;
    if (isEditing) {
      updateTextbox(editingTextbox.id, {
        heading: heading.trim(),
        body: body.trim(),
        fill_color: fillColor,
        fill_opacity: fillOpacity,
        font_size: fontSize,
      });
    } else {
      if (!coords) return;
      const tb: SceneTextbox = {
        id: crypto.randomUUID(),
        lng: coords[0],
        lat: coords[1],
        heading: heading.trim(),
        body: body.trim(),
        fill_color: fillColor,
        fill_opacity: fillOpacity,
        font_size: fontSize,
      };
      addTextbox(tb);
    }
    onClose();
  };

  const handleClose = () => {
    if (!isEditing) {
      clearPendingTextbox();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Text Box" : "Add Text Box"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tb-heading">Heading</Label>
            <Input
              id="tb-heading"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. The Fall of Jerusalem"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tb-body">Body</Label>
            <Textarea
              id="tb-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Additional details…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tb-color">Fill Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="tb-color"
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {fillColor}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Opacity: {Math.round(fillOpacity * 100)}%</Label>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[fillOpacity * 100]}
                onValueChange={([v]) => setFillOpacity(v / 100)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Font Size: {fontSize.toFixed(1)}×</Label>
            <Slider
              min={50}
              max={200}
              step={10}
              value={[fontSize * 100]}
              onValueChange={([v]) => setFontSize(v / 100)}
            />
          </div>

          {/* Preview */}
          <div
            className="rounded-lg p-3 text-white text-sm"
            style={{
              backgroundColor: fillColor,
              opacity: fillOpacity,
            }}
          >
            <h4 className="font-bold" style={{ fontSize: `${Math.round(13 * fontSize)}px` }}>
              {heading || "Heading"}
            </h4>
            {body && (
              <p className="mt-1 opacity-90" style={{ fontSize: `${Math.round(11 * fontSize)}px` }}>
                {body}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!heading.trim()}>
            {isEditing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TextboxModal;
