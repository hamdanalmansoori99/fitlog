import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Platform, Alert, TextInput, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { rtlIcon, dateLocale } from "@/lib/rtl";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { getRecommendations, getTodaySuggestion, getEquipmentMatchLevel } from "@/lib/coachEngine";
import { WORKOUT_TEMPLATES, WorkoutTemplate } from "@/lib/workoutTemplates";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import { useTranslation } from "react-i18next";
import { EXERCISE_CATEGORIES, EXERCISES, ExerciseCategory } from "@/lib/exerciseLibrary";

const GOAL_KEY: Record<string, string> = {
  "Stay active": "stayActive",
  "Lose weight": "loseWeight",
  "Build muscle": "buildMuscle",
  "Get stronger": "getStronger",
  "Improve endurance": "improveEndurance",
  "Improve flexibility": "improveFlexibility",
};

function formatDuration(mins?: number | null) {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getActivityColor(type: string, theme: any) {
  const map: Record<string, string> = {
    cardio: theme.primary, cycling: theme.secondary, running: theme.primary,
    walking: theme.cyan, gym: theme.purple, swimming: "#4fc3f7",
    other: theme.textMuted,
  };
  return map[type] || theme.primary;
}

function getActivityIcon(type: string): keyof typeof Feather.glyphMap {
  const map: Record<string, keyof typeof Feather.glyphMap> = {
    cardio: "activity", cycling: "wind", running: "activity",
    walking: "navigation", gym: "zap", swimming: "droplet",
  };
  return map[type] || "activity";
}

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const { theme } = useTheme();
  const color = { Beginner: theme.primary, Intermediate: theme.secondary, Advanced: theme.danger }[difficulty] || theme.primary;
  return <View style={[styles.diffDot, { backgroundColor: color }]} />;
}

function EquipmentMatchBadge({ match }: { match: "full" | "partial" | "none" }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  if (match === "full") {
    return (
      <View style={[styles.matchBadge, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="check-circle" size={10} color={theme.primary} />
        <Text style={[styles.matchBadgeText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
          {t("workouts.fullMatchLabel")}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.matchBadge, { backgroundColor: theme.warning + "20" }]}>
      <Feather name="refresh-cw" size={10} color={theme.warning} />
      <Text style={[styles.matchBadgeText, { color: theme.warning, fontFamily: "Inter_500Medium" }]}>
        {t("workouts.withSubstitutions")}
      </Text>
    </View>
  );
}

const RecommendationCard = React.memo(function RecommendationCard({ rec, onPress }: { rec: any; onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { template, whyGoodForYou, equipmentMatch, missingEquipment } = rec;
  const color = getActivityColor(template.activityType, theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recCard,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: color + "20" }]}>
          <Feather name={getActivityIcon(template.activityType)} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {t(`workouts.templates.${template.id}.name`, { defaultValue: template.name })}
          </Text>
          <View style={styles.recMeta}>
            <DifficultyDot difficulty={template.difficulty} />
            <Text style={[styles.recMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t(`workouts.plan.difficulty.${template.difficulty}`)}
            </Text>
            <Text style={{ color: theme.border }}> · </Text>
            <Feather name="clock" size={10} color={theme.textMuted} />
            <Text style={[styles.recMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {template.durationMinutes} {t("common.min")}
            </Text>
          </View>
        </View>
        <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
      </View>

      <Text style={[styles.recWhy, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
        {whyGoodForYou}
      </Text>

      <View style={styles.recEquipRow}>
        <Feather name="tool" size={11} color={theme.textMuted} />
        <Text style={[styles.recEquipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {template.requiredEquipment.length === 0
            ? t("workouts.noEquipmentNeeded")
            : template.requiredEquipment.map((e: string) => e.replace(/_/g, " ")).join(", ")}
        </Text>
      </View>

      {missingEquipment && missingEquipment.length > 0 && (
        <View style={[styles.missingRow, { backgroundColor: theme.warning + "14" }]}>
          <Feather name="alert-circle" size={10} color={theme.warning} />
          <Text style={[styles.missingText, { color: theme.warning, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {t("workouts.missing")}: {missingEquipment.map((e: string) => e.replace(/_/g, " ")).join(", ")} — {t("workouts.alternativesInside")}
          </Text>
        </View>
      )}

      <View style={styles.recFooter}>
        <View style={[styles.goalTag, { backgroundColor: theme.primaryDim }]}>
          <Text style={[styles.goalTagText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
            {t(`workouts.goals.${GOAL_KEY[template.goals[0]] ?? template.goals[0]}`, { defaultValue: template.goals[0] })}
          </Text>
        </View>
        <EquipmentMatchBadge match={equipmentMatch ?? "full"} />
      </View>
    </Pressable>
  );
});

const TodaySuggestionCard = React.memo(function TodaySuggestionCard({ suggestion, onPress }: { suggestion: any; onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { template, whyGoodForYou } = suggestion;
  const color = getActivityColor(template.activityType, theme);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.todayCard, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.todayInner, { backgroundColor: theme.card, borderColor: theme.primary }]}>
        <View style={styles.todayTop}>
          <View style={[styles.todayIcon, { backgroundColor: color + "20" }]}>
            <Feather name={getActivityIcon(template.activityType)} size={24} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayLabel, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>{t("workouts.todaysSuggestion")}</Text>
            <Text style={[styles.todayName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t(`workouts.templates.${template.id}.name`, { defaultValue: template.name })}</Text>
          </View>
          <View style={[styles.startBtn, { backgroundColor: theme.primary }]}>
            <Feather name="play" size={14} color="#0f0f1a" />
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{t("workouts.start")}</Text>
          </View>
        </View>
        <Text style={[styles.todayWhy, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {whyGoodForYou}
        </Text>
        <View style={styles.todayStats}>
          <View style={styles.todayStat}>
            <Feather name="clock" size={12} color={theme.textMuted} />
            <Text style={[styles.todayStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {template.durationMinutes} {t("common.min")}
            </Text>
          </View>
          <View style={[styles.diffDot, { backgroundColor: (({ Beginner: theme.primary, Intermediate: theme.secondary, Advanced: theme.danger } as Record<string, string>)[template.difficulty]) || theme.primary }]} />
          <Text style={[styles.todayStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t(`workouts.plan.difficulty.${template.difficulty}`)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoFromDate(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function buildLastTrainedMap(workouts: any[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const w of workouts) {
    const days = daysAgoFromDate(w.date);
    const type = w.activityType as string;
    if (!(type in result) || days < result[type]) result[type] = days;
  }
  return result;
}

function formatLastTrained(days: number, t: any): string {
  if (days === 0) return t("workouts.lastTrainedToday");
  if (days === 1) return t("workouts.lastTrainedYesterday");
  return t("workouts.lastTrainedDays", { days });
}

// ─── For You Today Mini Card ───────────────────────────────────────────────────

const ForYouTodayMiniCard = React.memo(function ForYouTodayMiniCard({
  template,
  reason,
  needsGear,
  lastDays,
  onPress,
}: {
  template: WorkoutTemplate;
  reason: string;
  needsGear: boolean;
  lastDays?: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const color = getActivityColor(template.activityType, theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fyCard,
        { backgroundColor: theme.card, borderColor: needsGear ? theme.warning + "60" : theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={[styles.fyIcon, { backgroundColor: color + "20" }]}>
        <Feather name={getActivityIcon(template.activityType)} size={18} color={color} />
      </View>
      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 8 }} numberOfLines={2}>
        {t(`workouts.templates.${template.id}.name`, { defaultValue: template.name })}
      </Text>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 }}>
        {template.durationMinutes}{t("common.min")} · {t(`workouts.plan.difficulty.${template.difficulty}`)}
      </Text>
      <Text style={{ color: color, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 }} numberOfLines={1}>
        {reason}
      </Text>
      {needsGear && (
        <View style={[styles.needsGearBadge, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "40" }]}>
          <Feather name="tool" size={9} color={theme.warning} />
          <Text style={{ color: theme.warning, fontFamily: "Inter_500Medium", fontSize: 10 }}>{t("workouts.needsGear")}</Text>
        </View>
      )}
      {lastDays !== undefined && (
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 4, opacity: 0.8 }}>
          {formatLastTrained(lastDays, t)}
        </Text>
      )}
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const WorkoutHistoryCard = React.memo(function WorkoutHistoryCard({ workout, onDelete }: { workout: any; onDelete: () => void }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const color = getActivityColor(workout.activityType, theme);
  const icon = getActivityIcon(workout.activityType);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/workouts/[id]" as any, params: { id: workout.id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={[styles.historyIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.historyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {workout.name || workout.activityType}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.historyDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {new Date(workout.date).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" })}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, opacity: 0.75 }}>
              · {formatLastTrained(daysAgoFromDate(workout.date), t)}
            </Text>
          </View>
        </View>
        <Pressable onPress={(e) => { e.stopPropagation(); onDelete(); }} style={styles.deleteBtn} hitSlop={8}>
          <Feather name="trash-2" size={15} color={theme.danger} />
        </Pressable>
      </View>
      <View style={styles.historyStats}>
        {!!workout.durationMinutes && (
          <View style={styles.histStat}>
            <Feather name="clock" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {formatDuration(workout.durationMinutes)}
            </Text>
          </View>
        )}
        {!!workout.distanceKm && (
          <View style={styles.histStat}>
            <Feather name="map-pin" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.distanceKm.toFixed(1)} km
            </Text>
          </View>
        )}
        {!!workout.caloriesBurned && (
          <View style={styles.histStat}>
            <Feather name="zap" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.caloriesBurned} {t("common.kcal")}
            </Text>
          </View>
        )}
        {workout.mood && (
          <View style={[styles.moodChip, { backgroundColor: theme.primaryDim }]}>
            <Text style={[styles.moodText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>{workout.mood}</Text>
          </View>
        )}
      </View>
    </Card>
    </Pressable>
  );
});

export default function WorkoutsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [quickLogModalVisible, setQuickLogModalVisible] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { showToast } = useToast();

  const { data: profileData, refetch: refetchProfile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile, staleTime: 300_000 });
  const { data: workoutsData, refetch: refetchWorkouts, isLoading: workoutsLoading, isError: workoutsError } = useQuery({ queryKey: ["workouts", { limit: 50 }], queryFn: () => api.getWorkouts({ limit: 50 }), staleTime: 120_000 });
  const { data: userTemplatesData, refetch: refetchTemplates } = useQuery({ queryKey: ["userTemplates"], queryFn: api.getUserTemplates, staleTime: 300_000 });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      showToast(t("workouts.workoutDeleted"), "success");
    },
    onError: () => showToast(t("workouts.couldNotDeleteWorkout"), "error"),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => api.deleteUserTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      showToast(t("workouts.templateDeleted"), "success");
    },
    onError: () => showToast(t("workouts.couldNotDeleteTemplate"), "error"),
  });

  const toggleFavMutation = useMutation({
    mutationFn: (id: number) => api.toggleTemplateFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userTemplates"] }),
    onError: () => showToast(t("workouts.couldNotUpdateFavourite"), "error"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchWorkouts(), refetchTemplates()]);
    setRefreshing(false);
  }, []);

  const profile = profileData;
  const workouts = workoutsData?.workouts || [];
  const hasCompletedOnboarding = profile?.coachOnboardingComplete;

  const historyTypes = useMemo(() => {
    const seen = new Set<string>();
    workouts.forEach((w: any) => { if (w.activityType) seen.add(w.activityType); });
    return Array.from(seen);
  }, [workouts]);

  const filteredWorkouts = useMemo(() =>
    historyFilter === "all" ? workouts : workouts.filter((w: any) => w.activityType === historyFilter),
    [workouts, historyFilter]
  );
  const userTemplates: any[] = userTemplatesData?.templates || [];

  const coachProfile = {
    availableEquipment: profile?.availableEquipment || [],
    workoutLocation: profile?.workoutLocation || "Home",
    trainingPreferences: profile?.trainingPreferences || [],
    experienceLevel: profile?.experienceLevel || "Beginner",
    preferredWorkoutDuration: profile?.preferredWorkoutDuration || "45 minutes",
    weeklyWorkoutDays: profile?.weeklyWorkoutDays || 3,
    fitnessGoals: profile?.fitnessGoals || [],
  };

  const recentWorkouts = workouts.slice(0, 14).map((w: any) => ({
    name: w.name,
    activityType: w.activityType,
    date: w.date,
    durationMinutes: w.durationMinutes,
  }));

  const recommendations = hasCompletedOnboarding
    ? getRecommendations(coachProfile, recentWorkouts, 3)
    : [];
  const todaySuggestion = hasCompletedOnboarding
    ? getTodaySuggestion(coachProfile, recentWorkouts)
    : null;

  const lastTrainedMap = useMemo(() => buildLastTrainedMap(workouts), [workouts]);

  const forYouTemplates = useMemo(() => {
    if (recommendations.length > 0) {
      return recommendations.slice(0, 3).map((rec: any) => {
        let reason: string;
        if (rec.equipmentMatch === "full" && rec.template.requiredEquipment.length > 0)
          reason = t("workouts.reasonBasedOnEquipment");
        else if (rec.template.goals.some((g: string) => coachProfile.fitnessGoals.includes(g)))
          reason = t("workouts.reasonMatchesGoal");
        else
          reason = t("workouts.reasonBasedOnHistory");
        return {
          template: rec.template as WorkoutTemplate,
          reason,
          equipmentMatch: rec.equipmentMatch as string,
          needsGear: rec.equipmentMatch === "none",
        };
      });
    }
    return WORKOUT_TEMPLATES.slice(0, 3).map((tmpl) => ({
      template: tmpl,
      reason: "",
      equipmentMatch: "full",
      needsGear: false,
    }));
  }, [recommendations, t]);

  const quickLogItems = [
    { label: t("workouts.gym"), icon: "zap" as const, type: "gym", color: theme.purple },
    { label: t("workouts.cardio"), icon: "activity" as const, type: "cardio", color: theme.primary },
    { label: t("workouts.otherActivity"), icon: "more-horizontal" as const, type: "other", color: theme.textMuted },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("workouts.title")}</Text>
          {hasCompletedOnboarding && (
            <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("workouts.yourPersonalisedCoach")}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {hasCompletedOnboarding && (
            <Pressable onPress={() => router.push("/workouts/plan" as any)} style={[styles.planBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="calendar" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("workouts.week")}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/workouts/log"); }}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus" size={22} color="#0f0f1a" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 + bottomPad, gap: 0, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ── ERROR RETRY BANNER ── */}
        {workoutsError && (
          <View style={{ marginHorizontal: 20, marginVertical: 8, padding: 14, borderRadius: 12, backgroundColor: theme.danger + "18", borderWidth: 1, borderColor: theme.danger + "40", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name="alert-circle" size={18} color={theme.danger} />
            <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("common.error")}</Text>
            <Pressable onPress={() => { refetchWorkouts(); refetchProfile(); refetchTemplates(); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.danger + "25" }}>
              <Text style={{ color: theme.danger, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        )}

        {/* ── COACH ONBOARDING PROMPT ── */}
        {!hasCompletedOnboarding && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
            <Pressable
              onPress={() => router.push("/workouts/onboarding" as any)}
              style={[styles.onboardingCard, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
            >
              <View style={styles.onboardingIcon}>
                <Feather name="zap" size={28} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.onboardingTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {t("workouts.setUpCoach")}
                </Text>
                <Text style={[styles.onboardingSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {t("workouts.coachSetupMessage")}
                </Text>
              </View>
              <Feather name={rtlIcon("arrow-right")} size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── TODAY'S SUGGESTION ── */}
        {todaySuggestion && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.section}>
            <TodaySuggestionCard
              suggestion={todaySuggestion}
              onPress={() => router.push({
                pathname: "/workouts/template" as any,
                params: { id: todaySuggestion.template.id, whyGoodForYou: todaySuggestion.whyGoodForYou },
              })}
            />
          </Animated.View>
        )}

        {/* ── RECOMMENDED FOR YOU ── */}
        {recommendations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("workouts.recommendedForYou")}
              </Text>
              <Pressable onPress={() => router.push("/workouts/onboarding" as any)}>
                <Text style={[styles.editPrefs, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>{t("workouts.editPrefs")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
              <View style={styles.recRow}>
                {recommendations.map((rec, i) => (
                  <View key={rec.template.id} style={styles.recCardWrap}>
                    <RecommendationCard
                      rec={rec}
                      onPress={() => router.push({
                        pathname: "/workouts/template" as any,
                        params: { id: rec.template.id, whyGoodForYou: rec.whyGoodForYou },
                      })}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* ── QUICK LOG BUTTON ── */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuickLogModalVisible(true); }}
            style={[styles.quickLogBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.quickLogIcon, { backgroundColor: theme.primaryDim }]}>
              <Feather name="zap" size={18} color={theme.primary} />
            </View>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>{t("workouts.quickLog")}</Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>{t("workouts.selectActivity")}</Text>
            <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
          </Pressable>
        </Animated.View>

        {/* ── QUICK LOG MODAL ── */}
        <Modal
          visible={quickLogModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setQuickLogModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setQuickLogModalVisible(false)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => {}}>
              <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 16 }}>{t("workouts.quickLog")}</Text>
              <View style={styles.quickGrid}>
                {quickLogItems.map((act) => (
                  <Pressable
                    key={act.type}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuickLogModalVisible(false);
                      router.push({ pathname: "/workouts/log" as any, params: { prefillType: act.type } });
                    }}
                    style={[styles.quickChip, { backgroundColor: theme.background, borderColor: theme.border }]}
                  >
                    <View style={[styles.quickIcon, { backgroundColor: act.color + "20" }]}>
                      <Feather name={act.icon} size={18} color={act.color} />
                    </View>
                    <Text style={[styles.quickLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{act.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── MY TEMPLATES ── */}
        <Animated.View entering={FadeInDown.delay(175).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.myTemplates")}</Text>
            {userTemplates.length > 0 && (
              <Pressable onPress={() => router.push("/workouts/my-templates" as any)}>
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t("workouts.manage")}</Text>
              </Pressable>
            )}
          </View>
          {userTemplates.length === 0 ? (
            <Pressable
              onPress={() => router.push("/workouts/my-templates" as any)}
              style={[styles.createTemplateCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.createTemplateIcon, { backgroundColor: theme.secondaryDim }]}>
                <Feather name="bookmark" size={20} color={theme.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.saveFirstTemplate")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  {t("workouts.saveTemplateDesc")}
                </Text>
              </View>
              <Feather name={rtlIcon("arrow-right")} size={18} color={theme.secondary} />
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 }}>
                {userTemplates.map((tmpl: any) => {
                  const tColor = getActivityColor(tmpl.activityType, theme);
                  const tIcon = getActivityIcon(tmpl.activityType);
                  const exCount = tmpl.exercises?.length ?? 0;
                  return (
                    <Pressable
                      key={tmpl.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: "/workouts/user-template" as any, params: { id: tmpl.id } });
                      }}
                      style={[styles.myTmplCard, { backgroundColor: theme.card, borderColor: tmpl.isFavorite ? tColor + "60" : theme.border }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <View style={[styles.myTmplIcon, { backgroundColor: tColor + "20" }]}>
                          <Feather name={tIcon} size={16} color={tColor} />
                        </View>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavMutation.mutate(tmpl.id); }}
                          hitSlop={8}
                        >
                          <Feather name="star" size={14} color={tmpl.isFavorite ? theme.warning : theme.textMuted} />
                        </Pressable>
                      </View>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 4 }} numberOfLines={2}>
                        {tmpl.name}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        {exCount > 0 ? t("workouts.exercises", { count: exCount }) : tmpl.activityType}
                      </Text>
                      {tmpl.usageCount > 0 && (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 3 }}>
                          {t("workouts.usedCount", { count: tmpl.usageCount })}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Animated.View>

        {/* ── BROWSE TEMPLATES ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.browseTemplatesTitle")}</Text>
          </View>

          {/* ── FOR YOU TODAY sub-section ── */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="star" size={13} color={theme.primary} />
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {recommendations.length > 0 ? t("workouts.forYouToday") : t("workouts.topTemplates")}
                </Text>
              </View>
              {recommendations.length > 0 && (
                <Pressable onPress={() => router.push("/workouts/onboarding" as any)}>
                  <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("workouts.editPrefs")}</Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 }}>
                {forYouTemplates.map((item) => (
                  <View key={item.template.id} style={{ width: 150 }}>
                    <ForYouTodayMiniCard
                      template={item.template}
                      reason={item.reason || t("workouts.topTemplates")}
                      needsGear={item.needsGear}
                      lastDays={lastTrainedMap[item.template.activityType]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: "/workouts/template" as any, params: { id: item.template.id, whyGoodForYou: item.reason } });
                      }}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── GROUPED TEMPLATES ── */}
          {(() => {
            const shownIds = new Set<string>();
            return [
              { label: "Strength & Muscle", goals: ["Build muscle", "Get stronger"] },
              { label: "Endurance & Fat Loss", goals: ["Improve endurance", "Lose weight"] },
              { label: "General Fitness", goals: ["Stay active"] },
            ].map(({ label, goals: sectionGoals }) => {
            const sectionTemplates = WORKOUT_TEMPLATES.filter((tmpl) =>
              !shownIds.has(tmpl.id) && sectionGoals.some((g) => tmpl.goals.includes(g as any))
            );
            sectionTemplates.forEach((tmpl) => shownIds.add(tmpl.id));
            if (sectionTemplates.length === 0) return null;
            return (
              <View key={label} style={{ marginBottom: 14 }}>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
                  {label}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
                  <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 }}>
                    {sectionTemplates.map((tmpl) => {
                      const { level: matchLevel } = hasCompletedOnboarding
                        ? getEquipmentMatchLevel(tmpl, coachProfile.availableEquipment)
                        : { level: "full" as const };
                      const showNeedsGear = matchLevel === "none";
                      return (
                        <Pressable
                          key={tmpl.id}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: "/workouts/template" as any, params: { id: tmpl.id } }); }}
                          style={[styles.templateCard, { backgroundColor: theme.card, borderColor: showNeedsGear ? theme.warning + "60" : theme.border }]}
                        >
                          <View style={[styles.templateIcon, { backgroundColor: getActivityColor(tmpl.activityType, theme) + "20" }]}>
                            <Feather name={getActivityIcon(tmpl.activityType)} size={16} color={getActivityColor(tmpl.activityType, theme)} />
                          </View>
                          <Text style={[styles.templateName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                            {t(`workouts.templates.${tmpl.id}.name`, { defaultValue: tmpl.name })}
                          </Text>
                          <View style={styles.templateMeta}>
                            <Text style={[styles.templateMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                              {tmpl.durationMinutes}{t("common.min")} · {t(`workouts.plan.difficulty.${tmpl.difficulty}`)}
                            </Text>
                          </View>
                          {showNeedsGear && (
                            <View style={[styles.needsGearBadge, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "40" }]}>
                              <Feather name="tool" size={9} color={theme.warning} />
                              <Text style={{ color: theme.warning, fontFamily: "Inter_500Medium", fontSize: 10 }}>{t("workouts.needsGear")}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          });
          })()}
        </Animated.View>

        {/* ── EXERCISE LIBRARY ── */}
        <Animated.View entering={FadeInDown.delay(230).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 12 }]}>
            {t("workouts.browseExercises")}
          </Text>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 10 }]}>
            <Feather name="search" size={15} color={theme.textMuted} />
            <TextInput
              value={exerciseSearch}
              onChangeText={(v) => { setExerciseSearch(v); setSelectedCategory(null); }}
              placeholder={t("workouts.searchExercises")}
              placeholderTextColor={theme.textMuted}
              style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 0 }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {exerciseSearch.length > 0 && (
              <Pressable onPress={() => setExerciseSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
          {/* Category chips */}
          {!exerciseSearch && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, paddingRight: 8, alignItems: "center" }} style={{ marginBottom: 12 }}>
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  style={[
                    styles.catChip,
                    selectedCategory === null
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{
                    fontFamily: "Inter_600SemiBold", fontSize: 12,
                    color: selectedCategory === null ? "#0f0f1a" : theme.text,
                  }}>{t("exercises.allCategories")}</Text>
                </Pressable>
                {EXERCISE_CATEGORIES.map((cat) => {
                  const catLabelKey = `exercises.category${cat.id.charAt(0).toUpperCase()}${cat.id.slice(1)}` as any;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      style={[
                        styles.catChip,
                        selectedCategory === cat.id
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <Feather
                        name={cat.icon as any}
                        size={12}
                        color={selectedCategory === cat.id ? "#0f0f1a" : theme.textMuted}
                      />
                      <Text style={{
                        fontFamily: "Inter_600SemiBold", fontSize: 12,
                        color: selectedCategory === cat.id ? "#0f0f1a" : theme.text,
                      }}>{t(catLabelKey)}</Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          )}
          {/* Exercise List */}
          {(() => {
            const q = exerciseSearch.toLowerCase().trim();
            const filtered = q
              ? EXERCISES.filter(e =>
                  e.name.toLowerCase().includes(q) ||
                  e.primaryMuscle.toLowerCase().includes(q) ||
                  e.category.includes(q)
                ).slice(0, 8)
              : selectedCategory
                ? EXERCISES.filter(e => e.category === selectedCategory).slice(0, 8)
                : EXERCISES.slice(0, 6);
            return (
              <View style={{ gap: 8 }}>
                {filtered.map((ex) => {
                  const diffColors: Record<string, string> = {
                    Beginner: theme.primary,
                    Intermediate: theme.secondary,
                    Advanced: theme.warning || "#ffab40",
                  };
                  const dColor = diffColors[ex.difficulty] || theme.primary;
                  return (
                    <Pressable
                      key={ex.id}
                      onPress={() => router.push({ pathname: "/workouts/exercise/[id]" as any, params: { id: ex.id } })}
                      style={({ pressed }) => [
                        styles.exerciseRow,
                        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <View style={[styles.exIcon, { backgroundColor: dColor + "18" }]}>
                        <Feather
                          name={(EXERCISE_CATEGORIES.find(c => c.id === ex.category)?.icon ?? "activity") as any}
                          size={16}
                          color={dColor}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                          {ex.primaryMuscle}
                        </Text>
                        {ex.equipment.length > 0 && ex.equipment[0] !== "none" && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Feather name="tool" size={10} color={theme.secondary} />
                            <Text style={{ color: theme.secondary, fontFamily: "Inter_400Regular", fontSize: 11 }} numberOfLines={1}>
                              {ex.equipment.slice(0, 2).map((e: string) => e.replace(/_/g, " ")).join(", ")}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: dColor + "18" }]}>
                          <Text style={{ color: dColor, fontFamily: "Inter_500Medium", fontSize: 11 }}>{t(`exercises.difficulty${ex.difficulty}`)}</Text>
                        </View>
                        <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
                      </View>
                    </Pressable>
                  );
                })}
                {!q && (
                  <Pressable
                    onPress={() => router.push("/workouts/exercises" as any)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 4 }}
                  >
                    <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {t("workouts.viewAllExercises", { count: EXERCISES.length })}
                    </Text>
                    <Feather name={rtlIcon("arrow-right")} size={13} color={theme.primary} />
                  </Pressable>
                )}
              </View>
            );
          })()}
        </Animated.View>

        {/* ── WORKOUT HISTORY ── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.history")}</Text>

          {historyTypes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["all", ...historyTypes] as string[]).map((type) => {
                  const active = historyFilter === type;
                  const color = type === "all" ? theme.primary : getActivityColor(type, theme);
                  const icon = type === "all" ? "layers" : getActivityIcon(type);
                  const label = type === "all"
                    ? t("workouts.filterAll")
                    : t(`workouts.activityType.${type}`, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) });
                  return (
                    <Pressable
                      key={type}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHistoryFilter(type); }}
                      style={[
                        styles.historyFilterChip,
                        {
                          backgroundColor: active ? color + "22" : theme.card,
                          borderColor: active ? color : theme.border,
                        },
                      ]}
                    >
                      <Feather name={icon} size={12} color={active ? color : theme.textMuted} />
                      <Text style={{ color: active ? color : theme.textMuted, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13 }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {workoutsLoading ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3].map(i => (
                <SkeletonCard key={i}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <SkeletonBox width={36} height={36} borderRadius={10} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonBox width="55%" height={14} borderRadius={5} />
                      <SkeletonBox width="35%" height={11} borderRadius={4} />
                    </View>
                    <SkeletonBox width={20} height={14} borderRadius={4} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    <SkeletonBox width={60} height={12} borderRadius={4} />
                    <SkeletonBox width={60} height={12} borderRadius={4} />
                  </View>
                </SkeletonCard>
              ))}
            </View>
          ) : filteredWorkouts.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Card>
                <View style={styles.empty}>
                  <View style={[styles.emptyIconBg, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="zap" size={26} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {t("workouts.yourJourneyStarts")}
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {t("workouts.chooseTemplateOrLog")}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/workouts/log" as any)}
                    style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
                  >
                    <Feather name="plus" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {t("workouts.logFirstWorkoutBtn")}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          ) : (
            <View style={{ gap: 10 }}>
              {(showAllHistory ? filteredWorkouts : filteredWorkouts.slice(0, 5)).map((w: any) => (
                <WorkoutHistoryCard
                  key={w.id}
                  workout={w}
                  onDelete={() => {
                    Alert.alert(
                      t("workouts.deleteWorkoutQuestion"),
                      t("workouts.cannotBeUndone"),
                      [
                        { text: t("common.cancel"), style: "cancel" },
                        {
                          text: t("common.delete"),
                          style: "destructive",
                          onPress: () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            deleteMutation.mutate(w.id);
                          },
                        },
                      ]
                    );
                  }}
                />
              ))}
              {filteredWorkouts.length > 5 && (
                <Pressable
                  onPress={() => setShowAllHistory((v) => !v)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 }}
                >
                  <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                    {showAllHistory ? t("common.showLess") : t("workouts.viewAllHistory", { count: filteredWorkouts.length })}
                  </Text>
                  <Feather name={showAllHistory ? "chevron-up" : "chevron-down"} size={13} color={theme.primary} />
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 8,
  },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  planBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  addBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  planBannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planBannerTitle: { fontSize: 14 },
  planBannerSub: { fontSize: 12, marginTop: 6 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16 },
  editPrefs: { fontSize: 13 },
  onboardingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5,
  },
  onboardingIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  onboardingTitle: { fontSize: 15, marginBottom: 4 },
  onboardingSub: { fontSize: 13, lineHeight: 18 },
  todayCard: {},
  todayInner: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  todayTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  todayLabel: { fontSize: 11, marginBottom: 2 },
  todayName: { fontSize: 17 },
  startBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  todayWhy: { fontSize: 13, lineHeight: 18 },
  todayStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  todayStatText: { fontSize: 12 },
  recScroll: { marginHorizontal: -20 },
  recRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 },
  recCardWrap: { width: 270 },
  recCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  recName: { fontSize: 14 },
  recMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  recMetaText: { fontSize: 11 },
  recWhy: { fontSize: 12, lineHeight: 17 },
  recEquipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  recEquipText: { fontSize: 11, flex: 1 },
  missingRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  missingText: { fontSize: 10, flex: 1 },
  recFooter: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  goalTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  goalTagText: { fontSize: 11 },
  matchBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  matchBadgeText: { fontSize: 10 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  quickRow: { flexDirection: "row", gap: 10, paddingRight: 8 },
  quickChip: {
    alignItems: "center", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, minWidth: 72,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12 },
  templateRow: { flexDirection: "row", gap: 10, paddingRight: 8 },
  templateCard: { width: 130, borderRadius: 14, borderWidth: 1, padding: 10, gap: 6 },
  templateIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  templateName: { fontSize: 12, lineHeight: 16 },
  templateMeta: { marginTop: 4 },
  templateMetaText: { fontSize: 10 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  templateListRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  historyFilterChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  historyCard: { gap: 8, paddingVertical: 12 },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyName: { fontSize: 14, marginBottom: 4 },
  historyDate: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 8 },
  historyStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  histStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  histStatText: { fontSize: 12 },
  moodChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  moodText: { fontSize: 11 },
  createTemplateCard: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 16, borderWidth: 1,
  },
  createTemplateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  myTmplCard: { width: 140, borderRadius: 16, borderWidth: 1, padding: 12 },
  myTmplIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyIconBg: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 240 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  exerciseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 12,
  },
  exIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  fyCard: {
    borderRadius: 14, borderWidth: 1, padding: 12, flex: 1,
  },
  fyIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  needsGearBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
    marginTop: 6, alignSelf: "flex-start" as const,
  },
  quickLogBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  quickLogIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
    padding: 20, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
});
