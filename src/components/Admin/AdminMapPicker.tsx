import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Undo2, Trash2, Scissors, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoic3JvZ2Vyczg2IiwiYSI6ImNtbWg0YXNiaTBjZjgycnB0c21mbzA1MDMifQ.snS_DuU14Far-Noo4WX_rA";
const STYLE = "mapbox://styles/mapbox/outdoors-v12";

type PickerMode = "point" | "line" | "polygon";

interface AdminMapPickerProps {
  mode: PickerMode;
  initialCenter?: [number, number];
  /** Multi-shape initial data: array of shapes, each shape is array of [lng, lat] points */
  initialShapes?: number[][][];
  /** @deprecated Use initialShapes instead */
  initialCoordinates?: number[][];
  onPointChange?: (lngLat: [number, number]) => void;
  /** Called with all shapes whenever any shape changes */
  onShapesChange?: (shapes: number[][][]) => void;
  /** @deprecated Use onShapesChange instead */
  onCoordinatesChange?: (coords: number[][]) => void;
  color?: string;
  className?: string;
}

export default function AdminMapPicker({
  mode,
  initialCenter,
  initialShapes,
  initialCoordinates,
  onPointChange,
  onShapesChange,
  onCoordinatesChange,
  color = "#6366f1",
  className = "",
}: AdminMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Normalize initial data into shapes array
  const getInitialShapes = (): number[][][] => {
    if (initialShapes && initialShapes.length > 0) return initialShapes;
    if (initialCoordinates && initialCoordinates.length > 0) return [initialCoordinates];
    return [[]];
  };

  const [shapes, setShapes] = useState<number[][][]>(getInitialShapes);
  const [activeIdx, setActiveIdx] = useState(0);
  const shapesRef = useRef<number[][][]>(getInitialShapes());
  const activeIdxRef = useRef(0);

  // Drag state
  const draggingRef = useRef<{ shapeIdx: number; pointIdx: number } | null>(null);

  // Keep refs in sync
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // Notify parent
  useEffect(() => {
    if (mode === "point") return;
    if (onShapesChange) {
      const nonEmpty = shapes.filter(s => s.length > 0);
      if (nonEmpty.length > 0) onShapesChange(nonEmpty);
    } else if (onCoordinatesChange) {
      // Legacy single-shape fallback
      const active = shapes[activeIdx];
      if (active && active.length >= 2) onCoordinatesChange(active);
    }
  }, [shapes, activeIdx, mode, onShapesChange, onCoordinatesChange]);

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

    map.on("load", async () => {
      // Load reference locations and overlays
      try {
        const [{ data: locs }, { data: ovs }] = await Promise.all([
          supabase.from("locations_with_coords").select("id, name_ancient, lat, lng"),
          supabase.from("overlays").select("id, name, geojson, default_color").eq("is_preloaded", true),
        ]);

        if (locs && locs.length > 0) {
          const locFeatures: GeoJSON.Feature[] = locs
            .filter((l: any) => l.lat && l.lng)
            .map((l: any) => ({
              type: "Feature" as const,
              properties: { name: l.name_ancient },
              geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
            }));
          map.addSource("ref-locations", { type: "geojson", data: { type: "FeatureCollection", features: locFeatures } });
          map.addLayer({
            id: "ref-locations-circle",
            type: "circle",
            source: "ref-locations",
            paint: { "circle-radius": 3, "circle-color": "#94a3b8", "circle-opacity": 0.6 },
          });
          map.addLayer({
            id: "ref-locations-label",
            type: "symbol",
            source: "ref-locations",
            layout: {
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.2],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
              "text-allow-overlap": false,
            },
            paint: { "text-color": "#94a3b8", "text-halo-color": "#1e293b", "text-halo-width": 1, "text-opacity": 0.7 },
          });
        }

        if (ovs && ovs.length > 0) {
          for (const ov of ovs) {
            const geo = ov.geojson as any;
            if (!geo || (!geo.features && !geo.coordinates)) continue;
            const srcId = `ref-overlay-${ov.id}`;
            map.addSource(srcId, { type: "geojson", data: geo as GeoJSON.GeoJSON });
            map.addLayer({
              id: `${srcId}-line`,
              type: "line",
              source: srcId,
              filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "MultiLineString"]],
              paint: { "line-color": ov.default_color || "#94a3b8", "line-width": 1.5, "line-opacity": 0.25 },
            });
            map.addLayer({
              id: `${srcId}-fill`,
              type: "fill",
              source: srcId,
              filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
              paint: { "fill-color": ov.default_color || "#94a3b8", "fill-opacity": 0.08 },
            });
          }
        }
      } catch { /* reference layers are non-critical */ }

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

      if (mode === "line" || mode === "polygon") {
        // All shapes (inactive) layer
        map.addSource("all-shapes-source", {
          type: "geojson",
          data: buildAllShapesGeoJSON(shapesRef.current, activeIdxRef.current, mode),
        });

        if (mode === "polygon") {
          map.addLayer({
            id: "all-shapes-fill",
            type: "fill",
            source: "all-shapes-source",
            paint: { "fill-color": color, "fill-opacity": 0.08 },
            filter: ["==", "$type", "Polygon"],
          });
        }
        map.addLayer({
          id: "all-shapes-line",
          type: "line",
          source: "all-shapes-source",
          paint: { "line-color": color, "line-width": 1.5, "line-opacity": 0.4 },
          filter: ["==", "$type", "LineString"],
        });

        // Active shape source + layers
        map.addSource("draw-source", {
          type: "geojson",
          data: buildActiveShapeGeoJSON(shapesRef.current[activeIdxRef.current] ?? [], mode),
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
          paint: { "line-color": color, "line-width": 2.5, "line-dasharray": [2, 2] },
          filter: ["==", "$type", "LineString"],
        });
        map.addLayer({
          id: "draw-points",
          type: "circle",
          source: "draw-source",
          paint: {
            "circle-radius": 6,
            "circle-color": color,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
          filter: ["==", "$type", "Point"],
        });

        // Render initial data
        refreshSources(map);

        // --- Drag-to-move points ---
        map.on("mouseenter", "draw-points", () => {
          map.getCanvas().style.cursor = "grab";
        });
        map.on("mouseleave", "draw-points", () => {
          if (!draggingRef.current) map.getCanvas().style.cursor = "";
        });

        map.on("mousedown", "draw-points", (e) => {
          if (!e.features?.[0]) return;
          e.preventDefault();
          const props = e.features[0].properties as any;
          draggingRef.current = { shapeIdx: activeIdxRef.current, pointIdx: props.pointIndex };
          map.getCanvas().style.cursor = "grabbing";
          map.dragPan.disable();
        });

        map.on("mousemove", (e) => {
          if (!draggingRef.current) return;
          const { shapeIdx, pointIdx } = draggingRef.current;
          const { lng, lat } = e.lngLat;
          const next = shapesRef.current.map((s, si) =>
            si === shapeIdx ? s.map((p, pi) => (pi === pointIdx ? [lng, lat] : p)) : s
          );
          shapesRef.current = next;
          refreshSources(map);
        });

        map.on("mouseup", () => {
          if (!draggingRef.current) return;
          draggingRef.current = null;
          map.getCanvas().style.cursor = "";
          map.dragPan.enable();
          setShapes([...shapesRef.current]);
        });
      }
    });

    // Click to add points
    map.on("click", (e) => {
      if (draggingRef.current) return;
      const { lng, lat } = e.lngLat;

      if (mode === "point") {
        markerRef.current?.setLngLat([lng, lat]);
        onPointChange?.([lng, lat]);
      } else {
        const idx = activeIdxRef.current;
        const next = shapesRef.current.map((s, i) =>
          i === idx ? [...s, [lng, lat]] : s
        );
        shapesRef.current = next;
        setShapes(next);
        refreshSources(map);
      }
    });

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

  // Sync colors
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === "point") return;
    try {
      if (map.getLayer("draw-fill")) map.setPaintProperty("draw-fill", "fill-color", color);
      if (map.getLayer("draw-line")) map.setPaintProperty("draw-line", "line-color", color);
      if (map.getLayer("draw-points")) map.setPaintProperty("draw-points", "circle-color", color);
      if (map.getLayer("all-shapes-fill")) map.setPaintProperty("all-shapes-fill", "fill-color", color);
      if (map.getLayer("all-shapes-line")) map.setPaintProperty("all-shapes-line", "line-color", color);
    } catch { /* layers not ready */ }
  }, [color, mode]);

  // When activeIdx changes, refresh map sources
  useEffect(() => {
    if (mapRef.current) refreshSources(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Sync marker for point mode
  useEffect(() => {
    if (mode === "point" && initialCenter && markerRef.current) {
      markerRef.current.setLngLat(initialCenter);
      mapRef.current?.flyTo({ center: initialCenter, duration: 300 });
    }
  }, [initialCenter, mode]);

  function refreshSources(map: mapboxgl.Map) {
    const drawSrc = map.getSource("draw-source") as mapboxgl.GeoJSONSource | undefined;
    const allSrc = map.getSource("all-shapes-source") as mapboxgl.GeoJSONSource | undefined;
    if (drawSrc) drawSrc.setData(buildActiveShapeGeoJSON(shapesRef.current[activeIdxRef.current] ?? [], mode));
    if (allSrc) allSrc.setData(buildAllShapesGeoJSON(shapesRef.current, activeIdxRef.current, mode));
  }

  const activeCoords = shapes[activeIdx] ?? [];

  const handleUndo = useCallback(() => {
    const idx = activeIdxRef.current;
    const next = shapesRef.current.map((s, i) => (i === idx ? s.slice(0, -1) : s));
    shapesRef.current = next;
    setShapes(next);
    if (mapRef.current) refreshSources(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearShape = useCallback(() => {
    const idx = activeIdxRef.current;
    const next = shapesRef.current.map((s, i) => (i === idx ? [] : s));
    shapesRef.current = next;
    setShapes(next);
    if (mapRef.current) refreshSources(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewShape = useCallback(() => {
    const next = [...shapesRef.current, []];
    shapesRef.current = next;
    setShapes(next);
    setActiveIdx(next.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteShape = useCallback(() => {
    if (shapesRef.current.length <= 1) {
      // Just clear the only shape
      handleClearShape();
      return;
    }
    const idx = activeIdxRef.current;
    const next = shapesRef.current.filter((_, i) => i !== idx);
    shapesRef.current = next;
    setShapes(next);
    setActiveIdx(Math.min(idx, next.length - 1));
    if (mapRef.current) refreshSources(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleClearShape]);

  const [clipping, setClipping] = useState(false);
  const handleClipToCoastline = useCallback(async () => {
    const coords = shapesRef.current[activeIdxRef.current];
    if (!coords || coords.length < 3) return;
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
      const idx = activeIdxRef.current;
      const next = shapesRef.current.map((s, i) => (i === idx ? clippedCoords! : s));
      shapesRef.current = next;
      setShapes(next);
      if (mapRef.current) refreshSources(mapRef.current);
      toast.success("Shape clipped to coastline!");
    } catch (err) {
      console.error("Clip error:", err);
      toast.error("Failed to clip polygon.");
    } finally {
      setClipping(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalShapes = shapes.length;

  return (
    <div className={`relative rounded-md border border-border overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-[280px] w-full" />

      {/* Top-left info */}
      {(mode === "line" || mode === "polygon") && (
        <p className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Click to add points · Drag to move ({activeCoords.length} pt{activeCoords.length !== 1 ? "s" : ""})
        </p>
      )}
      {mode === "point" && (
        <p className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Click or drag marker to set location
        </p>
      )}

      {/* Bottom toolbar for line/polygon */}
      {(mode === "line" || mode === "polygon") && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1">
          {activeCoords.length > 0 && (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={handleUndo}>
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleClearShape}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </>
          )}
          {mode === "polygon" && activeCoords.length >= 3 && (
            <Button type="button" variant="secondary" size="sm" onClick={handleClipToCoastline} disabled={clipping}>
              <Scissors className="h-3.5 w-3.5 mr-1" /> {clipping ? "Clipping…" : "Clip"}
            </Button>
          )}

          {/* Spacer pushes shape controls to the right */}
          <div className="flex-1" />

          {/* Shape navigator */}
          {totalShapes > 1 && (
            <div className="flex items-center gap-0.5 bg-background/80 rounded px-1.5 py-0.5 text-xs">
              <Button
                type="button" variant="ghost" size="icon"
                className="h-5 w-5"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx(i => i - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-muted-foreground">
                Shape {activeIdx + 1}/{totalShapes}
              </span>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-5 w-5"
                disabled={activeIdx >= totalShapes - 1}
                onClick={() => setActiveIdx(i => i + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={handleDeleteShape}>
            <X className="h-3.5 w-3.5 mr-1" /> Del Shape
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleNewShape}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Shape
          </Button>
        </div>
      )}
    </div>
  );
}

/** Build GeoJSON for the active shape with indexed points (for drag identification) */
function buildActiveShapeGeoJSON(coords: number[][], mode: PickerMode): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Indexed points
  for (let i = 0; i < coords.length; i++) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: coords[i] },
      properties: { pointIndex: i },
    });
  }

  // Line / polygon shape
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

/** Build GeoJSON for all shapes EXCEPT the active one (shown dimmed) */
function buildAllShapesGeoJSON(shapes: number[][][], activeIdx: number, mode: PickerMode): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (let si = 0; si < shapes.length; si++) {
    if (si === activeIdx) continue; // active shape is rendered separately
    const coords = shapes[si];
    if (coords.length < 2) continue;

    const lineCoords = mode === "polygon" && coords.length >= 3
      ? [...coords, coords[0]]
      : coords;
    const geomType = mode === "polygon" && coords.length >= 3 ? "Polygon" : "LineString";
    const geometry: GeoJSON.Geometry = geomType === "Polygon"
      ? { type: "Polygon", coordinates: [lineCoords] }
      : { type: "LineString", coordinates: lineCoords };
    features.push({ type: "Feature", geometry, properties: { shapeIndex: si } });
  }

  return { type: "FeatureCollection", features };
}
