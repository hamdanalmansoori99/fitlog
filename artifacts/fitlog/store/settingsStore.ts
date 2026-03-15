import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  darkMode: boolean | null;
  unitSystem: "metric" | "imperial";
  language: "en" | "ar";
  setDarkMode: (val: boolean) => void;
  setUnitSystem: (val: "metric" | "imperial") => void;
  setLanguage: (val: "en" | "ar") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      unitSystem: "metric",
      language: "en",
      setDarkMode: (darkMode) => set({ darkMode }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "fitlog-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
