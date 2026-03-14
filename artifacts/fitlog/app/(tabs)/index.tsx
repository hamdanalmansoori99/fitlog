import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { ActivityItem } from "@/components/ActivityItem";
import { Card } from "@/components/ui/Card";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import {
  getTodayRecommendation,
  getCoachInsights,
  TodayRecommendation,
  CoachInsight,
  UserCoachProfile,
} from "@/lib/coachEngine";
import { getNutritionInsights, NutritionInsight, NutritionContext } from "@/lib/nutritionCoach";
import { SmartReminderBanner } from "@/components/SmartReminderBanner";
import { WaterTracker } from "@/components/WaterTracker";
import { RecoveryCheckIn } from "@/components/RecoveryCheckIn";
import { RecoveryContext } from "@/lib/coachEngine";
import { GoalInsightsPanel } from "@/components/GoalInsightsPanel";
import { computeGoalInsights, GoalInsight } from "@/lib/goalInsights";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function diffColor(d: string | undefined, theme: any) {
  if (d === "Beginner") return theme.primary;
  if (d === "Intermediate") return theme.secondary;
  return theme.orange || "#ff6d00";
}

// ─── Today's Recommended Workout Card ────────────────────────────────────────

function TodayWorkoutCard({
  todayRec,
  theme,
}: {
  todayRec: TodayRecommendation;
  theme: any;
}) {
  const { recommendation: rec, reasonPills, contextSummary, isRestDayRecommended } = todayRec;

  if (isRestDayRecommended) {
    return (
      <Animated.View entering={FadeIn.duration(400)}>
        <Card style={[styles.todayCard, { borderColor: theme.secondary + "40" }]}>
          <View style={styles.todayHeader}>
            <View style={[styles.todayIcon, { backgroundColor: theme.secondaryDim }]}>
              <Feather name="moon" size={18} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.todayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Today's Recommendation
              </Text>
              <Text style={[styles.todayTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Rest Day
              </Text>
            </View>
          </View>
          <Text style={[styles.todayContext, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            You've trained 5+ days in a row — your body needs recovery to grow. Take a rest day or go for a light walk.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/workouts")}
            style={[styles.todaySecondaryBtn, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
              Browse all workouts anyway
            </Text>
            <Feather name="chevron-right" size={14} color={theme.textMuted} />
          </Pressable>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Card style={[styles.todayCard, { borderColor: theme.primary + "40" }]}>
        {/* Header row */}
        <View style={styles.todayHeader}>
          <View style={[styles.todayIcon, { backgroundColor: theme.primaryDim }]}>
            <Feather name="cpu" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Today's Recommended Workout
            </Text>
            <Text
              style={[styles.todayTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}
              numberOfLines={1}
            >
              {rec.template.name}
            </Text>
          </View>
        </View>

        {/* Meta badges */}
        <View style={styles.todayMeta}>
          <View style={styles.metaBadge}>
            <Feather name="clock" size={11} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {rec.template.durationMinutes} min
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: diffColor(rec.template.difficulty, theme) + "20" }]}>
            <Text style={{ color: diffColor(rec.template.difficulty, theme), fontFamily: "Inter_500Medium", fontSize: 11 }}>
              {rec.template.difficulty}
            </Text>
          </View>
          <View style={[styles.metaBadge, {
            backgroundColor: rec.equipmentMatch === "full" ? theme.primaryDim : "#ff6d0020",
          }]}>
            <Feather
              name={rec.equipmentMatch === "full" ? "check-circle" : "tool"}
              size={11}
              color={rec.equipmentMatch === "full" ? theme.primary : theme.orange || "#ff6d00"}
            />
            <Text style={{
              color: rec.equipmentMatch === "full" ? theme.primary : theme.orange || "#ff6d00",
              fontFamily: "Inter_400Regular", fontSize: 11,
            }}>
              {rec.equipmentMatch === "full" ? "Full match" : "With subs"}
            </Text>
          </View>
        </View>

        {/* Context summary */}
        <Text style={[styles.todayContext, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {contextSummary}
        </Text>

        {/* Reason pills */}
        {reasonPills.length > 0 && (
          <View style={styles.pillRow}>
            {reasonPills.map((pill) => (
              <View key={pill} style={[styles.pill, { backgroundColor: theme.primaryDim }]}>
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                  {pill}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/workouts/template" as any,
              params: { id: rec.template.id, whyGoodForYou: rec.whyGoodForYou },
            })
          }
          style={[styles.todayCta, { backgroundColor: theme.primary }]}
        >
          <Feather name="play" size={15} color="#0f0f1a" />
          <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>
            Start Workout
          </Text>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

// ─── Coach CTA (no onboarding) ────────────────────────────────────────────────

function CoachCtaCard({ theme }: { theme: any }) {
  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Card style={[styles.todayCard, { borderColor: theme.secondary + "30" }]}>
        <View style={styles.todayHeader}>
          <View style={[styles.todayIcon, { backgroundColor: theme.secondaryDim }]}>
            <Feather name="zap" size={18} color={theme.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              AI Coach
            </Text>
            <Text style={[styles.todayTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Unlock smart recommendations
            </Text>
          </View>
        </View>
        <Text style={[styles.todayContext, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Tell the coach your goals, equipment and schedule — and get a personalised daily workout every time you open the app.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/workouts")}
          style={[styles.todayCta, { backgroundColor: theme.secondary }]}
        >
          <Feather name="settings" size={15} color="#0f0f1a" />
          <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>
            Set Up Coach
          </Text>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

// ─── Coach Insight Card ────────────────────────────────────────────────────────

function CoachInsightCard({ insights, theme }: { insights: CoachInsight[]; theme: any }) {
  if (insights.length === 0) return null;

  const iconColor = (insight: CoachInsight) =>
    insight.positive ? theme.primary : theme.warning || "#ff9800";

  const bgColor = (insight: CoachInsight) =>
    insight.positive ? theme.primaryDim : (theme.warning || "#ff9800") + "18";

  return (
    <Animated.View entering={FadeIn.delay(60).duration(400)}>
      <Card style={{ borderColor: theme.border, gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="cpu" size={13} color={theme.primary} />
          <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.4 }}>
            COACH INSIGHTS
          </Text>
        </View>
        {insights.map((insight, i) => (
          <View
            key={insight.type + i}
            style={[
              { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
              i < insights.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={[{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }, { backgroundColor: bgColor(insight) }]}>
              <Feather name={insight.icon as any} size={17} color={iconColor(insight)} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 }}>
                {insight.headline}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }}>
                {insight.detail}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

// ─── Nutrition Insights Card ───────────────────────────────────────────────────

function NutritionInsightsCard({ insights, theme }: { insights: NutritionInsight[]; theme: any }) {
  if (insights.length === 0) return null;

  const borderColor = (t: NutritionInsight["type"]) => {
    if (t === "warning") return theme.warning || "#ffab40";
    if (t === "success") return theme.primary;
    if (t === "info")    return theme.secondary;
    return theme.primary;
  };
  const iconColor = (t: NutritionInsight["type"]) => borderColor(t);
  const iconBg = (t: NutritionInsight["type"]) => borderColor(t) + "18";

  return (
    <Animated.View entering={FadeIn.delay(80).duration(400)}>
      <Card style={{ borderColor: theme.border, gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="aperture" size={13} color={theme.secondary} />
          <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.4 }}>
            NUTRITION INSIGHTS
          </Text>
        </View>
        {insights.map((insight, i) => (
          <View
            key={insight.id}
            style={[
              { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
              i < insights.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: iconBg(insight.type) }}>
              <Feather name={insight.icon as any} size={17} color={iconColor(insight.type)} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 17 }}>
                {insight.headline}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }}>
                {insight.detail}
              </Text>
            </View>
          </View>
        ))}
        <Pressable
          onPress={() => router.push("/(tabs)/meals" as any)}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border, gap: 4 }}
        >
          <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>View nutrition</Text>
          <Feather name="chevron-right" size={12} color={theme.secondary} />
        </Pressable>
      </Card>
    </Animated.View>
  );
}

// ─── Streak & Achievements Summary Card ───────────────────────────────────────

function StreakSummaryCard({ data, theme }: { data: any; theme: any }) {
  if (!data) return null;
  const { streaks, weeklyScore, achievements } = data;
  const earned = (achievements ?? []).filter((a: any) => a.earned).length;
  const total = (achievements ?? []).length;
  const score = weeklyScore?.score ?? 0;
  const scoreColor = score >= 70 ? theme.primary : score >= 40 ? theme.warning : theme.danger;

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Streaks</Text>
        <Pressable
          onPress={() => router.push("/achievements" as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {earned}/{total} badges
          </Text>
          <Feather name="chevron-right" size={13} color={theme.primary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {[
          { icon: "activity" as const, value: streaks?.workout?.current ?? 0,    label: "Workout",   color: "#00e676" },
          { icon: "coffee"   as const, value: streaks?.meal?.current ?? 0,       label: "Meals",     color: "#ffab40" },
          { icon: "droplet"  as const, value: streaks?.hydration?.current ?? 0,  label: "Hydration", color: "#448aff" },
        ].map((s, i) => (
          <View key={s.label} style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Feather name={s.icon} size={13} color={s.color} />
              <Text style={{ color: s.color, fontFamily: "Inter_700Bold", fontSize: 24, lineHeight: 28 }}>{s.value}</Text>
            </View>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{s.label}</Text>
          </View>
        ))}
        <View style={{ width: 1, backgroundColor: theme.border, height: 44, marginHorizontal: 4 }} />
        <Pressable
          onPress={() => router.push("/achievements" as any)}
          style={{ flex: 1, alignItems: "center", gap: 3 }}
        >
          <Text style={{ color: scoreColor, fontFamily: "Inter_700Bold", fontSize: 24, lineHeight: 28 }}>
            {score}%
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>This week</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const { data: todayStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["todayStats"],
    queryFn: api.getTodayStats,
  });

  const { data: weeklyData, refetch: refetchWeekly } = useQuery({
    queryKey: ["weeklyStats"],
    queryFn: api.getWeeklyStats,
  });

  const { data: recentData, isLoading: recentLoading, refetch: refetchRecent } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: api.getRecentActivity,
  });

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  const { data: workoutsData, refetch: refetchWorkouts } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => api.getWorkouts({ limit: 20 }),
  });

  const { data: streaksData, refetch: refetchStreaks } = useQuery({
    queryKey: ["streaks"],
    queryFn: api.getStreaks,
  });

  const { data: todayMealsData, refetch: refetchMeals } = useQuery({
    queryKey: ["mealsToday"],
    queryFn: () => api.getMeals(),
    staleTime: 60000,
  });

  const { data: recoveryTodayData, refetch: refetchRecovery } = useQuery({
    queryKey: ["recoveryToday"],
    queryFn: api.getRecoveryToday,
    staleTime: 60000,
  });

  const { data: nutritionStatsData, refetch: refetchNutrition } = useQuery({
    queryKey: ["nutritionStats"],
    queryFn: api.getNutritionStats,
    staleTime: 120000,
  });

  const { data: workoutSummaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["workoutSummary"],
    queryFn: api.getWorkoutSummary,
    staleTime: 120000,
  });

  const { data: achievementsData, refetch: refetchAchievements } = useQuery({
    queryKey: ["achievements"],
    queryFn: api.getAchievements,
    staleTime: 300000,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const [fabOpen, setFabOpen] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(), refetchWeekly(), refetchRecent(),
      refetchProfile(), refetchWorkouts(), refetchStreaks(),
      refetchMeals(), refetchRecovery(), refetchNutrition(),
      refetchSummary(), refetchAchievements(),
    ]);
    setRefreshing(false);
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const hasCoachOnboarding = !!profile?.coachOnboardingComplete;

  const recentWorkoutsList = useMemo(() => {
    const workouts: any[] = workoutsData?.workouts || [];
    return workouts.slice(0, 20).map((w: any) => ({
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

  const coachInsights = useMemo<CoachInsight[]>(() => {
    if (!profile || !hasCoachOnboarding || recentWorkoutsList.length === 0) return [];
    const coachProfile: UserCoachProfile = {
      availableEquipment: profile.availableEquipment || [],
      workoutLocation: profile.workoutLocation || "Home",
      trainingPreferences: profile.trainingPreferences || [],
      experienceLevel: profile.experienceLevel || "Beginner",
      preferredWorkoutDuration: profile.preferredWorkoutDuration || "45 minutes",
      weeklyWorkoutDays: profile.weeklyWorkoutDays || 3,
      fitnessGoals: profile.fitnessGoals || [],
    };
    return getCoachInsights(coachProfile, recentWorkoutsList, {
      currentWorkoutStreak: streaksData?.currentWorkoutStreak,
      totalWorkouts: workoutsData?.total,
    });
  }, [profile, recentWorkoutsList, streaksData, workoutsData, hasCoachOnboarding]);

  const nutritionInsights = useMemo<NutritionInsight[]>(() => {
    const totals = todayMealsData?.dailyTotals;
    const meals: any[] = todayMealsData?.meals || [];
    if (!totals && meals.length === 0) return [];

    const todayWorkouts: any[] = (workoutsData?.workouts || []).filter((w: any) => {
      const d = new Date(w.date);
      const today = new Date();
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    });

    const trainedToday = todayWorkouts.length > 0;
    const topWorkout = todayWorkouts[0];
    const lastMeal = meals.length > 0 ? meals[meals.length - 1] : null;

    const ctx: NutritionContext = {
      calories: totals?.calories ?? 0,
      proteinG: totals?.proteinG ?? 0,
      carbsG: totals?.carbsG ?? 0,
      fatG: totals?.fatG ?? 0,
      calorieGoal: todayMealsData?.calorieGoal ?? profile?.dailyCalorieGoal ?? null,
      proteinGoalG: profile?.dailyProteinGoal ?? null,
      fitnessGoals: profile?.fitnessGoals || [],
      trainedToday,
      workoutType: topWorkout?.activityType ?? null,
      workoutDurationMinutes: topWorkout?.durationMinutes ?? null,
      lastMealTime: lastMeal ? new Date(lastMeal.date) : null,
      lastMealCalories: lastMeal?.totalCalories ?? 0,
      mealCount: meals.length,
      currentHour: new Date().getHours(),
    };

    return getNutritionInsights(ctx);
  }, [todayMealsData, workoutsData, profile]);

  const goalInsights = useMemo<GoalInsight[]>(() => {
    if (!profile) return [];
    const workoutList: any[] = workoutsData?.workouts || [];
    const recoveryLog = recoveryTodayData?.log ?? undefined;
    return computeGoalInsights({
      goals: profile.fitnessGoals || [],
      profile: {
        calorieGoal: profile.dailyCalorieGoal ?? null,
        proteinGoalG: profile.dailyProteinGoal ?? null,
        weeklyWorkoutDays: profile.weeklyWorkoutDays ?? 3,
      },
      workouts: workoutList.map((w: any) => ({
        activityType: w.activityType,
        durationMinutes: w.durationMinutes,
        date: w.date,
        name: w.name,
      })),
      nutritionStats: nutritionStatsData ?? undefined,
      streaks: streaksData ?? undefined,
      recovery: recoveryLog
        ? {
            sleepQuality: recoveryLog.sleepQuality ?? undefined,
            energyLevel: recoveryLog.energyLevel ?? undefined,
            soreness: recoveryLog.soreness ?? {},
          }
        : undefined,
      workoutSummary: workoutSummaryData ?? undefined,
    });
  }, [profile, workoutsData, nutritionStatsData, streaksData, recoveryTodayData, workoutSummaryData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 + bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {user?.firstName || "Friend"} {user?.lastName || ""}
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

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Today</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsRow}>
              <StatCard icon="zap" value={todayStats?.caloriesBurned || 0} label="Cal Burned" color={theme.orange} loading={statsLoading} />
              <StatCard icon="clock" value={`${todayStats?.activeMinutes || 0}m`} label="Active" color={theme.secondary} loading={statsLoading} />
              <StatCard icon="check-circle" value={todayStats?.workoutsCompleted || 0} label="Workouts" color={theme.primary} loading={statsLoading} />
              <StatCard icon="coffee" value={todayStats?.mealsLogged || 0} label="Meals" color={theme.pink} loading={statsLoading} />
            </View>
          </ScrollView>
        </Animated.View>

        {/* Streaks & Achievements */}
        {achievementsData && (
          <Animated.View entering={FadeInDown.delay(110).duration(400)} style={styles.section}>
            <StreakSummaryCard data={achievementsData} theme={theme} />
          </Animated.View>
        )}

        {/* Smart Reminder Banner */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
          <SmartReminderBanner
            streaksData={streaksData}
            todayStats={todayStats}
            todayMealsData={todayMealsData}
            profile={profile}
            workoutsData={workoutsData}
            weeklyData={weeklyData}
          />
        </Animated.View>

        {/* ── Today's Recommended Workout ── */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Today's Workout
            </Text>
            {hasCoachOnboarding && (
              <View style={[styles.aiPill, { backgroundColor: theme.primaryDim }]}>
                <Feather name="cpu" size={10} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 10 }}>AI Coach</Text>
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
              <SkeletonBox width="100%" height={12} />
              <SkeletonBox width="75%" height={12} />
              <SkeletonBox width="100%" height={42} borderRadius={12} />
            </SkeletonCard>
          ) : hasCoachOnboarding && todayRecommendation ? (
            <TodayWorkoutCard todayRec={todayRecommendation} theme={theme} />
          ) : (
            <CoachCtaCard theme={theme} />
          )}
        </Animated.View>

        {/* Coach Insights */}
        {coachInsights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
            <CoachInsightCard insights={coachInsights} theme={theme} />
          </Animated.View>
        )}

        {/* Nutrition Insights */}
        {nutritionInsights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.section}>
            <NutritionInsightsCard insights={nutritionInsights} theme={theme} />
          </Animated.View>
        )}

        {/* Goal Insights */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(244).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 12 }]}>
              Goal Progress
            </Text>
            <GoalInsightsPanel
              insights={goalInsights}
              goals={profile.fitnessGoals || []}
              theme={theme}
              compact
            />
          </Animated.View>
        )}

        {/* Recovery Check-In */}
        <Animated.View entering={FadeInDown.delay(248).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 12 }]}>
            Recovery
          </Text>
          <RecoveryCheckIn todayLog={recoveryTodayData?.log ?? null} theme={theme} />
        </Animated.View>

        {/* Water Tracker */}
        <Animated.View entering={FadeInDown.delay(255).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 12 }]}>
            Hydration
          </Text>
          <WaterTracker workedOutToday={(todayStats?.workoutsCompleted ?? 0) > 0} />
        </Animated.View>

        {/* AI Coach Chat */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Pressable
            onPress={() => router.push("/coach/chat" as any)}
            style={({ pressed }) => [
              styles.coachChatCard,
              { backgroundColor: theme.card, borderColor: theme.secondary + "50", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.coachChatIcon, { backgroundColor: theme.secondary + "20" }]}>
              <Feather name="message-circle" size={22} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.coachChatTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Chat with AI Coach
              </Text>
              <Text style={[styles.coachChatSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Ask me what to train, get plans, or understand your progress
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Weekly Chart */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Weekly Activity
            </Text>
            <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Active minutes per day
            </Text>
            {weeklyData?.days ? (
              <WeeklyBarChart data={weeklyData.days} />
            ) : (
              <View style={styles.emptyChart}>
                <Feather name="bar-chart-2" size={28} color={theme.border} />
                <Text style={[styles.emptyChartText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Log your first workout to see your weekly activity chart
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Recent Activity
          </Text>
          <Card padding={0}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
              {recentLoading ? (
                <View style={{ gap: 12, paddingVertical: 8 }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
                      <SkeletonBox width={40} height={40} borderRadius={12} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <SkeletonBox width="55%" height={13} />
                        <SkeletonBox width="35%" height={11} />
                      </View>
                      <SkeletonBox width={30} height={11} borderRadius={4} />
                    </View>
                  ))}
                </View>
              ) : recentData?.activities?.length > 0 ? (
                recentData.activities.map((activity: any) => (
                  <ActivityItem
                    key={`${activity.type}-${activity.id}`}
                    type={activity.type}
                    name={activity.name}
                    date={activity.date}
                    keyStat={activity.keyStat}
                    activityType={activity.activityType}
                  />
                ))
              ) : (
                <Animated.View entering={ZoomIn.duration(400)} style={styles.emptyActivity}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="activity" size={28} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Nothing logged yet
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Tap the + button to log your first workout or meal — every step counts!
                  </Text>
                  <Pressable
                    onPress={() => router.push("/workouts/log")}
                    style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
                  >
                    <Feather name="plus" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Log a workout
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* FAB backdrop — dismisses menu on outside tap */}
      {fabOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
          onPress={() => setFabOpen(false)}
        />
      )}

      {/* FAB */}
      <View style={[styles.fabWrap, { bottom: 90 + bottomPad, zIndex: 20 }]}>
        <FABMenu theme={theme} open={fabOpen} onToggle={() => setFabOpen(o => !o)} />
      </View>
    </View>
  );
}

function FABMenu({ theme, open, onToggle }: { theme: any; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.fab}>
      {open && (
        <>
          <Pressable
            onPress={() => { onToggle(); router.push("/meals/add"); }}
            style={[styles.fabOption, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="coffee" size={18} color={theme.pink} />
            <Text style={[styles.fabOptionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Log Meal</Text>
          </Pressable>
          <Pressable
            onPress={() => { onToggle(); router.push("/workouts/log"); }}
            style={[styles.fabOption, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="activity" size={18} color={theme.primary} />
            <Text style={[styles.fabOptionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Log Workout</Text>
          </Pressable>
        </>
      )}
      <Pressable
        onPress={onToggle}
        style={[styles.fabMain, { backgroundColor: theme.primary }]}
      >
        <Feather name={open ? "x" : "plus"} size={26} color="#0f0f1a" />
      </Pressable>
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
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16 },
  aiPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  coachChatCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  coachChatIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  coachChatTitle: { fontSize: 15, marginBottom: 2 },
  coachChatSub: { fontSize: 13, lineHeight: 18 },
  statsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", gap: 12, paddingRight: 20 },
  cardTitle: { fontSize: 15, marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 16 },
  emptyChart: { height: 90, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyChartText: { fontSize: 13, textAlign: "center", maxWidth: 240, lineHeight: 18 },
  emptyActivity: { paddingVertical: 36, alignItems: "center", gap: 10 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 240 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 6, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  fabWrap: { position: "absolute", right: 20 },
  fab: { alignItems: "flex-end", gap: 10 },
  fabMain: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#00e676", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabOptionText: { fontSize: 14 },
  // Today's workout card
  todayCard: { borderWidth: 1, gap: 12 },
  todayHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  todayLabel: { fontSize: 11, marginBottom: 2 },
  todayTitle: { fontSize: 16, lineHeight: 20 },
  todayMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: "transparent",
  },
  metaText: { fontSize: 11 },
  todayContext: { fontSize: 13, lineHeight: 19 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  todayCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  todaySecondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
});
