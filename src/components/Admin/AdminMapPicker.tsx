import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Undo2, Trash2, Scissors } from "lucide-react";
import { toast } from "sonner";
const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3JvZ2Vyczg2IiwiYSI6ImNtbWg0YXNiaTBjZjgycnB0c21mbzA1MDMifQ.snS_DuU14Far-Noo4WX_rA";

const STYLE = "mapbox://styles/mapbox/outdoors-v12";

type PickerMode = "point" | "line" | "polygon";

interface AdminMapPickerProps {
  mode: PickerMode;
  initialCenter?: [number, number]; // [lng, lat]
  initialCoordinates?: number[][]; // for line/polygon editing
  onPointChange?: (lngLat: [number, number]) => void;
  onCoordinatesChange?: (coords: number[][]) => void;
  color?: string; // concrete color for map features (CSS vars don't work in Mapbox)
  className?: string;
}

export default function AdminMapPicker({
  mode,
  initialCenter,
  initialCoordinates,
  onPointChange,
  onCoordinatesChange,
  color = "#6366f1",
  className = "",
}: AdminMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [coords, setCoords] = useState<number[][]>(initialCoordinates ?? []);
  const coordsRef = useRef<number[][]>(initialCoordinates ?? []);

  // Keep ref in sync
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  // Notify parent of coordinate changes (line/polygon)
  useEffect(() => {
    if (mode !== "point" && onCoordinatesChange) {
      onCoordinatesChange(coords);
    }
  }, [coords, mode, onCoordinatesChange]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center = initialCenter ?? [35.5, 32.0];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE,
      center,
      zoom: 7,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Point mode: add draggable marker
      if (mode === "point") {
        const marker = new mapboxgl.Marker({ draggable: true, color })
          .setLngLat(center as [number, number])
          .addTo(map);
        markerRef.current = marker;

        marker.on("dragend", () => {
          const ll = marker.getLngLat();
          onPointChange?.([ll.lng, ll.lat]);
        });
      }

      // Line / Polygon: add source + layers
      if (mode === "line" || mode === "polygon") {
        map.addSource("draw-source", {
          type: "geojson",
          data: buildGeoJSON(coordsRef.current, mode),
        });

        if (mode === "polygon") {
          map.addLayer({
            id: "draw-fill",
            type: "fill",
            source: "draw-source",
            paint: { "fill-color": color, "fill-opacity": 0.15 },
            filter: ["==", "$type", "Polygon"],
          });
        }

        map.addLayer({
          id: "draw-line",
          type: "line",
          source: "draw-source",
          paint: {
            "line-color": color,
            "line-width": 2.5,
            "line-dasharray": [2, 2],
          },
          filter: ["==", "$type", "LineString"],
        });

        map.addLayer({
          id: "draw-points",
          type: "circle",
          source: "draw-source",
          paint: {
            "circle-radius": 5,
            "circle-color": "hsl(var(--primary))",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
          filter: ["==", "$type", "Point"],
        });

        // Render initial coords if present
        if (coordsRef.current.length > 0) {
          updateDrawSource(map, coordsRef.current, mode);
        }
      }
    });

    // Click handler
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;

      if (mode === "point") {
        markerRef.current?.setLngLat([lng, lat]);
        onPointChange?.([lng, lat]);
      } else {
        const next = [...coordsRef.current, [lng, lat]];
        coordsRef.current = next;
        setCoords(next);
        updateDrawSource(map, next, mode);
      }
    });

    // Double-click to finish line/polygon (prevent zoom)
    if (mode === "line" || mode === "polygon") {
      map.doubleClickZoom.disable();
    }

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Sync marker when parent changes point externally
  useEffect(() => {
    if (mode === "point" && initialCenter && markerRef.current) {
      markerRef.current.setLngLat(initialCenter);
      mapRef.current?.flyTo({ center: initialCenter, duration: 300 });
    }
  }, [initialCenter, mode]);

  const handleUndo = useCallback(() => {
    const next = coordsRef.current.slice(0, -1);
    coordsRef.current = next;
    setCoords(next);
    if (mapRef.current) updateDrawSource(mapRef.current, next, mode);
  }, [mode]);

  const handleClear = useCallback(() => {
    coordsRef.current = [];
    setCoords([]);
    if (mapRef.current) updateDrawSource(mapRef.current, [], mode);
  }, [mode]);

  const [clipping, setClipping] = useState(false);

  const handleClipToCoastline = useCallback(async () => {
    if (coords.length < 3) return;
    setClipping(true);
    try {
      const [{ default: intersect }, { polygon: turfPolygon, featureCollection }] = await Promise.all([
        import("@turf/intersect"),
        import("@turf/helpers"),
      ]);
      const landData = (await import("@/data/land-boundary.json")).default as unknown as GeoJSON.FeatureCollection;

      const closedCoords = [...coords, coords[0]];
      const drawnPoly = turfPolygon([closedCoords]);

      let clippedCoords: number[][] | null = null;

      for (const feature of landData.features) {
        if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") continue;
        const result = intersect(featureCollection([drawnPoly, feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>]));
        if (result) {
          const geom = result.geometry;
          if (geom.type === "Polygon") {
            clippedCoords = geom.coordinates[0].slice(0, -1);
          } else if (geom.type === "MultiPolygon") {
            // Use the largest ring
            let best: number[][] = [];
            for (const poly of geom.coordinates) {
              if (poly[0].length > best.length) best = poly[0];
            }
            clippedCoords = best.slice(0, -1);
          }
          break;
        }
      }

      if (!clippedCoords || clippedCoords.length < 3) {
        toast.warning("No land intersection found — the polygon may be entirely over water.");
        return;
      }

      coordsRef.current = clippedCoords;
      setCoords(clippedCoords);
      if (mapRef.current) updateDrawSource(mapRef.current, clippedCoords, mode);
      toast.success("Polygon clipped to coastline!");
    } catch (err) {
      console.error("Clip error:", err);
      toast.error("Failed to clip polygon.");
    } finally {
      setClipping(false);
    }
  }, [coords, mode]);

  return (
    <div className={`relative rounded-md border border-border overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-[280px] w-full" />
      {(mode === "line" || mode === "polygon") && coords.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={handleUndo}>
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
          {mode === "polygon" && coords.length >= 3 && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClipToCoastline} disabled={clipping}>
              <Scissors className="h-3.5 w-3.5 mr-1" /> {clipping ? "Clipping…" : "Clip to Coastline"}
            </Button>
          )}
        </div>
      )}
      {mode === "point" && (
        <p className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Click or drag marker to set location
        </p>
      )}
      {(mode === "line" || mode === "polygon") && (
        <p className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Click to add points ({coords.length} point{coords.length !== 1 ? "s" : ""})
        </p>
      )}
    </div>
  );
}

function buildGeoJSON(coords: number[][], mode: PickerMode): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Points
  for (const c of coords) {
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: {} });
  }

  // Line
  if (coords.length >= 2) {
    const lineCoords = mode === "polygon" && coords.length >= 3
      ? [...coords, coords[0]]
      : coords;

    const geomType = mode === "polygon" && coords.length >= 3 ? "Polygon" : "LineString";
    const geometry: GeoJSON.Geometry = geomType === "Polygon"
      ? { type: "Polygon", coordinates: [lineCoords] }
      : { type: "LineString", coordinates: lineCoords };

    features.push({ type: "Feature", geometry, properties: {} });
  }

  return { type: "FeatureCollection", features };
}

function updateDrawSource(map: mapboxgl.Map, coords: number[][], mode: PickerMode) {
  const src = map.getSource("draw-source") as mapboxgl.GeoJSONSource | undefined;
  if (src) {
    src.setData(buildGeoJSON(coords, mode));
  }
}
