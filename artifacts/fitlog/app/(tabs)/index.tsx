import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { dateLocale } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import {
  getTodayRecommendation,
  TodayRecommendation,
  UserCoachProfile,
  RecoveryContext,
} from "@/lib/coachEngine";
import { useTheme as useThemeImpl } from "@/hooks/useTheme";

type AppTheme = ReturnType<typeof useThemeImpl>["theme"];

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

const RING_SIZE = 120;
const STROKE = 12;
const R = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function CalorieRing({
  consumed, goal, theme,
}: { consumed: number; goal: number; theme: AppTheme }) {
  const { t } = useTranslation();
  const remaining = Math.max(0, goal - consumed);
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dash = pct * CIRC;
  const gap = CIRC - dash;
  const over = consumed > goal;
  const ringColor = over ? (theme.warning || "#ffab40") : theme.primary;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
          <G rotation="-90" origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}>
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
              stroke={theme.border} strokeWidth={STROKE} fill="none"
            />
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: over ? ringColor : theme.text, fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 26 }}>
            {remaining}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
            {t("home.kcalLeft")}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 }}>
        {consumed} / {goal} {t("common.kcal")}
      </Text>
    </View>
  );
}

// ─── Nutrition Card — calorie ring + protein ──────────────────────────────────

function NutritionCard({ mealsData, theme }: { mealsData: any; theme: AppTheme }) {
  const { t } = useTranslation();
  const totals = mealsData?.dailyTotals;
  const calorieGoal = mealsData?.calorieGoal ?? 2000;
  const consumed = totals?.calories ?? 0;
  const protein = totals?.proteinG ?? 0;
  const proteinGoal = Math.round(calorieGoal * 0.3 / 4);
  const proteinPct = proteinGoal > 0 ? Math.min(protein / proteinGoal, 1) : 0;

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {t("home.nutrition")}
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/meals" as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {t("home.viewAll")}
          </Text>
          <Feather name="chevron-right" size={13} color={theme.primary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <CalorieRing consumed={consumed} goal={calorieGoal} theme={theme} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
              {t("home.protein")}
            </Text>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {protein}g / {proteinGoal}g
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, width: `${proteinPct * 100}%`, backgroundColor: theme.primary, borderRadius: 4 }} />
          </View>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
            {protein >= proteinGoal
              ? "✓ Protein goal met!"
              : `${proteinGoal - protein}g protein to go`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();

  const actions = [
    {
      label: t("home.logWorkout"), icon: "activity" as const,
      color: theme.primary, onPress: () => router.push("/workouts/log" as any),
    },
    {
      label: t("home.logMeal"), icon: "coffee" as const,
      color: theme.pink || "#f48fb1", onPress: () => router.push("/meals/add" as any),
    },
    {
      label: t("home.scanMeal"), icon: "camera" as const,
      color: theme.secondary, onPress: () => router.push("/(tabs)/scan" as any),
    },
    {
      label: t("home.startWorkout"), icon: "play" as const,
      color: "#00e676", onPress: () => router.push("/(tabs)/workouts" as any),
    },
  ];

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
        {t("home.quickActions")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.quickBtnIcon, { backgroundColor: a.color + "20" }]}>
              <Feather name={a.icon} size={20} color={a.color} />
            </View>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Today's Workout Card ─────────────────────────────────────────────────────

function diffColor(d: string | undefined, theme: AppTheme) {
  if (d === "Beginner") return theme.primary;
  if (d === "Intermediate") return theme.secondary;
  return theme.warning || "#ffab40";
}

function TodayWorkoutCard({ todayRec, theme }: { todayRec: TodayRecommendation; theme: AppTheme }) {
  const { t } = useTranslation();
  const { recommendation: rec, reasonPills, contextSummary, isRestDayRecommended } = todayRec;

  if (isRestDayRecommended) {
    return (
      <Card style={{ borderColor: theme.secondary + "40", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.todayIcon, { backgroundColor: theme.secondaryDim }]}>
            <Feather name="moon" size={18} color={theme.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
              {t("home.aiCoach")}
            </Text>
            <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>
              {t("home.restDay")}
            </Text>
          </View>
        </View>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
          {t("home.restDayMessage")}
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/workouts" as any)}
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
        >
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            {t("home.browseWorkoutsAnyway")}
          </Text>
          <Feather name="chevron-right" size={14} color={theme.textMuted} />
        </Pressable>
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: theme.primary + "40", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.todayIcon, { backgroundColor: theme.primaryDim }]}>
          <Feather name="cpu" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.todaysRecommendedWorkout")}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }} numberOfLines={1}>
            {rec.template.name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <View style={styles.metaBadge}>
            <Feather name="clock" size={11} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
              {rec.template.durationMinutes}m
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: diffColor(rec.template.difficulty, theme) + "20" }]}>
            <Text style={{ color: diffColor(rec.template.difficulty, theme), fontFamily: "Inter_500Medium", fontSize: 11 }}>
              {rec.template.difficulty}
            </Text>
          </View>
        </View>
      </View>

      {contextSummary ? (
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
          {contextSummary}
        </Text>
      ) : null}

      {reasonPills.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {reasonPills.slice(0, 3).map((pill) => (
            <View key={pill} style={[styles.pill, { backgroundColor: theme.primaryDim }]}>
              <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 11 }}>{pill}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push({
          pathname: "/workouts/template" as any,
          params: { id: rec.template.id, whyGoodForYou: rec.whyGoodForYou },
        })}
        style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
      >
        <Feather name="play" size={15} color="#0f0f1a" />
        <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>
          {t("home.startWorkout")}
        </Text>
      </Pressable>
    </Card>
  );
}

function RestDayCard({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();
  return (
    <Card style={{ borderColor: theme.primary + "20", gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.todayIcon, { backgroundColor: theme.primaryDim }]}>
          <Feather name="moon" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.aiCoach")}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {t("home.restAndRecover")}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
        {t("home.restRecoverMessage")}
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/workouts" as any)}
        style={[styles.ctaBtn, { backgroundColor: theme.primaryDim }]}
      >
        <Feather name="activity" size={15} color={theme.primary} />
        <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {t("home.logWorkoutAnyway")}
        </Text>
      </Pressable>
    </Card>
  );
}

function CoachCtaCard({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();
  return (
    <Card style={{ borderColor: theme.secondary + "30", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.todayIcon, { backgroundColor: theme.secondaryDim }]}>
          <Feather name="zap" size={18} color={theme.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.aiCoach")}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {t("home.unlockRecommendations")}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
        {t("home.unlockMessage")}
      </Text>
      <Pressable
        onPress={() => router.push("/workouts/onboarding" as any)}
        style={[styles.ctaBtn, { backgroundColor: theme.secondary }]}
      >
        <Feather name="zap" size={15} color="#0f0f1a" />
        <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>
          {t("home.setUpAICoach")}
        </Text>
      </Pressable>
    </Card>
  );
}

// ─── Compact Streak Strip ─────────────────────────────────────────────────────

function StreakSummaryCard({ data, theme }: { data: any; theme: AppTheme }) {
  const { t } = useTranslation();
  if (!data) return null;
  const { streaks, weeklyScore } = data;
  const score = weeklyScore?.score ?? 0;
  const scoreColor = score >= 70 ? theme.primary : score >= 40 ? (theme.warning || "#ffab40") : theme.danger;

  const items = [
    { icon: "activity" as const, value: streaks?.workout?.current ?? 0, label: t("home.workout"), color: "#00e676" },
    { icon: "coffee" as const, value: streaks?.meal?.current ?? 0, label: t("home.mealsLabel"), color: "#ffab40" },
    { icon: "droplet" as const, value: streaks?.hydration?.current ?? 0, label: t("home.hydration"), color: "#448aff" },
    { icon: "trending-up" as const, value: score, label: t("home.thisWeek"), color: scoreColor, suffix: "%" },
  ];

  return (
    <Pressable
      onPress={() => router.push("/achievements" as any)}
      style={({ pressed }) => [
        styles.streakStrip,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {items.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />}
          <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Feather name={s.icon} size={11} color={s.color} />
              <Text style={{ color: s.color, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                {s.value}{s.suffix ?? ""}
              </Text>
            </View>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
              {s.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </Pressable>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(t: (key: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("home.goodMorning");
  if (h < 17) return t("home.goodAfternoon");
  return t("home.goodEvening");
}

function formatDate() {
  return new Date().toLocaleDateString(dateLocale(), {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const { data: mealsData, refetch: refetchMeals } = useQuery({
    queryKey: ["mealsToday"],
    queryFn: () => api.getMeals(),
    staleTime: 60000,
  });

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  const { data: workoutsData, refetch: refetchWorkouts } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => api.getWorkouts({ limit: 10 }),
  });

  const { data: recoveryTodayData, refetch: refetchRecovery } = useQuery({
    queryKey: ["recoveryToday"],
    queryFn: api.getRecoveryToday,
    staleTime: 60000,
  });

  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ["achievements"],
    queryFn: api.getAchievements,
    staleTime: 300000,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMeals(), refetchProfile(), refetchWorkouts(),
      refetchRecovery(), refetchAchievements(),
    ]);
    setRefreshing(false);
  }, [refetchMeals, refetchProfile, refetchWorkouts, refetchRecovery, refetchAchievements]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const hasCoachOnboarding = !!profile?.coachOnboardingComplete;

  const recentWorkoutsList = useMemo(() => {
    const workouts: any[] = workoutsData?.workouts || [];
    return workouts.slice(0, 10).map((w: any) => ({
      name: w.name,
      activityType: w.activityType,
      date: w.date,
      durationMinutes: w.durationMinutes,
    }));
  }, [workoutsData]);

  const todayRecommendation = useMemo<TodayRecommendation | null>(() => {
    if (!profile || !hasCoachOnboarding) return null;
    const coachProfile: UserCoachProfile = {
      availableEquipment: profile.availableEquipment || [],
      workoutLocation: profile.workoutLocation || "Home",
      trainingPreferences: profile.trainingPreferences || [],
      experienceLevel: profile.experienceLevel || "Beginner",
      preferredWorkoutDuration: profile.preferredWorkoutDuration || "45 minutes",
      weeklyWorkoutDays: profile.weeklyWorkoutDays || 3,
      fitnessGoals: profile.fitnessGoals || [],
    };
    const recoveryLog = recoveryTodayData?.log ?? undefined;
    const recoveryCtx: RecoveryContext | undefined = recoveryLog
      ? {
          sleepHours: recoveryLog.sleepHours ?? undefined,
          sleepQuality: recoveryLog.sleepQuality ?? undefined,
          energyLevel: recoveryLog.energyLevel ?? undefined,
          stressLevel: recoveryLog.stressLevel ?? undefined,
          soreness: recoveryLog.soreness ?? {},
        }
      : undefined;
    return getTodayRecommendation(coachProfile, recentWorkoutsList, recoveryCtx);
  }, [profile, recentWorkoutsList, hasCoachOnboarding, recoveryTodayData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* ── Greeting Header ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {getGreeting(t)},
            </Text>
            <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {user?.firstName || t("home.friend")} {user?.lastName || ""}
            </Text>
            <Text style={[styles.date, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {formatDate()}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={[styles.avatarBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
          >
            <Text style={[styles.avatarText, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
              {user?.firstName?.[0] || "U"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── Nutrition (calorie ring + protein) ── */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.section}>
          {mealsData ? (
            <NutritionCard mealsData={mealsData} theme={theme} />
          ) : (
            <Card style={{ gap: 12 }}>
              <SkeletonBox width="40%" height={14} borderRadius={6} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                <SkeletonBox width={RING_SIZE} height={RING_SIZE} borderRadius={RING_SIZE / 2} />
                <View style={{ flex: 1, gap: 10 }}>
                  <SkeletonBox width="100%" height={10} borderRadius={5} />
                  <SkeletonBox width="80%" height={10} borderRadius={5} />
                </View>
              </View>
            </Card>
          )}
        </Animated.View>

        {/* ── Today's Workout ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {t("home.todaysWorkout")}
            </Text>
            {hasCoachOnboarding && (
              <View style={[styles.aiPill, { backgroundColor: theme.primaryDim }]}>
                <Feather name="cpu" size={10} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 10 }}>
                  {t("home.aiCoach")}
                </Text>
              </View>
            )}
          </View>
          {profileLoading ? (
            <SkeletonCard>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <SkeletonBox width={40} height={40} borderRadius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox width="60%" height={13} />
                  <SkeletonBox width="80%" height={18} />
                </View>
              </View>
              <SkeletonBox width="100%" height={42} borderRadius={12} />
            </SkeletonCard>
          ) : hasCoachOnboarding && todayRecommendation ? (
            <TodayWorkoutCard todayRec={todayRecommendation} theme={theme} />
          ) : hasCoachOnboarding ? (
            <RestDayCard theme={theme} />
          ) : (
            <CoachCtaCard theme={theme} />
          )}
        </Animated.View>

        {/* ── Quick Actions ── */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.section}>
          <QuickActions theme={theme} />
        </Animated.View>

        {/* ── Streaks ── */}
        {achievementsData && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
            <StreakSummaryCard data={achievementsData} theme={theme} />
          </Animated.View>
        )}

        {/* ── AI Coach Shortcut (slim row) ── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Pressable
            onPress={() => router.push("/coach/chat" as any)}
            style={({ pressed }) => [
              styles.coachRow,
              { backgroundColor: theme.card, borderColor: theme.secondary + "50", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.coachIcon, { backgroundColor: theme.secondary + "20" }]}>
              <Feather name="message-circle" size={20} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {t("home.chatWithCoach")}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
                {t("home.chatWithCoachSubtitle")}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, marginBottom: 20,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 26, lineHeight: 32 },
  date: { fontSize: 13, marginTop: 4 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  aiPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  todayIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  metaBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1,
  },
  quickBtn: {
    width: "47.5%", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 18, borderRadius: 16, borderWidth: 1,
  },
  quickBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  coachRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  coachIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  streakStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1,
  },
});
