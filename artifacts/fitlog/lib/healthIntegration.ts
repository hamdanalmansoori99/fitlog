/**
 * Health Integration — Apple Health & Google Health Connect
 *
 * Unified interface for reading from and writing to platform health APIs.
 * On iOS this maps to HealthKit (react-native-health).
 * On Android this maps to Health Connect (react-native-health-connect).
 * On web it is a no-op.
 *
 * Libraries are lazy-loaded so the app doesn't crash in Expo Go or on web.
 * Full functionality requires a native dev build.
 */

import { Platform } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthWorkout {
  id: string;
  activityType: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  distanceKm?: number;
  source: "apple_health" | "google_fit" | "health_connect";
}

export interface HealthBodyMeasurement {
  date: Date;
  weightKg?: number;
  heightCm?: number;
  bodyFatPercentage?: number;
  source: "apple_health" | "google_fit" | "health_connect";
}

export interface HealthStepCount {
  date: string;
  steps: number;
  source: string;
}

export interface HealthSleep {
  date: string;
  hoursAsleep: number;
  quality: string;
  source: string;
}

export interface HealthHeartRate {
  date: string;
  bpm: number;
  restingBpm: number;
  source: string;
}

export interface HealthPermissions {
  workouts: boolean;
  stepCount: boolean;
  sleep: boolean;
  heartRate: boolean;
}

// ─── Lazy library loaders ─────────────────────────────────────────────────────

let AppleHealthKit: any = null;
let HealthConnect: any = null;

function getAppleHealthKit(): any {
  if (AppleHealthKit) return AppleHealthKit;
  try {
    AppleHealthKit = require("react-native-health").default;
  } catch {
    // Not available in Expo Go or on web
  }
  return AppleHealthKit;
}

function getHealthConnect(): any {
  if (HealthConnect) return HealthConnect;
  try {
    HealthConnect = require("react-native-health-connect");
  } catch {
    // Not available in Expo Go or on web
  }
  return HealthConnect;
}

// ─── Platform detection ───────────────────────────────────────────────────────

export function getHealthPlatform(): "apple_health" | "health_connect" | "none" {
  if (Platform.OS === "ios") return "apple_health";
  if (Platform.OS === "android") return "health_connect";
  return "none";
}

export function isHealthIntegrationAvailable(): boolean {
  if (Platform.OS === "ios") {
    return !!getAppleHealthKit();
  }
  if (Platform.OS === "android") {
    return !!getHealthConnect();
  }
  return false;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<HealthPermissions> {
  if (Platform.OS === "ios") {
    const HK = getAppleHealthKit();
    if (!HK) return { workouts: false, stepCount: false, sleep: false, heartRate: false };

    return new Promise((resolve) => {
      const permissions = {
        permissions: {
          read: [
            HK.Constants.Permissions.Steps,
            HK.Constants.Permissions.SleepAnalysis,
            HK.Constants.Permissions.HeartRate,
            HK.Constants.Permissions.RestingHeartRate,
            HK.Constants.Permissions.Workout,
            HK.Constants.Permissions.ActiveEnergyBurned,
          ],
          write: [
            HK.Constants.Permissions.Steps,
            HK.Constants.Permissions.Workout,
            HK.Constants.Permissions.WaterConsumption,
          ],
        },
      };
      HK.initHealthKit(permissions, (err: any) => {
        resolve({
          workouts: !err,
          stepCount: !err,
          sleep: !err,
          heartRate: !err,
        });
      });
    });
  }

  if (Platform.OS === "android") {
    const HC = getHealthConnect();
    if (!HC) return { workouts: false, stepCount: false, sleep: false, heartRate: false };

    try {
      await HC.initialize();
      await HC.requestPermission([
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "SleepSession" },
        { accessType: "read", recordType: "HeartRate" },
        { accessType: "read", recordType: "ExerciseSession" },
        { accessType: "write", recordType: "ExerciseSession" },
        { accessType: "write", recordType: "Hydration" },
      ]);
      return { workouts: true, stepCount: true, sleep: true, heartRate: true };
    } catch {
      return { workouts: false, stepCount: false, sleep: false, heartRate: false };
    }
  }

  return { workouts: false, stepCount: false, sleep: false, heartRate: false };
}

export async function getHealthPermissions(): Promise<HealthPermissions> {
  return requestHealthPermissions();
}

// ─── Step Counts ──────────────────────────────────────────────────────────────

export async function fetchStepCounts(days: number = 7): Promise<HealthStepCount[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (Platform.OS === "ios") {
    const HK = getAppleHealthKit();
    if (!HK) return [];
    return new Promise((resolve) => {
      HK.getDailyStepCountSamples(
        { startDate: startDate.toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err) { resolve([]); return; }
          resolve(
            results.map((r) => ({
              date: r.startDate.slice(0, 10),
              steps: r.value,
              source: "apple_health",
            }))
          );
        }
      );
    });
  }

  if (Platform.OS === "android") {
    const HC = getHealthConnect();
    if (!HC) return [];
    try {
      const result = await HC.readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      // Aggregate by day
      const byDay: Record<string, number> = {};
      for (const record of result.records) {
        const day = record.startTime.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + record.count;
      }
      return Object.entries(byDay).map(([date, steps]) => ({
        date,
        steps,
        source: "health_connect",
      }));
    } catch {
      return [];
    }
  }

  return [];
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function fetchSleepData(days: number = 7): Promise<HealthSleep[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (Platform.OS === "ios") {
    const HK = getAppleHealthKit();
    if (!HK) return [];
    return new Promise((resolve) => {
      HK.getSleepSamples(
        { startDate: startDate.toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err) { resolve([]); return; }
          // Group by date, sum hours for ASLEEP segments only
          const byDay: Record<string, number> = {};
          for (const r of results) {
            if (r.value === "ASLEEP") {
              const day = r.startDate.slice(0, 10);
              const hours =
                (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 3_600_000;
              byDay[day] = (byDay[day] ?? 0) + hours;
            }
          }
          resolve(
            Object.entries(byDay).map(([date, hoursAsleep]) => ({
              date,
              hoursAsleep: Math.round(hoursAsleep * 10) / 10,
              quality: hoursAsleep >= 7 ? "good" : hoursAsleep >= 5 ? "fair" : "poor",
              source: "apple_health",
            }))
          );
        }
      );
    });
  }

  if (Platform.OS === "android") {
    const HC = getHealthConnect();
    if (!HC) return [];
    try {
      const result = await HC.readRecords("SleepSession", {
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      return result.records.map((r: any) => {
        const hours =
          (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3_600_000;
        return {
          date: r.startTime.slice(0, 10),
          hoursAsleep: Math.round(hours * 10) / 10,
          quality: hours >= 7 ? "good" : hours >= 5 ? "fair" : "poor",
          source: "health_connect",
        };
      });
    } catch {
      return [];
    }
  }

  return [];
}

// ─── Heart Rate ───────────────────────────────────────────────────────────────

export async function fetchHeartRateData(days: number = 1): Promise<HealthHeartRate[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (Platform.OS === "ios") {
    const HK = getAppleHealthKit();
    if (!HK) return [];
    return new Promise((resolve) => {
      HK.getHeartRateSamples(
        { startDate: startDate.toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err) { resolve([]); return; }
          const byDay: Record<string, number[]> = {};
          for (const r of results) {
            const day = r.startDate.slice(0, 10);
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(r.value);
          }
          resolve(
            Object.entries(byDay).map(([date, bpms]) => ({
              date,
              bpm: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
              restingBpm: Math.min(...bpms),
              source: "apple_health",
            }))
          );
        }
      );
    });
  }

  if (Platform.OS === "android") {
    const HC = getHealthConnect();
    if (!HC) return [];
    try {
      const result = await HC.readRecords("HeartRate", {
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: new Date().toISOString(),
        },
      });
      const byDay: Record<string, number[]> = {};
      for (const r of result.records) {
        const day = r.time.slice(0, 10);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(r.beatsPerMinute);
      }
      return Object.entries(byDay).map(([date, bpms]) => ({
        date,
        bpm: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
        restingBpm: Math.min(...bpms),
        source: "health_connect",
      }));
    } catch {
      return [];
    }
  }

  return [];
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeWorkoutToHealth(params: {
  activityType: string;
  startDate: Date;
  endDate: Date;
  caloriesBurned?: number;
  distanceKm?: number;
}): Promise<boolean> {
  try {
    if (Platform.OS === "ios") {
      const AppleHealthKit = require("react-native-health").default;
      return new Promise((resolve) => {
        AppleHealthKit.saveWorkout(
          {
            type: "Other",
            startDate: params.startDate.toISOString(),
            endDate: params.endDate.toISOString(),
            energyBurned: params.caloriesBurned ?? 0,
            energyBurnedUnit: "calorie",
          },
          (err: any) => resolve(!err)
        );
      });
    }
    if (Platform.OS === "android") {
      const { insertRecords } = require("react-native-health-connect");
      await insertRecords([{
        recordType: "ExerciseSession",
        startTime: params.startDate.toISOString(),
        endTime: params.endDate.toISOString(),
        exerciseType: 0,
      }]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function writeWaterIntakeToHealth(amountMl: number): Promise<boolean> {
  try {
    if (Platform.OS === "ios") {
      const AppleHealthKit = require("react-native-health").default;
      return new Promise((resolve) => {
        AppleHealthKit.saveWater(
          { value: amountMl / 1000, date: new Date().toISOString(), unit: "liter" },
          (err: any) => resolve(!err)
        );
      });
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export async function fetchHealthWorkouts(days = 7): Promise<any[]> {
  try {
    const start = new Date();
    start.setDate(start.getDate() - days);
    if (Platform.OS === "ios") {
      const AppleHealthKit = require("react-native-health").default;
      return new Promise((resolve) => {
        AppleHealthKit.getSamples(
          { typeIdentifier: "Workout", startDate: start.toISOString(), endDate: new Date().toISOString() },
          (err: any, results: any[]) => resolve(err ? [] : results ?? [])
        );
      });
    }
    if (Platform.OS === "android") {
      const { readRecords } = require("react-native-health-connect");
      const result = await readRecords("ExerciseSession", {
        timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: new Date().toISOString() },
      });
      return result?.records ?? [];
    }
    return [];
  } catch { return []; }
}

export async function fetchLatestWeight(): Promise<number | null> {
  try {
    if (Platform.OS === "ios") {
      const AppleHealthKit = require("react-native-health").default;
      return new Promise((resolve) => {
        AppleHealthKit.getLatestWeight({}, (err: any, result: any) => {
          resolve(err ? null : result?.value ?? null);
        });
      });
    }
    if (Platform.OS === "android") {
      const { readRecords } = require("react-native-health-connect");
      const end = new Date();
      const start = new Date(); start.setDate(start.getDate() - 30);
      const result = await readRecords("Weight", {
        timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
      });
      const records = result?.records ?? [];
      if (records.length === 0) return null;
      return records[records.length - 1]?.weight?.inKilograms ?? null;
    }
    return null;
  } catch { return null; }
}

export async function getImportableWorkouts(existingDates: string[] = []): Promise<any[]> {
  const workouts = await fetchHealthWorkouts(30);
  const existing = new Set(existingDates);
  return workouts.filter((w: any) => {
    const date = new Date(w.startDate || w.startTime).toISOString().split("T")[0];
    return !existing.has(date);
  });
}
