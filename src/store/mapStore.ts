import { create } from "zustand";
import type { LessonScene, SceneTextbox } from "@/types";
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

export type ToolMode = "none" | "pin_drop" | "draw_route" | "textbox_drop";

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

  // Hidden locations (greyed in controls, hidden in presentation)
  hiddenLocationIds: string[];

  // Labels
  showAllLabels: boolean;
  fogEnabled: boolean;
  labelFontSize: number;

  // Textbox state
  sceneTextboxes: SceneTextbox[];
  pendingTextboxCoords: [number, number] | null;

  // Scene state
  scenes: LessonScene[];
  currentSceneIndex: number | null;

  setEra: (era: EraId) => void;
  toggleOverlay: (id: string) => void;
  selectPin: (id: string | null) => void;

  // Label actions
  toggleShowAllLabels: () => void;
  toggleFog: () => void;
  setLabelFontSize: (size: number) => void;

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

  // Hidden location actions
  toggleHideLocation: (id: string) => void;
  setHiddenLocationIds: (ids: string[]) => void;

  // Textbox actions
  startTextboxDrop: () => void;
  setPendingTextboxCoords: (coords: [number, number]) => void;
  clearPendingTextbox: () => void;
  addTextbox: (tb: SceneTextbox) => void;
  removeTextbox: (id: string) => void;
  updateTextbox: (id: string, updates: Partial<SceneTextbox>) => void;
  setSceneTextboxes: (tbs: SceneTextbox[]) => void;

  // Year filter
  yearFilter: [number, number] | null;
  setYearFilter: (range: [number, number]) => void;
  clearYearFilter: () => void;

  // Scene actions
  setScenes: (scenes: LessonScene[]) => void;
  saveScene: (camera: CameraState, lessonId: string, userId: string) => LessonScene | null;
  loadScene: (index: number, map: mapboxgl.Map) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (newOrder: LessonScene[]) => void;
  renameScene: (id: string, title: string) => void;
  toggleSceneAnimation: (id: string) => void;
  updateScene: (id: string, camera: CameraState) => LessonScene | null;
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
  hiddenLocationIds: [],
  yearFilter: null,
  showAllLabels: false,
  fogEnabled: true,
  labelFontSize: 1.0,
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
      yearFilter: null,
    }),

  toggleOverlay: (id) =>
    set((s) => ({
      activeOverlayIds: s.activeOverlayIds.includes(id)
        ? s.activeOverlayIds.filter((x) => x !== id)
        : [...s.activeOverlayIds, id],
    })),

  selectPin: (id) => set({ selectedPinId: id }),

  toggleShowAllLabels: () => set((s) => ({ showAllLabels: !s.showAllLabels })),
  toggleFog: () => set((s) => ({ fogEnabled: !s.fogEnabled })),
  setLabelFontSize: (size) => set({ labelFontSize: size }),

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

  toggleHideLocation: (id) =>
    set((s) => ({
      hiddenLocationIds: s.hiddenLocationIds.includes(id)
        ? s.hiddenLocationIds.filter((x) => x !== id)
        : [...s.hiddenLocationIds, id],
    })),

  setHiddenLocationIds: (ids) => set({ hiddenLocationIds: ids }),

  // Year filter actions
  setYearFilter: (range) => set({ yearFilter: range }),
  clearYearFilter: () => set({ yearFilter: null }),

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
      animate_on_enter: false,
      auto_advance_seconds: null,
      era: s.currentEra,
      hidden_location_ids: [...s.hiddenLocationIds],
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
      currentEra: scene.era as EraId,
      hiddenLocationIds: [...scene.hidden_location_ids],
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

  toggleSceneAnimation: (id) =>
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === id ? { ...sc, animate_on_enter: !sc.animate_on_enter } : sc
      ),
    })),

  updateScene: (id, camera) => {
    const s = get();
    const scene = s.scenes.find((sc) => sc.id === id);
    if (!scene) return null;
    const updated: LessonScene = {
      ...scene,
      center_lng: camera.center_lng,
      center_lat: camera.center_lat,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      active_overlay_ids: [...s.activeOverlayIds],
      visible_pin_ids: [...s.customPinIds],
      highlighted_pin_id: s.selectedPinId,
      era: s.currentEra,
      hidden_location_ids: [...s.hiddenLocationIds],
    };
    set({
      scenes: s.scenes.map((sc) => (sc.id === id ? updated : sc)),
    });
    return updated;
  },
}));
