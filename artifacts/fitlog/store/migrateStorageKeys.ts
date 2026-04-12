import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * One-time migration of AsyncStorage keys from "fitlog-*" to "ordeal-*".
 * Auth store uses SecureStore on native, AsyncStorage on web.
 */

const ASYNC_MIGRATIONS: [string, string][] = [
  ["fitlog-settings", "ordeal-settings"],
  ["fitlog-weekly-meal-plan", "ordeal-weekly-meal-plan"],
  ["fitlog-progress-photos", "ordeal-progress-photos"],
  ["fitlog-pending-workouts", "ordeal-pending-workouts"],
  ["fitlog-notifications", "ordeal-notifications"],
  ["fitlog-pending-meals", "ordeal-pending-meals"],
  ["fitlog-pending-water", "ordeal-pending-water"],
  ["fitlog-pending-measurements", "ordeal-pending-measurements"],
  ["fitlog-pending-recovery", "ordeal-pending-recovery"],
];

const MIGRATION_DONE_KEY = "ordeal-storage-migrated";

async function migrateAsyncKey(oldKey: string, newKey: string) {
  const existing = await AsyncStorage.getItem(newKey);
  if (existing !== null) return;
  const oldData = await AsyncStorage.getItem(oldKey);
  if (oldData !== null) {
    await AsyncStorage.setItem(newKey, oldData);
    await AsyncStorage.removeItem(oldKey);
  }
}

async function migrateAuthKey() {
  const oldKey = "fitlog-auth";
  const newKey = "ordeal-auth";

  if (Platform.OS === "web") {
    await migrateAsyncKey(oldKey, newKey);
  } else {
    const existing = await SecureStore.getItemAsync(newKey);
    if (existing !== null) return;
    const oldData = await SecureStore.getItemAsync(oldKey);
    if (oldData !== null) {
      await SecureStore.setItemAsync(newKey, oldData);
      await SecureStore.deleteItemAsync(oldKey);
    }
  }
}

export async function migrateStorageKeys(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    if (done) return;

    await migrateAuthKey();
    for (const [oldKey, newKey] of ASYNC_MIGRATIONS) {
      try {
        await migrateAsyncKey(oldKey, newKey);
      } catch {}
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, "1");
  } catch {}
}
