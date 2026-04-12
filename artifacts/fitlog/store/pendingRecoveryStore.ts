import { createPendingStore } from "./createPendingStore";

export interface PendingRecoveryLog {
  date: string;
  sleepHours?: number;
  sleepQuality?: number;
  energyLevel?: number;
  stressLevel?: number;
  overallFeeling?: number;
  soreness?: Record<string, number>;
}

export const usePendingRecoveryStore = createPendingStore<PendingRecoveryLog>("recovery");
