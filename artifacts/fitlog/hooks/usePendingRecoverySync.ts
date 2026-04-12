import { useCallback } from "react";
import { usePendingSync } from "./usePendingSync";
import { usePendingRecoveryStore, type PendingRecoveryLog } from "@/store/pendingRecoveryStore";
import { api } from "@/lib/api";

export function usePendingRecoverySync() {
  const syncFn = useCallback(async (payload: PendingRecoveryLog) => {
    await api.logRecovery(payload);
  }, []);

  return usePendingSync<PendingRecoveryLog>({
    store: usePendingRecoveryStore,
    syncFn,
    invalidateKeys: [["recovery"]],
  });
}
