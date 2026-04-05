import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useNotificationStore } from "@/store/notificationStore";
import { scheduleNativeNotifications, hasNotificationPermission } from "@/lib/notifications";

function routeForType(type?: string): string {
  switch (type) {
    case "workout": return "/(tabs)/workouts";
    case "meal":    return "/(tabs)/meals";
    case "streak":  return "/(tabs)/workouts";
    case "recovery": return "/recovery";
    case "weekly":  return "/(tabs)/progress";
    default:        return "/(tabs)";
  }
}

/**
 * Wires up two things that the existing notification system was missing:
 * 1. Re-schedules local notifications on app launch if the user had them enabled
 *    (handles OS restarts, reinstalls, and token refresh scenarios).
 * 2. Routes the user to the correct screen when they tap a notification.
 */
export function useNotificationSetup(isAuthenticated: boolean) {
  const { globalEnabled, prefs } = useNotificationStore();
  const router = useRouter();
  const hasRescheduled = useRef(false);

  // Re-schedule on launch when user is authenticated and had notifications on
  useEffect(() => {
    if (!isAuthenticated || !globalEnabled || hasRescheduled.current) return;
    if (Platform.OS === "web") return;
    hasRescheduled.current = true;
    hasNotificationPermission().then((granted) => {
      if (granted) scheduleNativeNotifications(prefs);
    });
  }, [isAuthenticated, globalEnabled, prefs]);

  // Handle notification tap — route to appropriate screen
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Fired when user taps a notification while app is backgrounded or closed
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        route?: string;
      };
      const route = data.route ?? routeForType(data.type);
      try {
        router.push(route as any);
      } catch {}
    });

    return () => tapSub.remove();
  }, [router]);
}
