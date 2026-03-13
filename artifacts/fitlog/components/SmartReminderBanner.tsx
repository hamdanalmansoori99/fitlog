import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useNotificationStore, NOTIF_TYPES } from "@/store/notificationStore";
import { computeActiveReminders, dismissReminder, type ReminderData } from "@/lib/notifications";

interface Props {
  streaksData?: any;
  todayStats?: any;
  todayMealsData?: any;
  profile?: any;
  workoutsData?: any;
  weeklyData?: any;
}

export function SmartReminderBanner({
  streaksData, todayStats, todayMealsData, profile, workoutsData, weeklyData,
}: Props) {
  const { theme } = useTheme();
  const { globalEnabled, prefs } = useNotificationStore();
  const [reminder, setReminder] = useState<ReminderData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);

  // Build set of enabled types
  const enabledTypes = new Set(
    NOTIF_TYPES.filter((t) => prefs[t].enabled)
  );

  const compute = useCallback(async () => {
    if (!globalEnabled) { setChecked(true); return; }

    const allReminders = computeActiveReminders({
      streaksData, todayStats, todayMealsData, profile, workoutsData, weeklyData, enabledTypes,
    });

    // Filter out ones dismissed recently
    const { isReminderDismissed } = await import("@/lib/notifications");
    for (const r of allReminders) {
      const isDismissed = await isReminderDismissed(r.type);
      if (!isDismissed) {
        setReminder(r);
        setDismissed(false);
        setChecked(true);
        return;
      }
    }
    setReminder(null);
    setChecked(true);
  }, [globalEnabled, streaksData, todayStats, profile, workoutsData, weeklyData, prefs]);

  useEffect(() => { compute(); }, [compute]);

  if (!checked || !reminder || dismissed) return null;

  const accent = reminder.color ?? theme.primary;

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(250)}>
      <View style={[styles.banner, { backgroundColor: accent + "14", borderColor: accent + "40" }]}>
        {/* Icon + content */}
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
            <Feather name={(reminder.icon ?? "bell") as any} size={18} color={accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: accent, fontFamily: "Inter_700Bold", fontSize: 13 }} numberOfLines={1}>
              {reminder.title}
            </Text>
            <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>
              {reminder.body}
            </Text>
            {reminder.cta && reminder.ctaRoute && (
              <Pressable
                onPress={() => router.push(reminder.ctaRoute as any)}
                style={({ pressed }) => [styles.ctaBtn, { backgroundColor: accent + "22", opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ color: accent, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {reminder.cta} →
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Dismiss */}
        <Pressable
          onPress={async () => {
            await dismissReminder(reminder.type);
            setDismissed(true);
          }}
          hitSlop={12}
          style={styles.dismissBtn}
        >
          <Feather name="x" size={15} color={theme.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  ctaBtn: {
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, marginTop: 6,
  },
  dismissBtn: {
    padding: 2,
  },
});
