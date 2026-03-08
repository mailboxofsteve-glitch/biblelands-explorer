import { create } from "zustand";

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
}));
