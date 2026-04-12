import { createPendingStore } from "./createPendingStore";

export interface PendingMeal {
  name: string;
  category: string;
  date: string;
  foodItems: Array<{
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    quantity: number;
    servingSize: string;
  }>;
}

export const usePendingMealsStore = createPendingStore<PendingMeal>("meals");
