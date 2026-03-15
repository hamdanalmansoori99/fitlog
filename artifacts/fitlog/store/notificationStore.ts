import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotifType = "workout" | "meal" | "hydration" | "streak" | "recovery" | "weekly";

export interface NotifPrefs {
  enabled: boolean;
  time: string; // "HH:MM" 24-hour
}

interface NotificationState {
  globalEnabled: boolean;
  prefs: Record<NotifType, NotifPrefs>;
  setGlobalEnabled: (val: boolean) => void;
  setEnabled: (type: NotifType, val: boolean) => void;
  setTime: (type: NotifType, time: string) => void;
}

const DEFAULTS: Record<NotifType, NotifPrefs> = {
  workout:   { enabled: true,  time: "08:00" },
  meal:      { enabled: true,  time: "12:30" },
  hydration: { enabled: true,  time: "14:00" },
  streak:    { enabled: true,  time: "19:00" },
  recovery:  { enabled: true,  time: "09:00" },
  weekly:    { enabled: true,  time: "10:00" },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      globalEnabled: false,
      prefs: DEFAULTS,
      setGlobalEnabled: (globalEnabled) => set({ globalEnabled }),
      setEnabled: (type, enabled) =>
        set((s) => ({ prefs: { ...s.prefs, [type]: { ...s.prefs[type], enabled } } })),
      setTime: (type, time) =>
        set((s) => ({ prefs: { ...s.prefs, [type]: { ...s.prefs[type], time } } })),
    }),
    {
      name: "fitlog-notifications",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Metadata for each notification type ──────────────────────────────────────

export const NOTIF_META: Record<
  NotifType,
  { labelKey: string; descriptionKey: string; icon: string; color: string }
> = {
  workout:   { labelKey: "profile.notif.workoutLabel",   descriptionKey: "profile.notif.workoutDesc",   icon: "activity",    color: "#00e676" },
  meal:      { labelKey: "profile.notif.mealLabel",      descriptionKey: "profile.notif.mealDesc",      icon: "coffee",      color: "#ff80ab" },
  hydration: { labelKey: "profile.notif.hydrationLabel", descriptionKey: "profile.notif.hydrationDesc", icon: "droplet",     color: "#448aff" },
  streak:    { labelKey: "profile.notif.streakLabel",    descriptionKey: "profile.notif.streakDesc",    icon: "zap",         color: "#ffab40" },
  recovery:  { labelKey: "profile.notif.recoveryLabel",  descriptionKey: "profile.notif.recoveryDesc",  icon: "heart",       color: "#ea80fc" },
  weekly:    { labelKey: "profile.notif.weeklyLabel",    descriptionKey: "profile.notif.weeklyDesc",    icon: "bar-chart-2", color: "#18ffff" },
};

export const NOTIF_TYPES: NotifType[] = ["workout", "meal", "hydration", "streak", "recovery", "weekly"];
