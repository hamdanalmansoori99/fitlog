import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";

interface SettingsState {
  darkMode: boolean | null;
  unitSystem: "metric" | "imperial";
  language: "en" | "ar";
  lastSynced: number | null;
  setDarkMode: (val: boolean) => void;
  setUnitSystem: (val: "metric" | "imperial") => void;
  setLanguage: (val: "en" | "ar") => void;
  syncToServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      darkMode: true,
      unitSystem: "metric",
      language: "en",
      lastSynced: null,

      setDarkMode: (darkMode) => {
        set({ darkMode });
        get().syncToServer().catch(() => {});
      },

      setUnitSystem: (unitSystem) => {
        set({ unitSystem });
        get().syncToServer().catch(() => {});
      },

      setLanguage: (language) => {
        set({ language });
        get().syncToServer().catch(() => {});
      },

      syncToServer: async () => {
        try {
          const { darkMode, unitSystem, language } = get();
          await api.updateSettings({ darkMode, unitSystem, language });
          set({ lastSynced: Date.now() });
        } catch (err) {
          console.warn("[SettingsStore] sync to server failed:", err);
        }
      },

      fetchFromServer: async () => {
        try {
          const remote = await api.getSettings();
          set({
            ...(remote.darkMode !== undefined && { darkMode: remote.darkMode }),
            ...(remote.unitSystem !== undefined && { unitSystem: remote.unitSystem }),
            ...(remote.language !== undefined && { language: remote.language }),
            lastSynced: Date.now(),
          });
        } catch (err) {
          console.warn("[SettingsStore] fetch from server failed:", err);
        }
      },
    }),
    {
      name: "fitlog-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
