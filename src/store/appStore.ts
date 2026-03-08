import { create } from "zustand";
import type { Lesson } from "@/types";

interface AppState {
  currentLesson: Lesson | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentLesson: null,
  setCurrentLesson: (lesson) => set({ currentLesson: lesson }),
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
