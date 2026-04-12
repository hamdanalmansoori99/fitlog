import { createPendingStore } from "./createPendingStore";

export interface PendingWaterLog {
  amountMl: number;
  loggedAt: string;
}

export const usePendingWaterStore = createPendingStore<PendingWaterLog>("water");
