import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { key: "S", description: "Save current scene" },
  { key: "P", description: "Toggle presentation mode" },
  { key: "A", description: "Animate all active routes" },
  { key: "Esc", description: "Close modal / exit presentation" },
  { key: "1–8", description: "Jump to era by number" },
  { key: "→ / Space", description: "Next scene (presentation)" },
  { key: "←", description: "Previous scene (presentation)" },
  { key: "?", description: "Open this shortcuts panel" },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick actions for the map editor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-1"
            >
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
              <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded border border-border/60 bg-secondary/50 text-[11px] font-mono font-medium text-foreground">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to register global keyboard shortcuts for MapPage.
 * Returns whether the shortcuts modal should be shown.
 */
export function useKeyboardShortcuts({
  onSaveScene,
  onTogglePresentation,
  onAnimateRoutes,
  onSetEra,
  presenting,
}: {
  onSaveScene: () => void;
  onTogglePresentation: () => void;
  onAnimateRoutes: () => void;
  onSetEra: (index: number) => void;
  presenting: boolean;
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        // Presentation exit handled by PresentationHUD
        return;
      }

      // Don't handle editor shortcuts during presentation (HUD handles arrows/space)
      if (presenting) return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSaveScene();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        onTogglePresentation();
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        onAnimateRoutes();
      } else if (e.key >= "1" && e.key <= "8") {
        e.preventDefault();
        onSetEra(parseInt(e.key) - 1);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSaveScene, onTogglePresentation, onAnimateRoutes, onSetEra, presenting, showShortcuts]);

  return { showShortcuts, setShowShortcuts };
}
