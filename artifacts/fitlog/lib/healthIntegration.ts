/**
 * Health Integration — Apple Health & Google Fit Ready Architecture
 *
 * This module provides a unified interface for reading from and writing to
 * platform health APIs. On iOS this maps to HealthKit; on Android to Health
 * Connect (Google Fit successor). On web it is a no-op.
 *
 * Current status: STUB — all methods resolve with empty / no-op results.
 * To activate, install the native health library of your choice
 * (e.g. react-native-health, react-native-health-connect) and replace the
 * stub implementations below.
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
  date: Date;
  steps: number;
  source: "apple_health" | "google_fit" | "health_connect";
}

export interface HealthSleep {
  date: Date;
  hoursAsleep: number;
  quality?: "poor" | "fair" | "good" | "excellent";
  source: "apple_health" | "google_fit" | "health_connect";
}

export interface HealthHeartRate {
  date: Date;
  bpm: number;
  restingBpm?: number;
  source: "apple_health" | "google_fit" | "health_connect";
}

export interface HealthPermissions {
  workouts: boolean;
  bodyMeasurements: boolean;
  stepCount: boolean;
  sleep: boolean;
  heartRate: boolean;
  nutrition: boolean;
}

// ─── Platform detection ───────────────────────────────────────────────────────

export function getHealthPlatform(): "apple_health" | "health_connect" | "none" {
  if (Platform.OS === "ios") return "apple_health";
  if (Platform.OS === "android") return "health_connect";
  return "none";
}

export function isHealthIntegrationAvailable(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

// ─── Permissions ──────────────────────────────────────────────────────────────

/**
 * Request read/write permissions from the platform health store.
 * Returns a summary of which permissions were granted.
 *
 * STUB: always resolves with all permissions denied until a native library
 * is wired in.
 */
export async function requestHealthPermissions(): Promise<HealthPermissions> {
  if (!isHealthIntegrationAvailable()) {
    return {
      workouts: false,
      bodyMeasurements: false,
      stepCount: false,
      sleep: false,
      heartRate: false,
      nutrition: false,
    };
  }

  // TODO: Replace with native SDK call, e.g.:
  // iOS   → AppleHealthKit.initHealthKit(permissions, callback)
  // Android → initialize() from @kingstinct/react-native-healthkit or similar

  return {
    workouts: false,
    bodyMeasurements: false,
    stepCount: false,
    sleep: false,
    heartRate: false,
    nutrition: false,
  };
}

export async function getHealthPermissions(): Promise<HealthPermissions> {
  return requestHealthPermissions();
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetch workouts from Apple Health / Google Fit logged in the past N days.
 * STUB: always returns an empty array.
 */
export async function fetchHealthWorkouts(_days = 30): Promise<HealthWorkout[]> {
  if (!isHealthIntegrationAvailable()) return [];
  // TODO: wire in native SDK
  return [];
}

/**
 * Fetch the latest body weight from Apple Health / Google Fit.
 * STUB: always returns null.
 */
export async function fetchLatestWeight(): Promise<HealthBodyMeasurement | null> {
  if (!isHealthIntegrationAvailable()) return null;
  // TODO: wire in native SDK
  return null;
}

/**
 * Fetch step counts for each day over the past N days.
 * STUB: always returns an empty array.
 */
export async function fetchStepCounts(_days = 7): Promise<HealthStepCount[]> {
  if (!isHealthIntegrationAvailable()) return [];
  // TODO: wire in native SDK
  return [];
}

/**
 * Fetch sleep data for the past N days.
 * STUB: always returns an empty array.
 */
export async function fetchSleepData(_days = 7): Promise<HealthSleep[]> {
  if (!isHealthIntegrationAvailable()) return [];
  // TODO: wire in native SDK
  return [];
}

/**
 * Fetch resting heart rate data for the past N days.
 * STUB: always returns an empty array.
 */
export async function fetchHeartRateData(_days = 7): Promise<HealthHeartRate[]> {
  if (!isHealthIntegrationAvailable()) return [];
  // TODO: wire in native SDK
  return [];
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Write a FitLog workout back to Apple Health / Google Fit.
 * STUB: no-op.
 */
export async function writeWorkoutToHealth(_workout: {
  activityType: string;
  startDate: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  distanceKm?: number;
}): Promise<void> {
  if (!isHealthIntegrationAvailable()) return;
  // TODO: wire in native SDK
}

/**
 * Write a water intake log to Apple Health.
 * STUB: no-op.
 */
export async function writeWaterIntakeToHealth(_amountMl: number): Promise<void> {
  if (Platform.OS !== "ios") return;
  // TODO: wire in native SDK — HealthKit only (Android Health Connect
  //       does not have a hydration data type as of 2025)
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

/**
 * Pull any workouts from Apple Health / Google Fit that haven't yet been
 * logged in FitLog and return them as candidate workouts for the user to
 * review and import.
 *
 * STUB: always returns an empty array.
 */
export async function getImportableworkouts(_existingDates: string[]): Promise<HealthWorkout[]> {
  if (!isHealthIntegrationAvailable()) return [];
  // TODO: call fetchHealthWorkouts(), filter out dates already in FitLog
  return [];
}
