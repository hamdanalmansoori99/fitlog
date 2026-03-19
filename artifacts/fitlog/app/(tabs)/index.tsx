import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform, Modal, Share,
} from "react-native";
import { useSmartNotifications } from "@/lib/useSmartNotifications";
import Svg, { Circle, G } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { dateLocale, rtlIcon } from "@/lib/rtl";
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
import type Colors from "@/constants/colors";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { ShareCard } from "@/components/ShareCard";

type AppTheme = (typeof Colors)["dark"];

const HERO_RING = 110;
const HERO_STROKE = 12;
const HERO_R = (HERO_RING - HERO_STROKE) / 2;
const HERO_CIRC = 2 * Math.PI * HERO_R;

function CalorieRingHero({
  consumed, goal, theme,
}: { consumed: number; goal: number; theme: AppTheme }) {
  const { t } = useTranslation();
  const remaining = Math.max(0, goal - consumed);
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dash = pct * HERO_CIRC;
  const gap = HERO_CIRC - dash;
  const over = consumed > goal;
  const ringColor = over ? (theme.warning || "#ffab40") : theme.primary;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: HERO_RING, height: HERO_RING, alignItems: "center", justifyContent: "center" }}>
        <Svg width={HERO_RING} height={HERO_RING} style={{ position: "absolute" }}>
          <G rotation="-90" origin={`${HERO_RING / 2},${HERO_RING / 2}`}>
            <Circle
              cx={HERO_RING / 2} cy={HERO_RING / 2} r={HERO_R}
              stroke={theme.border} strokeWidth={HERO_STROKE} fill="none"
            />
            <Circle
              cx={HERO_RING / 2} cy={HERO_RING / 2} r={HERO_R}
              stroke={ringColor}
              strokeWidth={HERO_STROKE}
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
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 6 }}>
        {consumed} / {goal} {t("common.kcal")}
      </Text>
    </View>
  );
}

function NutritionHero({ mealsData, theme }: { mealsData: any; theme: AppTheme }) {
  const { t } = useTranslation();
  const totals = mealsData?.dailyTotals;
  const calorieGoal = mealsData?.calorieGoal ?? 2000;
  const consumed = totals?.calories ?? 0;
  const protein = totals?.proteinG ?? 0;
  const carbs = totals?.carbsG ?? 0;
  const fat = totals?.fatG ?? 0;
  const proteinGoal = Math.round(calorieGoal * 0.3 / 4);
  const carbsGoal = Math.round(calorieGoal * 0.45 / 4);
  const fatGoal = Math.round(calorieGoal * 0.25 / 9);

  const macros = [
    { label: t("home.protein"), value: protein, goal: proteinGoal, color: theme.primary },
    { label: t("home.carbs"), value: carbs, goal: carbsGoal, color: theme.secondary },
    { label: t("home.fat"), value: fat, goal: fatGoal, color: theme.warning || "#ffab40" },
  ];

  const caloriesLeft = Math.max(0, calorieGoal - consumed);
  const calorieGoalMet = consumed >= calorieGoal;
  const proteinGoalMet = protein >= proteinGoal;
  const proteinLeft = Math.max(0, proteinGoal - protein);

  let fuelLine: string;
  if (calorieGoalMet && proteinGoalMet) {
    fuelLine = t("home.nutritionFuelMet");
  } else if (proteinGoalMet && !calorieGoalMet) {
    fuelLine = t("home.nutritionFuelProteinDone", { calories: caloriesLeft });
  } else {
    fuelLine = t("home.nutritionFuelLine", { protein: proteinLeft, calories: caloriesLeft });
  }

  return (
    <Card style={{ gap: 16, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <View style={{ gap: 1 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            {t("home.nutrition")}
          </Text>
          <Text style={{ color: calorieGoalMet && proteinGoalMet ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {fuelLine}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/meals" as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {t("home.viewAll")}
          </Text>
          <Feather name={rtlIcon("chevron-right")} size={13} color={theme.primary} />
        </Pressable>
      </View>

      <CalorieRingHero consumed={consumed} goal={calorieGoal} theme={theme} />

      <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
        {macros.map((m) => {
          const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
          return (
            <View key={m.label} style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                  {m.label}
                </Text>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                  {m.value}g
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ height: 6, width: `${pct * 100}%` as `${number}%`, backgroundColor: m.color, borderRadius: 3 }} />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function CoachCard({
  theme, recommendedPrompt, recommendationName, isRestDay,
}: {
  theme: AppTheme;
  recommendedPrompt?: string;
  recommendationName?: string;
  isRestDay?: boolean;
}) {
  const { t } = useTranslation();
  const ctaPrompt = recommendedPrompt ?? t("home.coachChip1");

  let decisiveLine: string;
  if (recommendationName) {
    decisiveLine = t("home.coachRecommendsSentence", { name: recommendationName });
  } else if (isRestDay) {
    decisiveLine = t("home.coachRestSentence");
  } else {
    decisiveLine = t("home.coachReadySentence");
  }

  return (
    <Card style={{ borderColor: theme.secondary + "30", gap: 0 }}>
      <Pressable
        onPress={() => router.push({ pathname: "/coach/chat" as any, params: { prompt: ctaPrompt } })}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={[styles.todayIcon, { backgroundColor: theme.secondaryDim }]}>
          <Feather name="message-circle" size={18} color={theme.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.aiCoach")}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 15 }} numberOfLines={2}>
            {decisiveLine}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={theme.secondary} />
      </Pressable>
    </Card>
  );
}

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
          <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
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
          pathname: "/workouts/execute" as any,
          params: { id: rec.template.id },
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
    <Card style={{ borderColor: theme.primary + "40", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.todayIcon, { backgroundColor: theme.primaryDim }]}>
          <Feather name="cpu" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.todaysWorkout")}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {t("home.setupFirstPlanTitle")}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
        {t("home.setupFirstPlanDesc")}
      </Text>
      <Pressable
        onPress={() => router.push("/workouts/onboarding" as any)}
        style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
      >
        <Feather name="cpu" size={15} color="#0f0f1a" />
        <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>
          {t("home.setUpAICoach")}
        </Text>
      </Pressable>
    </Card>
  );
}

function WorkoutDoneCard({ workout, theme }: { workout: any; theme: AppTheme }) {
  const { t } = useTranslation();
  return (
    <Card style={{ borderColor: theme.primary + "30", gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.todayIcon, { backgroundColor: theme.primaryDim }]}>
          <Feather name="check-circle" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {t("home.workoutDone")} ✓
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {workout.name || workout.activityType}
            {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
        {t("home.workoutDoneMessage")}
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/workouts" as any)}
        style={[styles.ctaBtn, { backgroundColor: theme.primaryDim }]}
      >
        <Feather name="eye" size={15} color={theme.primary} />
        <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {t("home.viewWorkout")}
        </Text>
      </Pressable>
    </Card>
  );
}


const MILESTONE_THRESHOLDS = [3, 7, 14, 30, 60, 100];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
function nextStreakMilestone(current: number): number | null {
  return STREAK_MILESTONES.find(m => m > current) ?? null;
}

function getThisWeekWorkoutDates(workouts: any[]): Set<string> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const result = new Set<string>();
  workouts.forEach((w) => {
    if (!w.date) return;
    const d = new Date(typeof w.date === "string" ? w.date + (w.date.includes("T") ? "" : "T12:00:00") : w.date);
    if (d >= weekStart) result.add(d.toISOString().slice(0, 10));
  });
  return result;
}

function PRCelebrationBanner({ pr, onDismiss, theme }: {
  pr: { exercise: string; weightKg: number };
  onDismiss: () => void;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  const accent = theme.warning || "#ffab40";
  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: accent + "50",
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <View style={{ width: 3, backgroundColor: accent, alignSelf: "stretch" }} />
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: accent + "20", alignItems: "center", justifyContent: "center", marginLeft: 12, marginVertical: 12 }}>
        <Feather name="award" size={17} color={accent} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 1 }}>
        <Text style={{ color: accent, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {t("home.prBannerTitle")}
        </Text>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={1}>
          {t("home.prBannerExercise", { exercise: pr.exercise, value: `${pr.weightKg} kg` })}
        </Text>
      </View>
      <Pressable onPress={onDismiss} style={{ padding: 12 }} hitSlop={8}>
        <Feather name="x" size={14} color={theme.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

function NextStepCard({ todayWorkout, mealsData, streaksData, theme }: {
  todayWorkout: any;
  mealsData: any;
  streaksData: any;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  if (!todayWorkout) return null;

  const protein = mealsData?.dailyTotals?.proteinG ?? 0;
  const calorieGoal = mealsData?.calorieGoal ?? 2000;
  const proteinGoal = Math.round(calorieGoal * 0.3 / 4);
  const proteinRemaining = Math.max(proteinGoal - protein, 0);
  const mealsLoggedToday = (mealsData?.meals?.length ?? 0) > 0;
  const mealStreak = streaksData?.currentMealStreak ?? 0;

  let icon: keyof typeof Feather.glyphMap;
  let message: string;
  let accent: string;

  if (proteinRemaining > 20) {
    icon = "zap";
    message = t("home.nextStepProtein", { count: proteinRemaining });
    accent = theme.secondary;
  } else if (!mealsLoggedToday && mealStreak > 0) {
    icon = "coffee";
    message = t("home.nextStepLogMeal", { count: mealStreak });
    accent = theme.warning || "#ffab40";
  } else {
    icon = "check-circle";
    message = t("home.nextStepAllDone");
    accent = theme.primary;
  }

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: theme.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: accent + "30",
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: accent + "18", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={17} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5, marginBottom: 1, textTransform: "uppercase" }}>
          {t("home.nextStepTitle")}
        </Text>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function MilestoneCelebrationModal({ streaksData, theme }: { streaksData: any; theme: AppTheme }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [milestoneValue, setMilestoneValue] = useState(0);
  const milestoneShareRef = useRef<View>(null);

  useEffect(() => {
    if (!streaksData || !user?.id) return;

    const checkMilestones = async () => {
      const streakEntries: { type: string; value: number }[] = [
        { type: "workout", value: streaksData.currentWorkoutStreak ?? 0 },
        { type: "meal", value: streaksData.currentMealStreak ?? 0 },
        { type: "hydration", value: streaksData.currentHydrationStreak ?? 0 },
      ];

      for (const entry of streakEntries) {
        if (MILESTONE_THRESHOLDS.includes(entry.value) && entry.value > 0) {
          const key = `milestone_shown:${user.id}:${entry.type}:${entry.value}`;
          const shown = await AsyncStorage.getItem(key);
          if (!shown) {
            await AsyncStorage.setItem(key, "true");
            setMilestoneValue(entry.value);
            setVisible(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
          }
        }
      }
    };

    checkMilestones();
  }, [streaksData, user?.id]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const uri = await captureRef(milestoneShareRef, { format: "png", quality: 1, result: "data-uri" });
        const link = document.createElement("a");
        link.href = uri;
        link.download = "fitlog-streak.png";
        link.click();
      } else {
        const uri = await captureRef(milestoneShareRef, { format: "jpg", quality: 0.95 });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: t("streaks.milestoneTitle") });
        } else {
          await Share.share({ message: t("streaks.shareMessage", { count: milestoneValue }) });
        }
      }
    } catch (_) {
      await Share.share({ message: t("streaks.shareMessage", { count: milestoneValue }) }).catch(() => {});
    }
  }, [milestoneValue, milestoneShareRef, t, i18n]);

  if (!visible) return null;

  const ringSize = 100;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
        {/* Hidden ShareCard for image capture — off-screen */}
        <View style={{ position: "absolute", left: -2000, top: 0 }}>
          <ShareCard
            ref={milestoneShareRef}
            type="streak"
            headline={`${milestoneValue}-Day Streak!`}
            subline={t("streaks.shareMessage", { count: milestoneValue })}
            stats={[
              { label: "day streak", value: `${milestoneValue}`, accent: true },
            ]}
            rtl={i18n.dir() === "rtl"}
          />
        </View>
        <Animated.View entering={ZoomIn.duration(400)} style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                stroke={theme.border} strokeWidth={strokeWidth} fill="none"
              />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                stroke={theme.primary} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <Text style={{ position: "absolute", top: ringSize / 2 - 16, fontSize: 32, textAlign: "center" }}>🔥</Text>
          </View>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center", marginTop: 8 }}>
            {t("streaks.milestoneTitle")}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 }}>
            {t("streaks.milestoneMessage", { count: milestoneValue })}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Pressable
              onPress={() => setVisible(false)}
              style={[styles.modalBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, flex: 1 }]}
            >
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {t("common.dismiss")}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={[styles.modalBtn, { backgroundColor: theme.primary, flex: 1 }]}
            >
              <Feather name="share-2" size={14} color="#0f0f1a" style={{ marginRight: 4 }} />
              <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                {t("common.share")}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => { setVisible(false); router.push("/streaks" as any); }}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
              {t("streaks.viewStreaks")}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getWeeklyWorkoutCount(workouts: any[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekDates = new Set<string>();
  workouts.forEach((w) => {
    if (!w.date) return;
    const d = new Date(w.date);
    if (d >= weekStart) weekDates.add(d.toISOString().slice(0, 10));
  });
  return weekDates.size;
}


function WeeklyProgressCard({
  workouts, targetDays, theme,
}: { workouts: any[]; targetDays: number; theme: AppTheme }) {
  const { t } = useTranslation();
  const done = getWeeklyWorkoutCount(workouts);
  const target = Math.max(targetDays, 1);
  const pct = Math.min(done / target, 1);
  const pctInt = Math.round(pct * 100);
  const isGoalMet = done >= target;
  const remaining = Math.max(target - done, 0);

  let message: string;
  if (isGoalMet) {
    message = t("home.weeklyGoalMet");
  } else if (done === 0) {
    message = t("home.weeklyFirstWorkout");
  } else if (remaining === 1) {
    message = t("home.weeklyOneLeft");
  } else {
    message = t("home.weeklyRemaining", { count: remaining });
  }

  const barColor = isGoalMet ? theme.primary : pct >= 0.5 ? theme.secondary : theme.warning;

  const workoutDatesThisWeek = getThisWeekWorkoutDates(workouts);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - mondayOffset + i);
    return d.toISOString().slice(0, 10);
  });
  const todayIdx = mondayOffset;

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {t("home.weeklyAdherenceTitle")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: isGoalMet ? theme.primary : theme.text, fontFamily: "Inter_700Bold", fontSize: 14 }}>
            {t("home.weeklyOfTarget", { done, target })}
          </Text>
          <View style={{
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
            backgroundColor: isGoalMet ? theme.primaryDim : pct >= 0.5 ? theme.secondary + "20" : theme.warning + "20",
          }}>
            <Text style={{
              color: isGoalMet ? theme.primary : pct >= 0.5 ? theme.secondary : theme.warning,
              fontFamily: "Inter_700Bold", fontSize: 11,
            }}>
              {pctInt}%
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
        {weekDays.map((date, i) => {
          const hasWorkout = workoutDatesThisWeek.has(date);
          const isToday = i === todayIdx;
          const isFuture = i > todayIdx;
          return (
            <View key={date} style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <Text style={{
                color: isToday ? theme.text : theme.textMuted,
                fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular",
                fontSize: 10,
              }}>
                {(t("home.weekDayLetters", { returnObjects: true }) as string[])[(new Date(date + "T12:00:00").getDay() + 6) % 7]}
              </Text>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: hasWorkout ? barColor : isFuture ? "transparent" : theme.border + "60",
                borderWidth: isToday && !hasWorkout ? 1.5 : 0,
                borderColor: barColor,
                alignItems: "center", justifyContent: "center",
              }}>
                {hasWorkout && <Feather name="check" size={12} color="#0f0f1a" />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: "hidden" }}>
        <View style={{
          height: 4,
          width: `${pctInt}%` as `${number}%`,
          backgroundColor: barColor,
          borderRadius: 2,
        }} />
      </View>
      <Text style={{ color: isGoalMet ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
        {message}
      </Text>
    </Card>
  );
}

// ─── STATUS SIGNAL ────────────────────────────────────────────────────────────
type StatusSignal = "onTrack" | "behind" | "atRisk";

function computeStatusSignal(
  workoutsThisWeek: number,
  weeklyGoal: number,
  dayOfWeek: number, // Mon=1 … Sun=7
): StatusSignal {
  if (weeklyGoal <= 0) return "onTrack";
  const expected = Math.ceil(weeklyGoal * (dayOfWeek / 7));
  if (workoutsThisWeek >= expected) return "onTrack";
  const gap = expected - workoutsThisWeek;
  if (gap >= 2) {
    const remainingDays = 7 - dayOfWeek; // days left after today
    const sessionsNeeded = weeklyGoal - workoutsThisWeek;
    if (sessionsNeeded > remainingDays) return "atRisk";
  }
  return "behind";
}

function computeWeeklyAdherenceStreak(workouts: any[], weeklyGoal: number): number | null {
  if (!workouts.length || weeklyGoal <= 0) return null;
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - mondayOffset);
  currentWeekStart.setHours(0, 0, 0, 0);

  const workoutsByWeek = new Map<string, Set<string>>();
  for (const w of workouts) {
    if (!w.date) continue;
    const raw = w.date.includes("T") ? w.date : w.date + "T12:00:00";
    const d = new Date(raw);
    if (isNaN(d.getTime()) || d >= currentWeekStart) continue;
    const wDay = d.getDay();
    const wMon = wDay === 0 ? 6 : wDay - 1;
    const wWeekStart = new Date(d);
    wWeekStart.setDate(d.getDate() - wMon);
    wWeekStart.setHours(0, 0, 0, 0);
    const key = wWeekStart.toISOString().slice(0, 10);
    if (!workoutsByWeek.has(key)) workoutsByWeek.set(key, new Set());
    workoutsByWeek.get(key)!.add(d.toISOString().slice(0, 10));
  }

  if (workoutsByWeek.size < 2) return null;

  const sortedWeeks = Array.from(workoutsByWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  let streak = 0;
  let prevKey: string | null = null;
  for (const [key, dates] of sortedWeeks) {
    if (prevKey !== null) {
      const prevDate: Date = new Date(prevKey + "T00:00:00");
      const expectedPrev: Date = new Date(prevDate.getTime());
      expectedPrev.setDate(prevDate.getDate() - 7);
      if (key !== expectedPrev.toISOString().slice(0, 10)) break;
    }
    if (dates.size >= weeklyGoal) {
      streak++;
      prevKey = key;
    } else {
      break;
    }
  }
  return streak >= 2 ? streak : null;
}

function StatusSignalRow({
  signal,
  workoutsLeft,
  weeklyGoalDone,
  theme,
}: {
  signal: StatusSignal | null;
  workoutsLeft: number;
  weeklyGoalDone: boolean;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  if (!signal) return null;

  let sentence: string;
  let icon: keyof typeof Feather.glyphMap;
  let color: string;

  if (signal === "onTrack") {
    color = theme.primary;
    icon = "check-circle";
    sentence = weeklyGoalDone
      ? t("home.weeklyGoalMet")
      : t("home.statusOnTrackSentence");
  } else if (signal === "behind") {
    color = theme.warning || "#ffab40";
    icon = "alert-triangle";
    sentence = workoutsLeft === 1
      ? t("home.weeklyOneLeft")
      : t("home.weeklyRemaining", { count: workoutsLeft });
  } else {
    color = theme.danger || "#ff5252";
    icon = "alert-octagon";
    sentence = t("home.statusAtRiskSentence", { count: workoutsLeft });
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(20).duration(180)}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}
    >
      <Feather name={icon} size={13} color={color} />
      <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }}>
        {sentence}
      </Text>
    </Animated.View>
  );
}

function RewardSignalChip({
  recentWin,
  theme,
}: {
  recentWin: { type: "pr"; exercise: string; value: number } | { type: "streak"; count: number } | null;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  if (!recentWin) return null;

  const accent = theme.warning || "#ffab40";
  const label = recentWin.type === "pr"
    ? t("home.rewardPRLine", { exercise: recentWin.exercise, value: `${recentWin.value} kg` })
    : t("home.rewardStreakLine", { count: recentWin.count });

  return (
    <Animated.View
      entering={FadeIn.delay(120).duration(250)}
      style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        marginHorizontal: 16, marginBottom: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, backgroundColor: accent + "14",
        borderWidth: 1, borderColor: accent + "40",
      }}
    >
      <Feather name={recentWin.type === "pr" ? "award" : "zap"} size={14} color={accent} />
      <Text style={{ color: accent, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

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

const NOTIF_TYPE_COLOR: Record<string, string> = {
  workout: "#00e676",
  meal: "#ff80ab",
  hydration: "#448aff",
  streak: "#ffab40",
  recovery: "#ea80fc",
  weekly: "#18ffff",
};

const NOTIF_TYPE_ICON: Record<string, any> = {
  workout: "activity",
  meal: "coffee",
  hydration: "droplet",
  streak: "zap",
  recovery: "heart",
  weekly: "bar-chart-2",
};

function SmartBanner({
  message,
  onDismiss,
  theme,
}: {
  message: { type: string; title: string; body: string };
  onDismiss: () => void;
  theme: AppTheme;
}) {
  const accent = NOTIF_TYPE_COLOR[message.type] ?? "#00e676";
  const icon = NOTIF_TYPE_ICON[message.type] ?? "bell";
  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: accent + "40",
        flexDirection: "row",
        alignItems: "flex-start",
        overflow: "hidden",
      }}
    >
      <View style={{ width: 3, backgroundColor: accent, alignSelf: "stretch" }} />
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: accent + "20", alignItems: "center", justifyContent: "center" }}>
            <Feather name={icon} size={11} color={accent} />
          </View>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }} numberOfLines={1}>
            {message.title}
          </Text>
        </View>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
          {message.body}
        </Text>
      </View>
      <Pressable
        onPress={onDismiss}
        style={{ padding: 12, justifyContent: "flex-start" }}
        hitSlop={8}
      >
        <Feather name="x" size={14} color={theme.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { activeBanner, dismiss } = useSmartNotifications();

  const { data: mealsData, refetch: refetchMeals } = useQuery({
    queryKey: ["mealsToday"],
    queryFn: () => api.getMeals(),
    staleTime: 60000,
  });

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 300000,
  });

  const { data: workoutsData, refetch: refetchWorkouts } = useQuery({
    queryKey: ["workouts"],
    queryFn: () => api.getWorkouts({ limit: 20 }),
    staleTime: 300000,
  });

  const { data: recoveryTodayData, refetch: refetchRecovery } = useQuery({
    queryKey: ["recoveryToday"],
    queryFn: api.getRecoveryToday,
    staleTime: 60000,
  });

  const { data: measurementsData, refetch: refetchMeasurements } = useQuery({
    queryKey: ["measurementsToday"],
    queryFn: () => api.getMeasurements(1),
    staleTime: 60000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: 300000,
  });

  const { data: streaksData, refetch: refetchStreaks } = useQuery({
    queryKey: ["streaks"],
    queryFn: api.getStreaks,
    staleTime: 300000,
  });

  const { data: achievementsData } = useQuery({
    queryKey: ["achievements"],
    queryFn: api.getAchievements,
    staleTime: 300000,
  });

  const [prBannerDismissed, setPrBannerDismissed] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMeals(), refetchProfile(), refetchWorkouts(),
      refetchRecovery(), refetchStreaks(), refetchMeasurements(),
    ]);
    setRefreshing(false);
  }, [refetchMeals, refetchProfile, refetchWorkouts, refetchRecovery, refetchStreaks, refetchMeasurements]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const hasCoachOnboarding = !!profile?.coachOnboardingComplete;

  const todayWorkout = useMemo(() => {
    const workouts: any[] = workoutsData?.workouts || [];
    const today = new Date().toISOString().slice(0, 10);
    return workouts.find((w: any) => w.date?.startsWith(today)) || null;
  }, [workoutsData]);

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

  const weeklyGoalTarget = useMemo(() => profile?.weeklyWorkoutDays || 3, [profile]);

  const workoutsThisWeekCount = useMemo(
    () => getWeeklyWorkoutCount(workoutsData?.workouts || []),
    [workoutsData],
  );

  const statusSignal = useMemo<StatusSignal | null>(() => {
    if (!workoutsData || !profile) return null;
    const jsDay = new Date().getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Mon=1…Sun=7
    return computeStatusSignal(workoutsThisWeekCount, weeklyGoalTarget, dayOfWeek);
  }, [workoutsThisWeekCount, weeklyGoalTarget, workoutsData, profile]);

  const weeklyAdherenceStreak = useMemo(
    () => computeWeeklyAdherenceStreak(workoutsData?.workouts || [], weeklyGoalTarget),
    [workoutsData, weeklyGoalTarget],
  );

  const recentWin = useMemo(() => {
    if (achievementsData?.recentPRs?.length > 0) {
      const pr = achievementsData.recentPRs[0];
      return { type: "pr" as const, exercise: pr.exercise as string, value: pr.weightKg as number };
    }
    const bestStreak = Math.max(
      streaksData?.currentWorkoutStreak ?? 0,
      streaksData?.currentMealStreak ?? 0,
    );
    if (bestStreak >= 3) return { type: "streak" as const, count: bestStreak };
    return null;
  }, [achievementsData, streaksData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* ═══ ZONE 1 — HERO ═══ */}

        <Animated.View entering={FadeInDown.duration(200)} style={styles.header}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_700Bold", marginBottom: 2 }]}>
              {getGreeting(t)}, {user?.firstName || t("home.friend")}!
            </Text>
            {streaksData ? (() => {
              const bestStreak = Math.max(streaksData.currentWorkoutStreak ?? 0, streaksData.currentMealStreak ?? 0);
              const nextMilestone = nextStreakMilestone(bestStreak);
              const daysToNext = nextMilestone != null ? nextMilestone - bestStreak : null;
              return (
                <Pressable
                  onPress={() => router.push("/streaks" as any)}
                  style={{ marginTop: 1, marginBottom: 1 }}
                >
                  {bestStreak > 0 ? (
                    <View style={{ gap: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 14 }}>🔥</Text>
                        <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 }}>
                          {bestStreak}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 22 }}>
                          {bestStreak === 1 ? t("home.streakDay") : t("home.streakDays")}
                        </Text>
                      </View>
                      {daysToNext != null && daysToNext <= 7 && (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                          {t("home.streakNextMilestone", { count: daysToNext })}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                      {t("home.letsGetStarted")}
                    </Text>
                  )}
                </Pressable>
              );
            })() : null}
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

        {/* ═══ STATUS SIGNAL ROW ═══ */}
        <StatusSignalRow
          signal={statusSignal}
          workoutsLeft={Math.max(weeklyGoalTarget - workoutsThisWeekCount, 0)}
          weeklyGoalDone={workoutsThisWeekCount >= weeklyGoalTarget}
          theme={theme}
        />

        {/* ═══ SMART NOTIFICATION BANNER ═══ */}

        {activeBanner && (
          <SmartBanner message={activeBanner} onDismiss={dismiss} theme={theme} />
        )}

        {/* ═══ ZONE 2 — TODAY'S FOCUS ═══ */}

        <Animated.View entering={FadeInDown.delay(40).duration(160)} style={[styles.section, { marginBottom: 0 }]}>
          {profileLoading ? (
            <SkeletonCard>
              <SkeletonBox width="100%" height={80} borderRadius={12} />
            </SkeletonCard>
          ) : todayWorkout ? (
            <WorkoutDoneCard workout={todayWorkout} theme={theme} />
          ) : hasCoachOnboarding && todayRecommendation ? (
            <TodayWorkoutCard todayRec={todayRecommendation} theme={theme} />
          ) : hasCoachOnboarding ? (
            <RestDayCard theme={theme} />
          ) : (
            <CoachCtaCard theme={theme} />
          )}
        </Animated.View>

        {/* ═══ REWARD SIGNAL (below hero card) ═══ */}
        <View style={{ marginTop: 10 }}>
          <RewardSignalChip recentWin={recentWin} theme={theme} />
        </View>

        {/* ═══ PR CELEBRATION BANNER ═══ */}
        {!prBannerDismissed && achievementsData?.recentPRs?.length > 0 && (
          <PRCelebrationBanner
            pr={achievementsData.recentPRs[0]}
            onDismiss={() => setPrBannerDismissed(true)}
            theme={theme}
          />
        )}

        {/* ═══ WEEKLY PROGRESS ═══ */}
        {workoutsData && profile && (
          <Animated.View entering={FadeInDown.delay(60).duration(200)} style={styles.section}>
            <WeeklyProgressCard
              workouts={workoutsData.workouts || []}
              targetDays={profile.weeklyWorkoutDays || 3}
              theme={theme}
            />
          </Animated.View>
        )}

        {/* ═══ NEXT STEP GUIDANCE ═══ */}
        {todayWorkout && (
          <Animated.View entering={FadeInDown.delay(70).duration(180)} style={styles.section}>
            <NextStepCard
              todayWorkout={todayWorkout}
              mealsData={mealsData}
              streaksData={streaksData}
              theme={theme}
            />
          </Animated.View>
        )}

        {/* ═══ ZONE 3 — NUTRITION + STREAK STRIP ═══ */}

        <Animated.View entering={FadeInDown.delay(80).duration(120)} style={styles.section}>
          {mealsData ? (
            <NutritionHero mealsData={mealsData} theme={theme} />
          ) : (
            <Card style={{ gap: 12, alignItems: "center" }}>
              <SkeletonBox width={HERO_RING} height={HERO_RING} borderRadius={HERO_RING / 2} />
              <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flex: 1, gap: 4 }}>
                    <SkeletonBox width="100%" height={6} borderRadius={3} />
                  </View>
                ))}
              </View>
            </Card>
          )}
          {streaksData && (
            <Pressable
              onPress={() => router.push("/streaks" as any)}
              style={({ pressed }) => [
                styles.streakStrip,
                { marginTop: 10, backgroundColor: theme.card, borderColor: (streaksData.currentWorkoutStreak ?? 0) > 0 || (streaksData.currentMealStreak ?? 0) > 0 ? theme.primary + "30" : theme.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {/* Workout streak */}
              <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  {(streaksData.currentWorkoutStreak ?? 0) > 0 && <Text style={{ fontSize: 10 }}>🔥</Text>}
                  <Feather name="activity" size={11} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>{streaksData.currentWorkoutStreak ?? 0}</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{t("home.workout")}</Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: theme.border }} />
              {/* Meal streak + compliance */}
              <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  {(streaksData.currentMealStreak ?? 0) > 0 && <Text style={{ fontSize: 10 }}>🔥</Text>}
                  <Feather name="coffee" size={11} color={theme.warning || "#ffab40"} />
                  <Text style={{ color: theme.warning || "#ffab40", fontFamily: "Inter_700Bold", fontSize: 16 }}>{streaksData.currentMealStreak ?? 0}</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{t("home.mealsLabel")}</Text>
                {achievementsData?.weeklyScore?.mealDays != null && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9 }}>
                    {t("home.mealDaysThisWeek", { count: achievementsData.weeklyScore.mealDays })}
                  </Text>
                )}
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: theme.border }} />
              {/* Weekly adherence streak */}
              <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Feather name="calendar" size={11} color={theme.secondary} />
                  <Text style={{
                    color: weeklyAdherenceStreak != null ? theme.secondary : theme.textMuted,
                    fontFamily: "Inter_700Bold",
                    fontSize: 16,
                  }}>
                    {weeklyAdherenceStreak != null ? weeklyAdherenceStreak : "—"}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{t("home.weeklyStreakLabel")}</Text>
              </View>
            </Pressable>
          )}
        </Animated.View>

        {/* ═══ ZONE 4 — AI COACH CARD ═══ */}

        <Animated.View entering={FadeInDown.delay(80).duration(80)} style={styles.section}>
          <CoachCard
            theme={theme}
            recommendationName={
              todayRecommendation && !todayRecommendation.isRestDayRecommended
                ? todayRecommendation.recommendation.template.name
                : undefined
            }
            isRestDay={todayRecommendation?.isRestDayRecommended}
            recommendedPrompt={
              todayRecommendation && !todayRecommendation.isRestDayRecommended
                ? `Tell me more about today's ${todayRecommendation.recommendation.template.name} workout recommendation`
                : undefined
            }
          />
        </Animated.View>
      </ScrollView>

      {streaksData && (
        <MilestoneCelebrationModal streaksData={streaksData} theme={theme} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, marginBottom: 16,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 26, lineHeight: 32 },
  date: { fontSize: 13, marginTop: 4 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18 },
  streakHeroBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
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
    gap: 8, paddingVertical: 14, borderRadius: 12, minHeight: 44,
  },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, minHeight: 44,
  },
  weeklyIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  streakStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1,
    minHeight: 44,
  },
  streakBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  logNowBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    minHeight: 44,
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  modalCard: {
    width: "100%", maxWidth: 340, borderRadius: 24,
    padding: 28, alignItems: "center",
  },
  modalBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row",
  },
});
