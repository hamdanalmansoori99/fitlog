import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProgressPhoto {
  id: string;
  uri: string;
  date: string;
  note: string;
  serverId?: number;
}

interface PhotoState {
  photos: ProgressPhoto[];
  addPhoto: (photo: Omit<ProgressPhoto, "id">) => void;
  deletePhoto: (id: string) => void;
  resetStore: () => void;
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set) => ({
      photos: [],
      addPhoto: (photo) =>
        set((s) => ({
          photos: [
            ...s.photos,
            { ...photo, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
          ],
        })),
      deletePhoto: (id) =>
        set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
      resetStore: () => set({ photos: [] }),
    }),
    {
      name: "fitlog-progress-photos",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
