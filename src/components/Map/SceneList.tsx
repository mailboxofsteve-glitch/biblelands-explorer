import { useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMapStore } from "@/store/mapStore";
import { useScenes } from "@/hooks/useScenes";
import { useOverlays } from "@/hooks/useOverlays";
import { useAuth } from "@/hooks/useAuth";
import { Play, Trash2, Plus, GripVertical, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { LessonScene } from "@/types";
import type { MapCanvasHandle } from "./MapCanvas";
import { animateRoutesSequentially } from "@/lib/animateRoute";

interface SceneCardProps {
  scene: LessonScene;
  index: number;
  onPlay: (index: number) => void;
  onDelete: (id: string) => void;
  onRenameTitle: (id: string, title: string) => void;
  onToggleAnimate: (id: string) => void;
}

function SceneCard({ scene, index, onPlay, onDelete, onRenameTitle, onToggleAnimate }: SceneCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(scene.title);
  const currentSceneIndex = useMapStore((s) => s.currentSceneIndex);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = currentSceneIndex === index;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
        isActive
          ? "bg-accent/20 border border-accent/30"
          : "bg-secondary/30 border border-border/20 hover:bg-secondary/50"
      }`}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>

      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
        {index + 1}
      </span>

      {editing ? (
        <input
          className="flex-1 min-w-0 bg-transparent border-b border-foreground/30 text-xs text-foreground outline-none"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (title.trim() && title !== scene.title) {
              onRenameTitle(scene.id, title.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      ) : (
        <span
          className="flex-1 min-w-0 truncate cursor-pointer text-foreground/80"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          {scene.title}
        </span>
      )}

      <button
        onClick={() => onToggleAnimate(scene.id)}
        className={`shrink-0 transition-colors ${
          scene.animate_on_enter
            ? "text-accent"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        }`}
        title={scene.animate_on_enter ? "Route animation ON" : "Route animation OFF"}
      >
        <Sparkles size={12} />
      </button>
      <button
        onClick={() => onPlay(index)}
        className="shrink-0 text-accent hover:text-accent/80"
        title="Play scene"
      >
        <Play size={13} />
      </button>
      <button
        onClick={() => onDelete(scene.id)}
        className="shrink-0 text-destructive/60 hover:text-destructive"
        title="Delete scene"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

interface SceneListProps {
  mapRef: React.RefObject<MapCanvasHandle | null>;
}

export default function SceneList({ mapRef }: SceneListProps) {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const scenes = useMapStore((s) => s.scenes);
  const saveScene = useMapStore((s) => s.saveScene);
  const loadScene = useMapStore((s) => s.loadScene);
  const deleteScene = useMapStore((s) => s.deleteScene);
  const reorderScenes = useMapStore((s) => s.reorderScenes);
  const renameScene = useMapStore((s) => s.renameScene);
  const toggleSceneAnimation = useMapStore((s) => s.toggleSceneAnimation);
  const activeOverlayIds = useMapStore((s) => s.activeOverlayIds);

  const { persistScene, deleteSceneFromDb, persistOrder, updateTitle } =
    useScenes(lessonId);
  const { overlays } = useOverlays();

  const animCancelRef = useRef<(() => void) | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleSave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !lessonId || !user) {
      toast.error("Map not ready");
      return;
    }

    const center = map.getCenter();
    const newScene = saveScene(
      {
        center_lng: center.lng,
        center_lat: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      },
      lessonId,
      user.id
    );
    if (newScene) {
      persistScene(newScene);
      toast.success(`Saved "${newScene.title}"`);
    }
  }, [mapRef, lessonId, user, saveScene, persistScene]);

  const triggerRouteAnimation = useCallback(
    (scene: LessonScene) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Find line overlays in the scene's active overlays
      const lineOverlays = overlays.filter((o) => {
        if (!scene.active_overlay_ids.includes(o.id)) return false;
        const geojson = o.geojson as any;
        const geomType = geojson?.type === "FeatureCollection"
          ? geojson.features?.[0]?.geometry?.type
          : geojson?.type === "Feature"
            ? geojson.geometry?.type
            : geojson?.type;
        return geomType?.toLowerCase().includes("line");
      });

      if (lineOverlays.length === 0) return;

      const routes = lineOverlays.map((o) => ({
        geojson: o.geojson as unknown as GeoJSON.GeoJSON,
        color: o.default_color,
      }));

      animCancelRef.current?.();
      const { cancel } = animateRoutesSequentially(map, routes, { duration: 3000 });
      animCancelRef.current = cancel;
    },
    [mapRef, overlays]
  );

  const handlePlay = useCallback(
    (index: number) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      loadScene(index, map);

      const scene = scenes[index];
      if (scene?.animate_on_enter) {
        // Trigger after flyTo completes
        setTimeout(() => triggerRouteAnimation(scene), 1400);
      }
    },
    [mapRef, loadScene, scenes, triggerRouteAnimation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteScene(id);
      deleteSceneFromDb(id);
    },
    [deleteScene, deleteSceneFromDb]
  );

  const handleRename = useCallback(
    (id: string, title: string) => {
      renameScene(id, title);
      updateTitle(id, title);
    },
    [renameScene, updateTitle]
  );

  const handleToggleAnimate = useCallback(
    (id: string) => {
      toggleSceneAnimation(id);
      // Persist the change
      const scene = scenes.find((s) => s.id === id);
      if (scene) {
        supabase
          .from("lesson_scenes")
          .update({ animate_on_enter: !scene.animate_on_enter })
          .eq("id", id)
          .then();
      }
    },
    [toggleSceneAnimation, scenes]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(scenes, oldIndex, newIndex).map((s, i) => ({
        ...s,
        scene_order: i,
      }));

      reorderScenes(newOrder);
      persistOrder(newOrder);
    },
    [scenes, reorderScenes, persistOrder]
  );

  return (
    <div className="px-2 py-3 border-t border-border/40">
      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">
        Lesson Scenes
      </h3>

      {scenes.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1 mb-2">
              {scenes.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  index={i}
                  onPlay={handlePlay}
                  onDelete={handleDelete}
                  onRenameTitle={handleRename}
                  onToggleAnimate={handleToggleAnimate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] py-2 px-2 rounded border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Plus size={13} />
        Save Current View as Scene
      </button>
    </div>
  );
}
