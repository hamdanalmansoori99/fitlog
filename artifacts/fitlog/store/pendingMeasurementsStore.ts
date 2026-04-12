import { createPendingStore } from "./createPendingStore";

export interface PendingMeasurement {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  hipCm?: number;
  thighCm?: number;
}

export const usePendingMeasurementsStore = createPendingStore<PendingMeasurement>("measurements");
