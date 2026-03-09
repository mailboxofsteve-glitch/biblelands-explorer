import { Button } from "@/components/ui/button";
import { Plus, Map, Maximize } from "lucide-react";

interface OnboardingBannerProps {
  onCreateLesson: () => void;
}

export default function OnboardingBanner({ onCreateLesson }: OnboardingBannerProps) {
  return (
    <div className="rounded-lg border border-accent/30 bg-card p-6 space-y-5">
      <div>
        <h2 className="text-xl font-serif font-bold text-foreground">
          Welcome to BibleLands! 🗺️
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Get started in three easy steps:
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold">
              1
            </span>
            <span className="text-sm font-medium text-foreground">
              Create your first lesson
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Click the button below to create a new lesson and open the map editor.
          </p>
          <Button size="sm" onClick={onCreateLesson} className="w-full gap-1">
            <Plus size={14} />
            New Lesson
          </Button>
        </div>

        {/* Step 2 */}
        <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold">
              2
            </span>
            <span className="text-sm font-medium text-foreground">
              Choose a biblical era
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Select an era from the sidebar to load historically accurate overlays, routes, and locations.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Map size={12} />
            Available in the map editor
          </div>
        </div>

        {/* Step 3 */}
        <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold">
              3
            </span>
            <span className="text-sm font-medium text-foreground">
              Save scenes & present
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Save map positions as scenes, then enter Classroom Mode for a fullscreen presentation.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Maximize size={12} />
            Press P for presentation mode
          </div>
        </div>
      </div>
    </div>
  );
}
