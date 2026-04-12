import { useCallback } from "react";
import { usePendingSync } from "./usePendingSync";
import { usePendingMealsStore, type PendingMeal } from "@/store/pendingMealsStore";
import { api } from "@/lib/api";

export function usePendingMealSync() {
  const syncFn = useCallback(async (payload: PendingMeal) => {
    await api.createMeal(payload);
  }, []);

  return usePendingSync<PendingMeal>({
    store: usePendingMealsStore,
    syncFn,
    invalidateKeys: [["meals"], ["todayStats"]],
  });
}
