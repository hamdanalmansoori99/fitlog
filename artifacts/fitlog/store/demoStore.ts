import { create } from "zustand";

interface DemoState {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

export const useDemoStore = create<DemoState>()((set) => ({
  isDemo: false,
  enterDemo: () => set({ isDemo: true }),
  exitDemo: () => set({ isDemo: false }),
}));
