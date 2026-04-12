import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PendingWorkout {
  id: string;
  payload: any;
  queuedAt: string;
  source: "log" | "execute";
}

interface PendingWorkoutsState {
  queue: PendingWorkout[];
  lastSyncError: string | null;
  addToQueue: (payload: any, source: "log" | "execute") => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setLastSyncError: (error: string | null) => void;
  resetStore: () => void;
}

export const usePendingWorkoutsStore = create<PendingWorkoutsState>()(
  persist(
    (set) => ({
      queue: [],
      lastSyncError: null,
      addToQueue: (payload, source) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              payload,
              queuedAt: new Date().toISOString(),
              source,
            },
          ],
        })),
      removeFromQueue: (id) =>
        set((state) => ({ queue: state.queue.filter((w) => w.id !== id) })),
      clearQueue: () => set({ queue: [] }),
      setLastSyncError: (error) => set({ lastSyncError: error }),
      resetStore: () => set({ queue: [], lastSyncError: null }),
    }),
    {
      name: "ordeal-pending-workouts",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
