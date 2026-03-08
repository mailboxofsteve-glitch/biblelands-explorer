import { Globe, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MapSkin } from "./MapCanvas";

interface MapSkinToggleProps {
  skin: MapSkin;
  onToggle: () => void;
}

const MapSkinToggle = ({ skin, onToggle }: MapSkinToggleProps) => {
  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={onToggle}
      className="absolute bottom-4 right-4 z-10 h-9 w-9 shadow-lg"
      title={skin === "ancient" ? "Switch to Satellite" : "Switch to Ancient"}
    >
      {skin === "ancient" ? (
        <Globe className="h-4 w-4" />
      ) : (
        <Mountain className="h-4 w-4" />
      )}
    </Button>
  );
};

export default MapSkinToggle;
