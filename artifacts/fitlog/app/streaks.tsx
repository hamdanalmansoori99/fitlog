import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { rtlIcon, dateLocale } from "@/lib/rtl";
import { getStreakNarrative, getStreakLabelKey } from "@/lib/streakNarratives";

const MILESTONES = [3, 7, 14, 30, 60, 100];

const MILESTONE_LABELS: Record<number, string> = {
  3: "streaks.milestone3",
  7: "streaks.milestone7",
  14: "streaks.milestone14",
  30: "streaks.milestone30",
  60: "streaks.milestone60",
  100: "streaks.milestone100",
};

function StreakRing({
  current, best, label, icon, color, theme,
}: {
  current: number; best: number; label: string;
  icon: keyof typeof Feather.glyphMap; color: string; theme: any;
}) {
  const { t } = useTranslation();
  const nextMilestone = MILESTONES.find((m) => m > current) ?? 100;
  const pct = Math.min(current / nextMilestone, 1);

  return (
    <Card style={{ gap: 12, borderColor: color + "30" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {label}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("streaks.nextMilestone", { count: nextMilestone })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: color, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 32 }}>
            {current}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
            {current === 1 ? t("streaks.day") : t("streaks.days")}
          </Text>
        </View>
      </View>

      {(() => {
        const narrative = getStreakNarrative(current);
        return (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Feather name={narrative.icon as keyof typeof Feather.glyphMap} size={15} color={theme.textMuted} />
              <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 1 }}>
                {t(narrative.messageKey)}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 4 }}>
              {t(getStreakLabelKey(current), { count: current })}
            </Text>
          </View>
        );
      })()}

      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <View style={[styles.progressFill, { backgroundColor: color, width: `${pct * 100}%` as `${number}%` }]} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="zap" size={12} color={color} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("streaks.currentStreak")}: {current}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="award" size={12} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("streaks.longestStreak")}: {best}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function MilestoneBadge({
  milestone, achieved, color, theme,
}: {
  milestone: number; achieved: boolean; color: string; theme: any;
}) {
  const { t } = useTranslation();
  const labelKey = MILESTONE_LABELS[milestone];

  return (
    <View style={[
      styles.milestoneBadge,
      {
        backgroundColor: achieved ? color + "15" : theme.card,
        borderColor: achieved ? color + "40" : theme.border,
      },
    ]}>
      {achieved ? <MaterialCommunityIcons name="fire" size={20} color={color} /> : <Feather name="lock" size={20} color={theme.textMuted} />}
      <Text style={{
        color: achieved ? color : theme.textMuted,
        fontFamily: "Inter_700Bold",
        fontSize: 16,
      }}>
        {milestone}
      </Text>
      <Text style={{
        color: achieved ? theme.text : theme.textMuted,
        fontFamily: "Inter_500Medium",
        fontSize: 10,
        textAlign: "center",
      }}>
        {labelKey ? t(labelKey) : `${milestone} ${t("streaks.days")}`}
      </Text>
    </View>
  );
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLocalizedDayLabels(locale: string): string[] {
  const labels: string[] = [];
  const base = new Date(2024, 0, 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    labels.push(d.toLocaleDateString(locale, { weekday: "narrow" }));
  }
  return labels;
}

function ActivityCalendar({
  activityDates, theme,
}: {
  activityDates: string[]; theme: any;
}) {
  const { t } = useTranslation();
  const locale = dateLocale();

  const { activeDays, weeks, monthLabel, dayLabels } = useMemo(() => {
    const active = new Set<string>(activityDates || []);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();

    const calWeeks: (Date | null)[][] = [];
    let week: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) week.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      week.push(date);
      if (week.length === 7) {
        calWeeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      calWeeks.push(week);
    }

    const label = today.toLocaleDateString(locale, { month: "long", year: "numeric" });
    const localDayLabels = getLocalizedDayLabels(locale);

    return { activeDays: active, weeks: calWeeks, monthLabel: label, dayLabels: localDayLabels };
  }, [activityDates, locale]);

  const todayStr = toLocalDateStr(new Date());

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name="calendar" size={16} color={theme.primary} />
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {t("streaks.activityCalendar")}
        </Text>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
        {monthLabel}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 2 }}>
        {dayLabels.map((d, i) => (
          <Text key={i} style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, width: 32, textAlign: "center" }}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={di} style={styles.calDay} />;
            }
            const ds = toLocalDateStr(day);
            const isActive = activeDays.has(ds);
            const isToday = ds === todayStr;

            return (
              <View
                key={di}
                style={[
                  styles.calDay,
                  {
                    backgroundColor: isActive ? theme.primary + "30" : "transparent",
                    borderColor: isToday ? theme.primary : "transparent",
                    borderWidth: isToday ? 1.5 : 0,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text style={{
                  color: isActive ? theme.primary : theme.textMuted,
                  fontFamily: isActive ? "Inter_700Bold" : "Inter_400Regular",
                  fontSize: 13,
                }}>
                  {day.getDate()}
                </Text>
                {isActive && (
                  <View style={[styles.calDot, { backgroundColor: theme.primary }]} />
                )}
              </View>
            );
          })}
        </View>
      ))}

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary + "30" }} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
            {t("streaks.activeDay")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: theme.primary }} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
            {t("streaks.today")}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function StreakHistoryScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: streaksData, isLoading } = useQuery({
    queryKey: ["streaks"],
    queryFn: api.getStreaks,
    staleTime: 60000,
  });

  const workoutCurrent = streaksData?.currentWorkoutStreak ?? 0;
  const workoutBest = streaksData?.longestWorkoutStreak ?? 0;
  const mealCurrent = streaksData?.currentMealStreak ?? 0;
  const mealBest = streaksData?.longestMealStreak ?? 0;
  const hydrationCurrent = streaksData?.currentHydrationStreak ?? 0;
  const hydrationBest = streaksData?.longestHydrationStreak ?? 0;

  const bestOverall = Math.max(workoutBest, mealBest, hydrationBest);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={22} color={theme.text} />
        </Pressable>
        <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          {t("streaks.title")}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
      >
        {isLoading ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular" }}>
              {t("common.loading")}
            </Text>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(400)}>
              <ActivityCalendar activityDates={streaksData?.activityDates ?? []} theme={theme} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <StreakRing
                current={workoutCurrent}
                best={workoutBest}
                label={t("streaks.workoutStreak")}
                icon="activity"
                color="#00e676"
                theme={theme}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(400)}>
              <StreakRing
                current={mealCurrent}
                best={mealBest}
                label={t("streaks.mealStreak")}
                icon="coffee"
                color="#ffab40"
                theme={theme}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(400)}>
              <StreakRing
                current={hydrationCurrent}
                best={hydrationBest}
                label={t("streaks.hydrationStreak")}
                icon="droplet"
                color="#448aff"
                theme={theme}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(400)}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 }}>
                {t("streaks.milestones")}
              </Text>
              <View style={styles.milestoneGrid}>
                {MILESTONES.map((m, i) => (
                  <Animated.View key={m} entering={ZoomIn.delay(380 + i * 60).duration(300)} style={{ width: "30%" }}>
                    <MilestoneBadge
                      milestone={m}
                      achieved={bestOverall >= m}
                      color="#00e676"
                      theme={theme}
                    />
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  progressBar: {
    height: 6, borderRadius: 3, overflow: "hidden",
  },
  progressFill: {
    height: 6, borderRadius: 3,
  },
  milestoneGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-start",
  },
  milestoneBadge: {
    alignItems: "center", gap: 4, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: 1,
  },
  calDay: {
    width: 32, height: 36, alignItems: "center", justifyContent: "center",
  },
  calDot: {
    width: 4, height: 4, borderRadius: 2, marginTop: 1,
  },
});
