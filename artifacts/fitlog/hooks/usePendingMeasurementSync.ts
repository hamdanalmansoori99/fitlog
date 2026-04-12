import { useCallback } from "react";
import { usePendingSync } from "./usePendingSync";
import { usePendingMeasurementsStore, type PendingMeasurement } from "@/store/pendingMeasurementsStore";
import { api } from "@/lib/api";

export function usePendingMeasurementSync() {
  const syncFn = useCallback(async (payload: PendingMeasurement) => {
    await api.createMeasurement(payload);
  }, []);

  return usePendingSync<PendingMeasurement>({
    store: usePendingMeasurementsStore,
    syncFn,
    invalidateKeys: [["measurements"]],
  });
}
