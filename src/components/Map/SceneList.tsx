import { useState, useCallback } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { Play, Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { LessonScene } from "@/types";
import type { MapCanvasHandle } from "./MapCanvas";

interface SceneCardProps {
  scene: LessonScene;
  index: number;
  onPlay: (index: number) => void;
  onDelete: (id: string) => void;
  onRenameTitle: (id: string, title: string) => void;
}

function SceneCard({ scene, index, onPlay, onDelete, onRenameTitle }: SceneCardProps) {
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
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
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

  const { persistScene, deleteSceneFromDb, persistOrder, updateTitle } =
    useScenes(lessonId);

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

  const handlePlay = useCallback(
    (index: number) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      loadScene(index, map);
    },
    [mapRef, loadScene]
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
