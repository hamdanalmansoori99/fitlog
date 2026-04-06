import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import type { NotifType, NotifPrefs } from "@/store/notificationStore";
import i18n from "@/i18n";

export interface ReminderData {
  type: NotifType;
  title: string;
  body: string;
  priority: number;
  cta?: string;
  ctaRoute?: string;
  icon?: string;
  color?: string;
}

function getStaticContent(type: NotifType): { title: string; body: string } {
  const map: Record<NotifType, { titleKey: string; bodyKey: string }> = {
    workout:   { titleKey: "notifications.workoutTitle", bodyKey: "notifications.workoutBody" },
    meal:      { titleKey: "notifications.mealTitle", bodyKey: "notifications.mealBody" },
    hydration: { titleKey: "notifications.hydrationTitle", bodyKey: "notifications.hydrationBody" },
    streak:    { titleKey: "notifications.streakTitle", bodyKey: "notifications.streakBody" },
    recovery:  { titleKey: "notifications.recoveryTitle", bodyKey: "notifications.recoveryBody" },
    weekly:    { titleKey: "notifications.weeklyTitle", bodyKey: "notifications.weeklyBody" },
    restDay:   { titleKey: "notifications.restDayTitle", bodyKey: "notifications.restDayBody" },
  };
  const entry = map[type];
  return { title: i18n.t(entry.titleKey), body: i18n.t(entry.bodyKey) };
}

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
    const content = getStaticContent(type);
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

export function sendWebNotification(type: NotifType, body?: string, title?: string): void {
  if (Platform.OS !== "web" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const content = getStaticContent(type);
  new Notification(title || content.title, { body: body || content.body, icon: "/favicon.ico" });
}

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
  return hoursSince < 4;
}

const t = (key: string, opts?: Record<string, any>) => i18n.t(key, opts);

export function computeActiveReminders(data: {
  streaksData?: any;
  todayStats?: any;
  todayMealsData?: any;
  profile?: any;
  workoutsData?: any;
  weeklyData?: any;
  waterData?: any;
  enabledTypes: Set<NotifType>;
  mealsLoggedToday?: number;
  isRestDay?: boolean;
}): ReminderData[] {
  const { streaksData, todayStats, todayMealsData, profile, workoutsData, weeklyData, waterData, enabledTypes } = data;

  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  const streak = streaksData?.currentWorkoutStreak ?? 0;
  const workoutsToday = todayStats?.workoutsCompleted ?? 0;

  // Determine actual meals logged today from multiple sources:
  // 1. Explicit mealsLoggedToday parameter (most reliable when provided)
  // 2. todayMealsData array length (direct meal data)
  // 3. todayStats.mealsLogged (aggregated stat, may be stale)
  const mealsFromData = Array.isArray(todayMealsData) ? todayMealsData.length : (todayMealsData?.meals?.length ?? undefined);
  const mealsToday = data.mealsLoggedToday ?? mealsFromData ?? todayStats?.mealsLogged ?? 0;

  const proteinToday = todayStats?.proteinToday ?? todayStats?.macros?.protein ?? 0;
  const proteinGoal = profile?.dailyProteinGoal ?? 0;
  const weeklyGoal = profile?.weeklyWorkoutDays ?? 3;
  const weeklyDone = weeklyData?.workoutsThisWeek ?? 0;

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

  if (enabledTypes.has("streak") && streak > 1 && workoutsToday === 0 && hour >= 16) {
    candidates.push({
      type: "streak",
      priority: streak >= 7 ? 0 : 1,
      title: t("notifications.streakAtRiskTitle", { streak }),
      body: t("notifications.streakAtRiskBody", { streak }),
      cta: t("notifications.browseWorkouts"),
      ctaRoute: "/(tabs)/workouts",
      icon: "zap",
      color: "#ffab40",
    });
  }

  if (enabledTypes.has("streak") && streak === 0 && workoutsToday === 0 && hour >= 16 && hour <= 22) {
    candidates.push({
      type: "streak",
      priority: 3,
      title: t("notifications.startStreak"),
      body: t("notifications.startStreakBody"),
      cta: t("notifications.browseWorkouts"),
      ctaRoute: "/(tabs)/workouts",
      icon: "zap",
      color: "#ffab40",
    });
  }

  if (enabledTypes.has("workout") && workoutsToday === 0 && hour >= 6 && hour <= 14) {
    const durationHint = profile?.preferredWorkoutDuration ?? t("notifications.defaultDuration");
    candidates.push({
      type: "workout",
      priority: 2,
      title: t("notifications.plannedToTrain"),
      body: t("notifications.plannedToTrainBody", { duration: durationHint }),
      cta: t("notifications.browseWorkouts"),
      ctaRoute: "/(tabs)/workouts",
      icon: "activity",
      color: "#00e676",
    });
  }

  if (enabledTypes.has("meal") && proteinGoal > 0 && mealsToday > 0) {
    const remaining = proteinGoal - proteinToday;
    if (remaining > 0 && remaining <= 25) {
      candidates.push({
        type: "meal",
        priority: 2,
        title: t("notifications.almostProteinTitle"),
        body: t("notifications.almostProteinBody", { remaining: Math.round(remaining) }),
        cta: t("notifications.logAMeal"),
        ctaRoute: "/(tabs)/nutrition",
        icon: "coffee",
        color: "#ff80ab",
      });
    }
  }

  if (enabledTypes.has("meal") && mealsToday === 0 && hour >= 11 && hour <= 20) {
    candidates.push({
      type: "meal",
      priority: 3,
      title: t("notifications.noMealsLoggedTitle"),
      body: t("notifications.noMealsLoggedBody"),
      cta: t("notifications.logAMeal"),
      ctaRoute: "/(tabs)/nutrition",
      icon: "coffee",
      color: "#ff80ab",
    });
  }

  if (enabledTypes.has("recovery") && consecutiveDays >= 3 && workoutsToday === 0) {
    candidates.push({
      type: "recovery",
      priority: 2,
      title: t("notifications.consecutiveDaysTitle", { days: consecutiveDays }),
      body: t("notifications.consecutiveDaysBody"),
      cta: t("notifications.seeActiveRecovery"),
      ctaRoute: "/(tabs)/workouts",
      icon: "heart",
      color: "#ea80fc",
    });
  }

  const waterMl: number = waterData?.totalMl ?? waterData?.logs?.reduce((s: number, l: any) => s + (l.amountMl ?? 0), 0) ?? -1;
  const waterGoalMl: number = (profile?.dailyWaterGoalOz ?? 64) * 29.5735;
  const waterKnown = waterMl >= 0;
  if (enabledTypes.has("hydration") && hour >= 12 && hour <= 20) {
    if (!waterKnown) {
      candidates.push({
        type: "hydration",
        priority: 5,
        title: t("notifications.stayHydratedTitle"),
        body: t("notifications.stayHydratedBody"),
        icon: "droplet",
        color: "#448aff",
      });
    } else if (waterMl === 0) {
      candidates.push({
        type: "hydration",
        priority: 4,
        title: t("notifications.noWaterLoggedTitle"),
        body: t("notifications.noWaterLoggedBody"),
        icon: "droplet",
        color: "#448aff",
      });
    } else if (waterGoalMl > 0 && waterMl < waterGoalMl * 0.5) {
      const current = (Math.round(waterMl / 1000 * 10) / 10).toString();
      const target = (waterGoalMl / 1000).toFixed(1);
      candidates.push({
        type: "hydration",
        priority: 5,
        title: t("notifications.halfwayWaterTitle"),
        body: t("notifications.halfwayWaterBody", { current, target }),
        icon: "droplet",
        color: "#448aff",
      });
    }
  }

  if (enabledTypes.has("weekly") && (dayOfWeek === 0 || dayOfWeek === 1) && hour >= 8 && hour <= 20) {
    if (weeklyDone >= weeklyGoal) {
      candidates.push({
        type: "weekly",
        priority: 1,
        title: t("notifications.weeklyGoalSmashedTitle"),
        body: t("notifications.weeklyGoalSmashedBody", { goal: weeklyGoal }),
        cta: t("notifications.viewProgress"),
        ctaRoute: "/(tabs)/progress",
        icon: "bar-chart-2",
        color: "#18ffff",
      });
    } else {
      const left = weeklyGoal - weeklyDone;
      candidates.push({
        type: "weekly",
        priority: dayOfWeek === 0 ? 2 : 4,
        title: t("notifications.weeklyProgressTitle", { done: weeklyDone, goal: weeklyGoal }),
        body: weeklyDone === 0
          ? t("notifications.weeklyNotStarted")
          : t("notifications.weeklyRemaining", { left, s: left > 1 ? "s" : "" }),
        cta: t("notifications.viewProgress"),
        ctaRoute: "/(tabs)/progress",
        icon: "bar-chart-2",
        color: "#18ffff",
      });
    }
  }

  // Rest day streak notification — reassure users their streak is safe on rest days
  const isRestDay = data.isRestDay ?? false;
  if (enabledTypes.has("restDay") && isRestDay && streak > 0 && hour >= 8 && hour <= 20) {
    candidates.push({
      type: "restDay",
      priority: 1,
      title: t("notifications.restDayStreakTitle"),
      body: t("notifications.restDayStreakBody", { streak }),
      icon: "moon",
      color: "#b388ff",
    });
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}
