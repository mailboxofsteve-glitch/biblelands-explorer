import { create } from "zustand";
import type { LessonScene } from "@/types";
import mapboxgl from "mapbox-gl";

export const ERAS = [
  { id: "patriarchs", label: "Patriarchs" },
  { id: "exodus", label: "Exodus" },
  { id: "judges", label: "Judges" },
  { id: "united_kingdom", label: "United Kingdom" },
  { id: "divided_kingdom", label: "Divided Kingdom" },
  { id: "exile", label: "Exile" },
  { id: "nt_ministry", label: "NT Ministry" },
  { id: "early_church", label: "Early Church" },
] as const;

export type EraId = (typeof ERAS)[number]["id"];

export type ToolMode = "none" | "pin_drop" | "draw_route";

interface UndoEntry {
  type: "pin" | "route_point";
  pinId?: string;
}

interface CameraState {
  center_lng: number;
  center_lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

interface MapState {
  currentEra: EraId;
  activeOverlayIds: string[];
  selectedPinId: string | null;

  // Tool state
  toolMode: ToolMode;
  pinDropIconType: string;
  pendingPinCoords: [number, number] | null;
  routePoints: [number, number][];
  undoStack: UndoEntry[];
  customPinIds: string[];
  customOverlayIds: string[];

  // Scene state
  scenes: LessonScene[];
  currentSceneIndex: number | null;

  setEra: (era: EraId) => void;
  toggleOverlay: (id: string) => void;
  selectPin: (id: string | null) => void;

  // Tool actions
  startPinDrop: (iconType: string) => void;
  setPendingPinCoords: (coords: [number, number]) => void;
  clearPendingPin: () => void;
  addCustomPin: (id: string) => void;
  startDrawRoute: () => void;
  addRoutePoint: (point: [number, number]) => void;
  undoLastRoutePoint: () => void;
  finishRoute: () => void;
  addCustomOverlay: (id: string) => void;
  cancelTool: () => void;
  undoLast: () => void;
  removeCustomPin: (id: string) => void;
  removeCustomOverlay: (id: string) => void;
  clearAllCustom: () => void;

  // Scene actions
  setScenes: (scenes: LessonScene[]) => void;
  saveScene: (camera: CameraState, lessonId: string, userId: string) => LessonScene | null;
  loadScene: (index: number, map: mapboxgl.Map) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (newOrder: LessonScene[]) => void;
  renameScene: (id: string, title: string) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  currentEra: "nt_ministry",
  activeOverlayIds: [],
  selectedPinId: null,
  toolMode: "none",
  pinDropIconType: "city",
  pendingPinCoords: null,
  routePoints: [],
  undoStack: [],
  customPinIds: [],
  customOverlayIds: [],
  scenes: [],
  currentSceneIndex: null,

  setEra: (era) =>
    set({
      currentEra: era,
      activeOverlayIds: [],
      selectedPinId: null,
      toolMode: "none",
      routePoints: [],
      pendingPinCoords: null,
    }),

  toggleOverlay: (id) =>
    set((s) => ({
      activeOverlayIds: s.activeOverlayIds.includes(id)
        ? s.activeOverlayIds.filter((x) => x !== id)
        : [...s.activeOverlayIds, id],
    })),

  selectPin: (id) => set({ selectedPinId: id }),

  startPinDrop: (iconType) =>
    set({ toolMode: "pin_drop", pinDropIconType: iconType, pendingPinCoords: null }),

  setPendingPinCoords: (coords) => set({ pendingPinCoords: coords }),

  clearPendingPin: () => set({ pendingPinCoords: null, toolMode: "none" }),

  addCustomPin: (id) =>
    set((s) => ({
      customPinIds: [...s.customPinIds, id],
      undoStack: [...s.undoStack, { type: "pin", pinId: id }],
      toolMode: "none",
      pendingPinCoords: null,
    })),

  startDrawRoute: () => set({ toolMode: "draw_route", routePoints: [] }),

  addRoutePoint: (point) =>
    set((s) => ({
      routePoints: [...s.routePoints, point],
      undoStack: [...s.undoStack, { type: "route_point" }],
    })),

  undoLastRoutePoint: () =>
    set((s) => ({
      routePoints: s.routePoints.slice(0, -1),
      undoStack: s.undoStack.slice(0, -1),
    })),

  finishRoute: () => set({ routePoints: [] }),

  addCustomOverlay: (id) =>
    set((s) => ({
      customOverlayIds: [...s.customOverlayIds, id],
      activeOverlayIds: [...s.activeOverlayIds, id],
      toolMode: "none",
      routePoints: [],
    })),

  cancelTool: () => set({ toolMode: "none", pendingPinCoords: null, routePoints: [] }),

  undoLast: () => {
    const s = get();
    if (s.undoStack.length === 0) return;
    const last = s.undoStack[s.undoStack.length - 1];
    if (last.type === "route_point" && s.toolMode === "draw_route") {
      set({
        routePoints: s.routePoints.slice(0, -1),
        undoStack: s.undoStack.slice(0, -1),
      });
    } else if (last.type === "pin" && last.pinId) {
      set({
        customPinIds: s.customPinIds.filter((id) => id !== last.pinId),
        undoStack: s.undoStack.slice(0, -1),
      });
    }
  },

  removeCustomPin: (id) =>
    set((s) => ({ customPinIds: s.customPinIds.filter((x) => x !== id) })),

  removeCustomOverlay: (id) =>
    set((s) => ({
      customOverlayIds: s.customOverlayIds.filter((x) => x !== id),
      activeOverlayIds: s.activeOverlayIds.filter((x) => x !== id),
    })),

  clearAllCustom: () =>
    set((s) => ({
      customPinIds: [],
      customOverlayIds: [],
      activeOverlayIds: s.activeOverlayIds.filter(
        (id) => !s.customOverlayIds.includes(id)
      ),
      undoStack: [],
    })),

  // Scene actions
  setScenes: (scenes) => set({ scenes }),

  saveScene: (camera, lessonId, userId) => {
    const s = get();
    const newScene: LessonScene = {
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      created_by: userId,
      scene_order: s.scenes.length,
      title: `Scene ${s.scenes.length + 1}`,
      center_lng: camera.center_lng,
      center_lat: camera.center_lat,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      active_overlay_ids: [...s.activeOverlayIds],
      visible_pin_ids: [...s.customPinIds],
      highlighted_pin_id: s.selectedPinId,
    };
    set({
      scenes: [...s.scenes, newScene],
      currentSceneIndex: s.scenes.length,
    });
    return newScene;
  },

  loadScene: (index, map) => {
    const s = get();
    const scene = s.scenes[index];
    if (!scene) return;

    map.flyTo({
      center: [scene.center_lng, scene.center_lat],
      zoom: scene.zoom,
      bearing: scene.bearing,
      pitch: scene.pitch,
      duration: 1200,
    });

    set({
      activeOverlayIds: [...scene.active_overlay_ids],
      currentSceneIndex: index,
    });

    if (scene.highlighted_pin_id) {
      setTimeout(() => {
        set({ selectedPinId: scene.highlighted_pin_id });
      }, 1300);
    }
  },

  deleteScene: (id) =>
    set((s) => {
      const filtered = s.scenes
        .filter((sc) => sc.id !== id)
        .map((sc, i) => ({ ...sc, scene_order: i }));
      return { scenes: filtered, currentSceneIndex: null };
    }),

  reorderScenes: (newOrder) => set({ scenes: newOrder }),

  renameScene: (id, title) =>
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, title } : sc)),
    })),
}));
