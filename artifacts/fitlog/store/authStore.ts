import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { useWorkoutStore } from "./workoutStore";
import { usePhotoStore } from "./photoStore";
import { usePendingWorkoutsStore } from "./pendingWorkoutsStore";
import { useSettingsStore } from "./settingsStore";
import { useNotificationStore } from "./notificationStore";
import { useWeeklyPlanStore } from "./weeklyPlanStore";

// On native, store auth in the OS keychain via expo-secure-store.
// On web, fall back to AsyncStorage (localStorage under the hood).
const secureStorage: StateStorage =
  Platform.OS === "web"
    ? {
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: (key) => AsyncStorage.removeItem(key),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };

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
      name: "ordeal-auth",
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
