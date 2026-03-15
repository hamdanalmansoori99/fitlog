import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "react-i18next";
import { dateLocale } from "@/lib/rtl";

type AchievementCategory = "all" | "workouts" | "streaks" | "nutrition" | "hydration" | "prs";

const CAT_COLORS: Record<string, string> = {
  workouts:  "#00e676",
  streaks:   "#ff6d00",
  nutrition: "#ffab40",
  hydration: "#448aff",
  prs:       "#e040fb",
};

const CAT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  workouts:  "activity",
  streaks:   "zap",
  nutrition: "coffee",
  hydration: "droplet",
  prs:       "trending-up",
};

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  workout_count:     "activity",
  workout_streak:    "zap",
  meal_streak:       "coffee",
  hydration_streak:  "droplet",
  pr_count:          "trending-up",
};

function StreakCounter({
  label, icon, value, best, color, theme,
}: {
  label: string; icon: keyof typeof Feather.glyphMap;
  value: number; best: number; color: string; theme: any;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.streakCard, { backgroundColor: theme.card, borderColor: color + "30" }]}>
      <View style={[styles.streakIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.streakNum, { color: color, fontFamily: "Inter_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.streakLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
      <Text style={[styles.streakBest, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        {t("achievements.bestDays", { count: best })}
      </Text>
    </View>
  );
}

function WeekDots({ perDay, theme }: { perDay: any[]; theme: any }) {
  const days = [...perDay].reverse();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const actual = days.map((d, i) => ({
    ...d,
    label: new Date(d.date + "T12:00:00").toLocaleDateString(dateLocale(), { weekday: "narrow" }),
  }));
  return (
    <View style={styles.weekDotsRow}>
      {actual.map((d, i) => (
        <View key={i} style={styles.weekDotCol}>
          <Text style={[styles.weekDayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {d.label}
          </Text>
          <View style={styles.weekDotStack}>
            <View style={[styles.dot, { backgroundColor: d.workout ? "#00e676" : theme.border }]} />
            <View style={[styles.dot, { backgroundColor: d.meal    ? "#ffab40" : theme.border }]} />
            <View style={[styles.dot, { backgroundColor: d.hydration ? "#448aff" : theme.border }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AchievementBadge({ item, theme }: { item: any; theme: any }) {
  const { t } = useTranslation();
  const color = CAT_COLORS[item.category] ?? theme.primary;
  const icon = TYPE_ICONS[item.type] ?? "award";
  const progress = item.progress;
  const pct = progress ? Math.min(progress.current / progress.total, 1) : 0;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: item.earned ? color + "12" : theme.card,
            borderColor: item.earned ? color + "50" : theme.border,
            opacity: item.earned ? 1 : 0.7,
          },
        ]}
      >
        <View style={styles.badgeTop}>
          <View style={[styles.badgeIcon, { backgroundColor: item.earned ? color + "22" : theme.border + "40" }]}>
            <Feather name={icon as any} size={20} color={item.earned ? color : theme.textMuted} />
            {item.earned && (
              <View style={[styles.earnedTick, { backgroundColor: color }]}>
                <Feather name="check" size={8} color="#000" />
              </View>
            )}
          </View>
          {!item.earned && <Feather name="lock" size={12} color={theme.textMuted} style={{ position: "absolute", top: 6, right: 6 }} />}
        </View>

        <Text style={[styles.badgeTitle, { color: item.earned ? theme.text : theme.textMuted, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {t(`achievements.badgeDefs.${item.key}.title`, { defaultValue: item.title })}
        </Text>
        <Text style={[styles.badgeDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {t(`achievements.badgeDefs.${item.key}.description`, { defaultValue: item.description })}
        </Text>

        {item.earned ? (
          <Text style={[styles.badgeDate, { color: color, fontFamily: "Inter_500Medium" }]}>
            {item.earnedAt ? new Date(item.earnedAt).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" }) : t("achievements.earned")}
          </Text>
        ) : (
          progress && (
            <View style={{ marginTop: 6, gap: 4 }}>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { backgroundColor: color, width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={[styles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {progress.current} / {progress.total}
              </Text>
            </View>
          )
        )}
      </View>
    </Animated.View>
  );
}

export default function AchievementsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [filter, setFilter] = useState<AchievementCategory>("all");

  const CATEGORY_FILTERS: { key: AchievementCategory; label: string }[] = [
    { key: "all",       label: t("achievements.all")       },
    { key: "workouts",  label: t("achievements.workouts")  },
    { key: "streaks",   label: t("achievements.streaks")   },
    { key: "nutrition", label: t("achievements.nutrition") },
    { key: "hydration", label: t("achievements.hydration") },
    { key: "prs",       label: t("achievements.prs")       },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: api.getAchievements,
    staleTime: 60000,
  });

  const streaks = data?.streaks;
  const weekly = data?.weeklyScore;
  const achievements: any[] = data?.achievements ?? [];
  const recentPRs: any[] = data?.recentPRs ?? [];
  const newlyEarned: string[] = data?.newlyEarned ?? [];

  const filtered = filter === "all"
    ? achievements
    : achievements.filter(a => a.category === filter);

  const earned = achievements.filter(a => a.earned).length;
  const total = achievements.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("achievements.title")}</Text>
          {!isLoading && (
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
              {t("achievements.unlocked", { earned, total })}
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        >
          <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("achievements.currentStreaks")}</Text>
            <View style={styles.streaksRow}>
              <StreakCounter label={t("achievements.workouts")} icon="activity" value={streaks?.workout?.current ?? 0} best={streaks?.workout?.best ?? 0} color="#00e676" theme={theme} />
              <StreakCounter label={t("achievements.meals")}    icon="coffee"   value={streaks?.meal?.current ?? 0}    best={streaks?.meal?.best ?? 0}    color="#ffab40" theme={theme} />
              <StreakCounter label={t("achievements.hydration")} icon="droplet" value={streaks?.hydration?.current ?? 0} best={streaks?.hydration?.best ?? 0} color="#448aff" theme={theme} />
            </View>
          </Animated.View>

          {weekly && (
            <Animated.View entering={FadeInDown.delay(80).duration(350)}>
              <Card style={styles.weeklyCard}>
                <View style={styles.weeklyHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>{t("achievements.thisWeek")}</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                      {t("achievements.dWorkouts", { count: weekly.workoutDays })} · {t("achievements.dMeals", { count: weekly.mealDays })} · {t("achievements.dHydration", { count: weekly.hydrationDays })}
                    </Text>
                  </View>
                  <View style={styles.scoreCircle}>
                    <Text style={[styles.scoreNum, { color: weekly.score >= 70 ? theme.primary : weekly.score >= 40 ? theme.warning : theme.danger, fontFamily: "Inter_700Bold" }]}>
                      {weekly.score}%
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9 }}>{t("achievements.score")}</Text>
                  </View>
                </View>
                {weekly.perDay && <WeekDots perDay={weekly.perDay} theme={theme} />}
                <View style={styles.legendRow}>
                  {[["#00e676", t("achievements.workout")], ["#ffab40", t("achievements.meals")], ["#448aff", t("achievements.hydration")]].map(([color, label]) => (
                    <View key={label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: color }]} />
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(140).duration(350)}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("achievements.badges")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 2 }}>
                {CATEGORY_FILTERS.map(f => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filter === f.key ? (f.key === "all" ? theme.primary : CAT_COLORS[f.key] ?? theme.primary) : theme.card,
                        borderColor: filter === f.key ? "transparent" : theme.border,
                      },
                    ]}
                  >
                    <Text style={{
                      color: filter === f.key ? "#0f0f1a" : theme.textMuted,
                      fontFamily: "Inter_600SemiBold", fontSize: 12,
                    }}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.badgeGrid}>
              {filtered.map(item => (
                <View key={item.key} style={styles.badgeCell}>
                  <AchievementBadge item={item} theme={theme} />
                </View>
              ))}
            </View>
          </Animated.View>

          {recentPRs.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(350)}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("achievements.recentPRs")}</Text>
              <Card style={{ gap: 0 }}>
                {recentPRs.map((pr: any, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.prRow,
                      i < recentPRs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={[styles.prIcon, { backgroundColor: "#e040fb" + "18" }]}>
                      <Feather name="trending-up" size={16} color="#e040fb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{pr.exercise}</Text>
                      {pr.date && (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                          {new Date(pr.date + "T12:00:00").toLocaleDateString(dateLocale(), { month: "short", day: "numeric" })}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.prBadge, { backgroundColor: "#e040fb" + "18" }]}>
                      <Text style={{ color: "#e040fb", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                        {pr.weightKg % 1 === 0 ? pr.weightKg : pr.weightKg.toFixed(1)}
                      </Text>
                      <Text style={{ color: "#e040fb", fontFamily: "Inter_400Regular", fontSize: 10 }}>{t("common.kg")}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </Animated.View>
          )}

          {recentPRs.length === 0 && (
            <Card style={styles.emptyPR}>
              <Feather name="trending-up" size={32} color={theme.textMuted} />
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "center" }}>{t("achievements.noPRsYet")}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                {t("achievements.logExercisesForPRs")}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 22 },
  content: { padding: 20, gap: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 10 },

  streaksRow: { flexDirection: "row", gap: 10 },
  streakCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5,
    padding: 12, alignItems: "center", gap: 4,
  },
  streakIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  streakNum: { fontSize: 30, lineHeight: 34 },
  streakLabel: { fontSize: 12 },
  streakBest: { fontSize: 11 },

  weeklyCard: { gap: 12 },
  weeklyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreCircle: { alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" },
  scoreNum: { fontSize: 20, lineHeight: 24 },
  weekDotsRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDotCol: { alignItems: "center", gap: 4 },
  weekDayLabel: { fontSize: 10 },
  weekDotStack: { gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },

  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },

  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  badgeCell: { width: "47.5%" },
  badge: { borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 4 },
  badgeTop: { position: "relative", alignSelf: "flex-start", marginBottom: 6 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  earnedTick: { position: "absolute", bottom: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  badgeTitle: { fontSize: 13 },
  badgeDesc: { fontSize: 11, lineHeight: 15 },
  badgeDate: { fontSize: 11, marginTop: 4 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 10 },

  prRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  prIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  prBadge: { alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  emptyPR: { alignItems: "center", gap: 8, paddingVertical: 28 },
});
