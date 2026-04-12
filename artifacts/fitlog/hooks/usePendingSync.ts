import { useEffect, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import type { PendingState } from "@/store/createPendingStore";
import type { StoreApi, UseBoundStore } from "zustand";

const SYNC_INTERVAL_MS = 30_000;

interface UsePendingSyncOptions<T> {
  store: UseBoundStore<StoreApi<PendingState<T>>>;
  syncFn: (payload: T) => Promise<void>;
  invalidateKeys: string[][];
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("no internet") ||
    msg.includes("timeout") ||
    msg.includes("connection refused")
  );
}

export function usePendingSync<T>({ store, syncFn, invalidateKeys }: UsePendingSyncOptions<T>) {
  const { token } = useAuthStore();
  const queueLength = store((s) => s.queue.length);
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  const syncQueue = useCallback(async () => {
    const { queue, removeFromQueue, setLastSyncError } = store.getState();
    if (isSyncing.current || !token || queue.length === 0) return;
    isSyncing.current = true;
    try {
      for (const pending of [...queue]) {
        try {
          await syncFn(pending.payload);
          removeFromQueue(pending.id);
          setLastSyncError(null);
          invalidateKeys.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        } catch (err: any) {
          const message = err instanceof Error ? err.message : "Sync failed";
          setLastSyncError(message);
          if (isNetworkError(err)) break;
          // Server rejected — drop to avoid infinite loop
          removeFromQueue(pending.id);
        }
      }
    } finally {
      isSyncing.current = false;
    }
  }, [token, queryClient, store, syncFn, invalidateKeys]);

  // Sync on app foreground
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncQueue();
    });
    return () => sub.remove();
  }, [syncQueue]);

  // Sync on mount and on interval while queue has items
  useEffect(() => {
    syncQueue();
    if (queueLength === 0) return;
    const timer = setInterval(syncQueue, SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [queueLength, syncQueue]);

  return { pendingCount: queueLength };
}
