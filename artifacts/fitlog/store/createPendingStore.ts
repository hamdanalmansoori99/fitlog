import { create, type StoreApi } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PendingItem<T = any> {
  id: string;
  payload: T;
  queuedAt: string;
}

export interface PendingState<T = any> {
  queue: PendingItem<T>[];
  lastSyncError: string | null;
  addToQueue: (payload: T) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setLastSyncError: (error: string | null) => void;
  resetStore: () => void;
}

export function createPendingStore<T = any>(name: string) {
  return create<PendingState<T>>()(
    persist(
      (set) => ({
        queue: [],
        lastSyncError: null,
        addToQueue: (payload) =>
          set((state) => ({
            queue: [
              ...state.queue,
              {
                id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                payload,
                queuedAt: new Date().toISOString(),
              },
            ],
          })),
        removeFromQueue: (id) =>
          set((state) => ({ queue: state.queue.filter((item) => item.id !== id) })),
        clearQueue: () => set({ queue: [] }),
        setLastSyncError: (error) => set({ lastSyncError: error }),
        resetStore: () => set({ queue: [], lastSyncError: null }),
      }),
      {
        name: `ordeal-pending-${name}`,
        storage: createJSONStorage(() => AsyncStorage),
      }
    )
  );
}
