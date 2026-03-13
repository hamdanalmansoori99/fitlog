import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import type { NotifType, NotifPrefs } from "@/store/notificationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderData {
  type: NotifType;
  title: string;
  body: string;
  priority: number; // lower = higher priority
  cta?: string;
  ctaRoute?: string;
  icon?: string;
  color?: string;
}

// ─── Personalized content per type ───────────────────────────────────────────

const STATIC_CONTENT: Record<NotifType, { title: string; body: string }> = {
  workout:   { title: "Time to train 💪",        body: "Your workout is waiting — a 30-minute session is all it takes today." },
  meal:      { title: "Log your meals",           body: "Tracking what you eat helps you hit your nutrition goals every day." },
  hydration: { title: "Stay hydrated 💧",         body: "Drinking enough water improves both performance and recovery. Aim for 2–3L today." },
  streak:    { title: "Keep your streak alive 🔥", body: "Don't break the chain — log a workout today to maintain your momentum." },
  recovery:  { title: "Recovery day reminder 💆", body: "Rest is part of training — a recovery session or rest day will help you come back stronger." },
  weekly:    { title: "Weekly check-in 📊",       body: "How did your week go? Review your progress and set up for a great next week." },
};

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return "Notification" in window && Notification.permission === "granted";
  }
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// ─── Native scheduling ────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h || 8, minute: m || 0 };
}

export async function scheduleNativeNotifications(
  prefs: Record<NotifType, NotifPrefs>
): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const [type, pref] of Object.entries(prefs) as [NotifType, NotifPrefs][]) {
    if (!pref.enabled) continue;
    const { hour, minute } = parseTime(pref.time);
    const content = STATIC_CONTENT[type];
    await Notifications.scheduleNotificationAsync({
      identifier: `fitlog-${type}`,
      content: { title: content.title, body: content.body, data: { type } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true } as any,
    });
  }
}

export async function cancelAllNativeNotifications(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Web browser notifications ────────────────────────────────────────────────

export function sendWebNotification(type: NotifType, body?: string): void {
  if (Platform.OS !== "web" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const content = STATIC_CONTENT[type];
  new Notification(content.title, { body: body || content.body, icon: "/favicon.ico" });
}

// ─── Dismiss state (AsyncStorage) ────────────────────────────────────────────

const DISMISS_KEY_PREFIX = "notif-dismissed-";

export async function dismissReminder(type: NotifType): Promise<void> {
  const key = `${DISMISS_KEY_PREFIX}${type}-${new Date().toDateString()}`;
  await AsyncStorage.setItem(key, String(Date.now()));
}

export async function isReminderDismissed(type: NotifType): Promise<boolean> {
  const key = `${DISMISS_KEY_PREFIX}${type}-${new Date().toDateString()}`;
  const val = await AsyncStorage.getItem(key);
  if (!val) return false;
  const dismissedAt = parseInt(val);
  const hoursSince = (Date.now() - dismissedAt) / 1000 / 3600;
  return hoursSince < 4; // reappear after 4 hours
}

// ─── Smart in-app reminder computation ───────────────────────────────────────

export function computeActiveReminders(data: {
  streaksData?: any;
  todayStats?: any;
  todayMealsData?: any;
  profile?: any;
  workoutsData?: any;
  weeklyData?: any;
  enabledTypes: Set<NotifType>;
}): ReminderData[] {
  const { streaksData, todayStats, profile, workoutsData, weeklyData, enabledTypes } = data;

  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  const streak = streaksData?.currentWorkoutStreak ?? 0;
  const workoutsToday = todayStats?.workoutsCompleted ?? 0;
  const mealsToday = todayStats?.mealsLogged ?? 0;
  const proteinToday = todayStats?.proteinToday ?? todayStats?.macros?.protein ?? 0;
  const proteinGoal = profile?.dailyProteinGoal ?? 0;
  const weeklyGoal = profile?.weeklyWorkoutDays ?? 3;
  const weeklyDone = weeklyData?.workoutsThisWeek ?? 0;

  // Count consecutive days trained
  const recentWorkouts: any[] = (workoutsData?.workouts || []).slice(0, 10);
  let consecutiveDays = 0;
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDay = new Date(today);
    for (let i = 0; i < 7; i++) {
      checkDay = new Date(today);
      checkDay.setDate(today.getDate() - i);
      const dayStr = checkDay.toDateString();
      const workedOut = recentWorkouts.some((w) => new Date(w.date).toDateString() === dayStr);
      if (workedOut) consecutiveDays++;
      else if (i > 0) break;
    }
  }

  const candidates: ReminderData[] = [];

  // ── Streak at risk (high priority evening) ─────────────────────────────────
  if (enabledTypes.has("streak") && streak > 1 && workoutsToday === 0 && hour >= 16) {
    candidates.push({
      type: "streak",
      priority: streak >= 7 ? 0 : 1,
      title: `${streak}-day streak at risk 🔥`,
      body: `You haven't trained yet today — log a workout to protect your ${streak}-day streak!`,
      cta: "Browse workouts",
      ctaRoute: "/(tabs)/workouts",
      icon: "zap",
      color: "#ffab40",
    });
  }

  // ── Streak starter (no streak, evening) ────────────────────────────────────
  if (enabledTypes.has("streak") && streak === 0 && workoutsToday === 0 && hour >= 16 && hour <= 22) {
    candidates.push({
      type: "streak",
      priority: 3,
      title: "Start a streak today",
      body: "Every streak starts with a single workout — even 15 minutes counts. Let's go! 💪",
      cta: "Browse workouts",
      ctaRoute: "/(tabs)/workouts",
      icon: "zap",
      color: "#ffab40",
    });
  }

  // ── Morning workout reminder ───────────────────────────────────────────────
  if (enabledTypes.has("workout") && workoutsToday === 0 && hour >= 6 && hour <= 14) {
    const durationHint = profile?.preferredWorkoutDuration ?? "30 minutes";
    candidates.push({
      type: "workout",
      priority: 2,
      title: "You planned to train today",
      body: `A ${durationHint} session is scheduled — want to get started? 💪`,
      cta: "Browse workouts",
      ctaRoute: "/(tabs)/workouts",
      icon: "activity",
      color: "#00e676",
    });
  }

  // ── Close to protein goal ──────────────────────────────────────────────────
  if (enabledTypes.has("meal") && proteinGoal > 0 && mealsToday > 0) {
    const remaining = proteinGoal - proteinToday;
    if (remaining > 0 && remaining <= 25) {
      candidates.push({
        type: "meal",
        priority: 2,
        title: "Almost at your protein goal 🥩",
        body: `Just ${Math.round(remaining)}g away from today's target — a snack or shake could do it!`,
        cta: "Log a meal",
        ctaRoute: "/(tabs)/nutrition",
        icon: "coffee",
        color: "#ff80ab",
      });
    }
  }

  // ── No meals logged (midday) ───────────────────────────────────────────────
  if (enabledTypes.has("meal") && mealsToday === 0 && hour >= 11 && hour <= 20) {
    candidates.push({
      type: "meal",
      priority: 3,
      title: "You haven't logged any meals",
      body: "Tracking what you eat keeps you on course — log today's meals to see your progress.",
      cta: "Log a meal",
      ctaRoute: "/(tabs)/nutrition",
      icon: "coffee",
      color: "#ff80ab",
    });
  }

  // ── Recovery suggestion ────────────────────────────────────────────────────
  if (enabledTypes.has("recovery") && consecutiveDays >= 3 && workoutsToday === 0) {
    candidates.push({
      type: "recovery",
      priority: 2,
      title: `${consecutiveDays} days straight — impressive 💪`,
      body: "A recovery session or rest day today will help you come back stronger. A short walk fits too.",
      cta: "See active recovery",
      ctaRoute: "/(tabs)/workouts",
      icon: "heart",
      color: "#ea80fc",
    });
  }

  // ── Hydration (afternoon) ─────────────────────────────────────────────────
  if (enabledTypes.has("hydration") && hour >= 12 && hour <= 20) {
    candidates.push({
      type: "hydration",
      priority: 5,
      title: "You haven't logged water today 💧",
      body: "Staying hydrated boosts energy and recovery. Aim for 2–3 litres throughout the day.",
      icon: "droplet",
      color: "#448aff",
    });
  }

  // ── Weekly check-in (Sunday / Monday morning) ─────────────────────────────
  if (enabledTypes.has("weekly") && (dayOfWeek === 0 || dayOfWeek === 1) && hour >= 8 && hour <= 20) {
    if (weeklyDone >= weeklyGoal) {
      candidates.push({
        type: "weekly",
        priority: 1,
        title: `Weekly goal smashed! 🎉`,
        body: `You hit all ${weeklyGoal} workouts this week — incredible consistency. Review your week below.`,
        cta: "View progress",
        ctaRoute: "/(tabs)/progress",
        icon: "bar-chart-2",
        color: "#18ffff",
      });
    } else {
      const left = weeklyGoal - weeklyDone;
      candidates.push({
        type: "weekly",
        priority: dayOfWeek === 0 ? 2 : 4,
        title: `${weeklyDone}/${weeklyGoal} workouts this week`,
        body:
          weeklyDone === 0
            ? "You haven't trained this week yet — there's still time to start strong."
            : `${left} more session${left > 1 ? "s" : ""} to hit your weekly goal. You've got this.`,
        cta: "View progress",
        ctaRoute: "/(tabs)/progress",
        icon: "bar-chart-2",
        color: "#18ffff",
      });
    }
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}
