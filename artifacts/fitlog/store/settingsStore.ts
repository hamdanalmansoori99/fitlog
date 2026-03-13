import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  darkMode: boolean | null;
  unitSystem: "metric" | "imperial";
  setDarkMode: (val: boolean) => void;
  setUnitSystem: (val: "metric" | "imperial") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      unitSystem: "metric",
      setDarkMode: (darkMode) => set({ darkMode }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    {
      name: "fitlog-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
