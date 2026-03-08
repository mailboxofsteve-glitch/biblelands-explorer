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

interface MapState {
  currentEra: EraId;
  activeOverlayIds: string[];
  selectedPinId: string | null;
  setEra: (era: EraId) => void;
  toggleOverlay: (id: string) => void;
  selectPin: (id: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentEra: "nt_ministry",
  activeOverlayIds: [],
  selectedPinId: null,
  setEra: (era) => set({ currentEra: era, activeOverlayIds: [], selectedPinId: null }),
  toggleOverlay: (id) =>
    set((s) => ({
      activeOverlayIds: s.activeOverlayIds.includes(id)
        ? s.activeOverlayIds.filter((x) => x !== id)
        : [...s.activeOverlayIds, id],
    })),
  selectPin: (id) => set({ selectedPinId: id }),
}));
