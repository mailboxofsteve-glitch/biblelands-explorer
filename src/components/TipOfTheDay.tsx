import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";

const TIPS = [
  {
    title: "Pin Drop Tool",
    body: "Select a pin type from the right sidebar, then click anywhere on the map to drop a labeled pin with scripture references.",
  },
  {
    title: "Route Drawing",
    body: "Draw custom routes by clicking points on the map. Great for tracing Paul's missionary journeys or the Exodus path.",
  },
  {
    title: "Classroom Mode",
    body: "Enter fullscreen presentation mode to project your map in class. Use arrow keys to navigate between scenes.",
  },
  {
    title: "Scene Snapshots",
    body: "Save camera positions, active overlays, and visible pins as scenes. Then step through them during presentations.",
  },
  {
    title: "Auto-Advance Scenes",
    body: "Set a timer on each scene to auto-advance during presentations — perfect for self-paced student exploration.",
  },
  {
    title: "Community Library",
    body: "Browse lessons published by other teachers in the Community Library. Copy any lesson to customize it for your class.",
  },
  {
    title: "PDF Handouts",
    body: "Export a PDF handout with a map screenshot and a table of all pin locations, perfect for student notes.",
  },
];

const STORAGE_KEY = "bibleland_tip_dismissed";
const TIP_INDEX_KEY = "bibleland_tip_index";

export default function TipOfTheDay() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const lastDismissed = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    if (lastDismissed !== today) {
      setDismissed(false);
    }
  }, []);

  const tipIndex = (() => {
    const stored = localStorage.getItem(TIP_INDEX_KEY);
    const idx = stored ? (parseInt(stored) + 1) % TIPS.length : 0;
    return idx;
  })();

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    localStorage.setItem(TIP_INDEX_KEY, tipIndex.toString());
    setDismissed(true);
  };

  if (dismissed) return null;

  const tip = TIPS[tipIndex];

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 flex items-start gap-3">
      <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-serif font-semibold text-foreground">
          💡 Tip: {tip.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{tip.body}</p>
      </div>
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
