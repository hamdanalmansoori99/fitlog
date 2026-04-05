import { useEffect, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { usePendingWorkoutsStore } from "@/store/pendingWorkoutsStore";

const SYNC_INTERVAL_MS = 30_000;

const WORKOUT_QUERY_KEYS = [
  ["workouts"],
  ["todayStats"],
  ["weeklyStats"],
  ["recentActivity"],
  ["workoutSummary"],
  ["streaks"],
  ["achievements"],
];

export function usePendingWorkoutSync() {
  const { token } = useAuthStore();
  const queueLength = usePendingWorkoutsStore((s) => s.queue.length);
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  const syncQueue = useCallback(async () => {
    const { queue, removeFromQueue, setLastSyncError } = usePendingWorkoutsStore.getState();
    if (isSyncing.current || !token || queue.length === 0) return;
    isSyncing.current = true;
    try {
      for (const pending of [...queue]) {
        try {
          await api.createWorkout(pending.payload);
          removeFromQueue(pending.id);
          setLastSyncError(null);
          WORKOUT_QUERY_KEYS.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          );
        } catch (err: any) {
          const message = err instanceof Error ? err.message : "Sync failed";
          setLastSyncError(message);
          // Network still down — stop retrying this cycle
          if (isNetworkError(err)) break;
          // Server rejected it (bad data, auth, etc.) — drop it to avoid infinite loop
          removeFromQueue(pending.id);
        }
      }
    } finally {
      isSyncing.current = false;
    }
  }, [token, queryClient]);

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
}

export function isNetworkError(err: unknown): boolean {
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
