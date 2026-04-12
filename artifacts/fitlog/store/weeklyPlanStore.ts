import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PlannedMeal {
  name: string;
  description: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PlannedDay {
  date: string;
  meals: PlannedMeal[];
}

interface WeeklyPlanState {
  plan: PlannedDay[] | null;
  generatedAt: string | null;
  setPlan: (days: PlannedDay[]) => void;
  replaceDay: (day: PlannedDay) => void;
  clearPlan: () => void;
}

export const useWeeklyPlanStore = create<WeeklyPlanState>()(
  persist(
    (set) => ({
      plan: null,
      generatedAt: null,
      setPlan: (days) =>
        set({ plan: days, generatedAt: new Date().toISOString() }),
      replaceDay: (day) =>
        set((state) => ({
          plan: state.plan
            ? state.plan.map((d) => (d.date === day.date ? day : d))
            : [day],
        })),
      clearPlan: () => set({ plan: null, generatedAt: null }),
    }),
    {
      name: "ordeal-weekly-meal-plan",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
