import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useWorkoutStore } from "./workoutStore";
import { usePhotoStore } from "./photoStore";
import { usePendingWorkoutsStore } from "./pendingWorkoutsStore";
import { useSettingsStore } from "./settingsStore";
import { useNotificationStore } from "./notificationStore";
import { useWeeklyPlanStore } from "./weeklyPlanStore";

interface AuthState {
  token: string | null;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  _hydrated: boolean;
  setAuth: (token: string, user: AuthState["user"]) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => {
        set({ token: null, user: null });
        useWorkoutStore.getState().resetStore();
        usePhotoStore.getState().resetStore();
        usePendingWorkoutsStore.getState().resetStore();
        useSettingsStore.getState().resetStore();
        useNotificationStore.getState().resetStore();
        useWeeklyPlanStore.getState().clearPlan();
      },
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: "fitlog-auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
