import { useCallback } from "react";
import { usePendingSync } from "./usePendingSync";
import { usePendingWaterStore, type PendingWaterLog } from "@/store/pendingWaterStore";
import { api } from "@/lib/api";

export function usePendingWaterSync() {
  const syncFn = useCallback(async (payload: PendingWaterLog) => {
    await api.logWater(payload.amountMl);
  }, []);

  return usePendingSync<PendingWaterLog>({
    store: usePendingWaterStore,
    syncFn,
    invalidateKeys: [["water"], ["todayStats"]],
  });
}
