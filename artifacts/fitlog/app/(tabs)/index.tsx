import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform, Modal, Share,
} from "react-native";
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
import {
  computeGoalInsights,
  GoalInsightsInput,
  GoalInsight,
} from "@/lib/goalInsights";
import type Colors from "@/constants/colors";

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

  return (
    <Card style={{ gap: 16, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {t("home.nutrition")}
        </Text>
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

function HeroActions({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();

  const actions = [
    {
      label: t("home.scanMeal"), icon: "camera" as const,
      color: theme.secondary, onPress: () => router.push("/(tabs)/scan" as any),
    },
    {
      label: t("home.startWorkout"), icon: "play" as const,
      color: theme.primary, onPress: () => router.push("/(tabs)/workouts" as any),
    },
    {
      label: t("home.askCoach"), icon: "message-circle" as const,
      color: "#ce93d8", onPress: () => router.push("/coach/chat" as any),
    },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={a.onPress}
          style={({ pressed }) => [
            styles.heroBtn,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.heroBtnIcon, { backgroundColor: a.color + "20" }]}>
            <Feather name={a.icon} size={20} color={a.color} />
          </View>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" }}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CoachPromptChips({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();
  const chips = [
    t("home.coachChip1"),
    t("home.coachChip2"),
    t("home.coachChip3"),
    t("home.coachChip4"),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip}
          onPress={() => router.push({ pathname: "/coach/chat" as any, params: { prompt: chip } })}
          style={({ pressed }) => [
            styles.coachChip,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="message-circle" size={12} color={theme.secondary} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
            {chip}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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

function AIInsightEmptyState({ theme }: { theme: AppTheme }) {
  const { t } = useTranslation();
  return (
    <Card style={{ gap: 10, borderColor: theme.primary + "15" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[styles.insightIconWrap, { backgroundColor: theme.primaryDim }]}>
          <Feather name="target" size={16} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            {t("home.noInsightsYet")}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }}>
        {t("home.noInsightsMessage")}
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/progress" as any)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
      >
        <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
          {t("home.viewInsights")}
        </Text>
        <Feather name={rtlIcon("chevron-right")} size={12} color={theme.primary} />
      </Pressable>
    </Card>
  );
}

function RecentActivitySection({ workoutsData, mealsData, theme }: { workoutsData: any; mealsData: any; theme: AppTheme }) {
  const { t } = useTranslation();

  const items = useMemo(() => {
    const result: { type: "workout" | "meal"; name: string; detail: string; date: string; icon: string; color: string }[] = [];

    const workouts: any[] = workoutsData?.workouts || [];
    for (const w of workouts.slice(0, 2)) {
      result.push({
        type: "workout",
        name: w.name || w.activityType || "Workout",
        detail: w.durationMinutes ? `${w.durationMinutes} min` : "",
        date: w.date || "",
        icon: "activity",
        color: theme.primary,
      });
    }

    const meals: any[] = mealsData?.todayMeals || [];
    for (const m of meals.slice(0, 2)) {
      result.push({
        type: "meal",
        name: m.name || m.mealType || "Meal",
        detail: m.totalCalories ? `${Math.round(m.totalCalories)} kcal` : "",
        date: m.date || "",
        icon: "coffee",
        color: theme.secondary,
      });
    }

    return result.slice(0, 3);
  }, [workoutsData, mealsData, theme]);

  if (items.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Feather name="clock" size={14} color={theme.textMuted} />
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
          {t("home.recentActivity")}
        </Text>
      </View>
      <Card style={{ gap: 0, paddingVertical: 4, paddingHorizontal: 0 }}>
        {items.map((item, idx) => (
          <View
            key={`${item.type}-${idx}`}
            style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              paddingVertical: 10, paddingHorizontal: 14,
              borderBottomWidth: idx < items.length - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.color + "18", alignItems: "center", justifyContent: "center" }}>
              <Feather name={item.icon as any} size={14} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 13 }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.detail ? (
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                  {item.detail}
                </Text>
              ) : null}
            </View>
            <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
          </View>
        ))}
      </Card>
    </View>
  );
}

function StreakSummaryCard({ streaksData, achievementsData, theme }: { streaksData: any; achievementsData?: any; theme: AppTheme }) {
  const { t } = useTranslation();
  if (!streaksData) return null;

  const workoutCurrent = streaksData.currentWorkoutStreak ?? 0;
  const mealCurrent = streaksData.currentMealStreak ?? 0;
  const hydrationCurrent = streaksData.currentHydrationStreak ?? 0;

  const score = achievementsData?.weeklyScore?.score ?? 0;
  const scoreColor = score >= 70 ? theme.primary : score >= 40 ? (theme.warning || "#ffab40") : theme.danger;

  const items = [
    { icon: "activity" as const, value: workoutCurrent, label: t("home.workout"), color: "#00e676" },
    { icon: "coffee" as const, value: mealCurrent, label: t("home.mealsLabel"), color: "#ffab40" },
    { icon: "droplet" as const, value: hydrationCurrent, label: t("home.hydration"), color: "#448aff" },
    { icon: "trending-up" as const, value: score, label: t("home.thisWeek"), color: scoreColor, suffix: "%" },
  ];

  const hasActiveStreak = workoutCurrent > 0 || mealCurrent > 0;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {hasActiveStreak && <Text style={{ fontSize: 14 }}>🔥</Text>}
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            {t("home.streaks")}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/streaks" as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {t("streaks.viewStreaks")}
          </Text>
          <Feather name={rtlIcon("chevron-right")} size={13} color={theme.primary} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => router.push("/streaks" as any)}
        style={({ pressed }) => [
          styles.streakStrip,
          { backgroundColor: theme.card, borderColor: hasActiveStreak ? theme.primary + "30" : theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {items.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={{ width: 1, height: 28, backgroundColor: theme.border }} />}
            <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                {s.value > 0 && !s.suffix && <Text style={{ fontSize: 10 }}>🔥</Text>}
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
    </View>
  );
}

function DontBreakStreakBanner({
  streaksData, workoutsData, mealsData, theme,
}: {
  streaksData: any; workoutsData: any; mealsData: any; theme: AppTheme;
}) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  if (hour < 18) return null;

  const workoutStreak = streaksData?.currentWorkoutStreak ?? 0;
  const mealStreak = streaksData?.currentMealStreak ?? 0;

  if (workoutStreak < 1 && mealStreak < 1) return null;

  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const workouts = workoutsData?.workouts || [];
  const hasWorkoutToday = workouts.some((w: any) => {
    const wDate = new Date(w.date);
    const wLocal = `${wDate.getFullYear()}-${String(wDate.getMonth() + 1).padStart(2, "0")}-${String(wDate.getDate()).padStart(2, "0")}`;
    return wLocal === todayLocal;
  });

  const meals = mealsData?.meals || mealsData?.todayMeals || [];
  const mealCount = Array.isArray(meals) ? meals.length : 0;
  const hasMealToday = mealCount > 0 || (mealsData?.dailyTotals?.calories ?? 0) > 0;

  if (hasWorkoutToday || hasMealToday) return null;

  const showWorkoutCta = workoutStreak >= 1;
  const showMealCta = mealStreak >= 1;

  if (!showWorkoutCta && !showMealCta) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View
        style={[
          styles.streakBanner,
          { backgroundColor: (theme.warning || "#ffab40") + "15", borderColor: (theme.warning || "#ffab40") + "40" },
        ]}
      >
        <Text style={{ fontSize: 20 }}>🔥</Text>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            {t("streaks.dontBreakStreak")}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {showWorkoutCta && showMealCta
              ? t("streaks.dontBreakBoth", { workoutCount: workoutStreak, mealCount: mealStreak })
              : showWorkoutCta
                ? t("streaks.dontBreakWorkout", { count: workoutStreak })
                : t("streaks.dontBreakMeal", { count: mealStreak })}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {showWorkoutCta && (
              <Pressable
                onPress={() => router.push("/workouts/log" as any)}
                style={[styles.logNowBtn, { backgroundColor: theme.primary }]}
              >
                <Feather name="activity" size={12} color="#0f0f1a" />
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {t("streaks.logWorkout")}
                </Text>
              </Pressable>
            )}
            {showMealCta && (
              <Pressable
                onPress={() => router.push("/(tabs)/scan" as any)}
                style={[styles.logNowBtn, { backgroundColor: theme.warning || "#ffab40" }]}
              >
                <Feather name="camera" size={12} color="#0f0f1a" />
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {t("streaks.logMeal")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function AIInsightCard({
  insight, theme,
}: { insight: GoalInsight; theme: AppTheme }) {
  const { t } = useTranslation();

  const trendIcon = insight.trend === "up" ? "trending-up" : insight.trend === "down" ? "trending-down" : null;
  const trendGood = trendIcon ? (insight.trend === "up") === insight.trendPositive : false;

  return (
    <Card style={{ gap: 8, borderColor: insight.accentColor + "30" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={[styles.insightIconWrap, { backgroundColor: insight.accentColor + "22" }]}>
            <Feather name={insight.icon as any} size={16} color={insight.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={1}>
              {insight.headline}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }} numberOfLines={1}>
              {insight.value} · {insight.goalLabel}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {trendIcon && (
            <Feather name={trendIcon} size={14} color={trendGood ? "#00e676" : "#ef5350"} />
          )}
          <Pressable
            onPress={() => router.push("/(tabs)/progress" as any)}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text style={{ color: insight.accentColor, fontFamily: "Inter_500Medium", fontSize: 12 }}>
              {t("home.viewInsights")}
            </Text>
            <Feather name={rtlIcon("chevron-right")} size={12} color={insight.accentColor} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

function WeeklyReportCard({ theme, streaksData, workoutsData }: { theme: AppTheme; streaksData?: any; workoutsData?: any }) {
  const { t } = useTranslation();

  const dayOfWeek = new Date().getDay();
  const isReportDay = dayOfWeek === 0 || dayOfWeek === 1;
  if (!isReportDay) return null;

  const totalWorkouts = workoutsData?.workouts?.length ?? 0;
  const workoutStreak = streaksData?.currentWorkoutStreak ?? 0;
  const hasData = totalWorkouts > 0;

  return (
    <Pressable onPress={() => router.push("/weekly-report" as any)}>
    <Card style={{ gap: 10, borderColor: theme.secondary + "20" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[styles.weeklyIcon, { backgroundColor: theme.secondary + "18" }]}>
          <Feather name="bar-chart-2" size={18} color={theme.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>
            {t("home.weeklyReport")}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {t("home.comingSoon")}
          </Text>
        </View>
      </View>
      {hasData ? (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 18 }}>{totalWorkouts}</Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("home.workoutsLabel")}</Text>
          </View>
          {workoutStreak > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 18 }}>{workoutStreak}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("home.streaks")}</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
          {t("home.weeklyReportDesc")}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
        <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
          {t("home.viewAll")}
        </Text>
        <Feather name={rtlIcon("chevron-right")} size={12} color={theme.secondary} />
      </View>
    </Card>
    </Pressable>
  );
}

const MILESTONE_THRESHOLDS = [3, 7, 14, 30, 60, 100];

function MilestoneCelebrationModal({ streaksData, theme }: { streaksData: any; theme: AppTheme }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [milestoneValue, setMilestoneValue] = useState(0);

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
      await Share.share({
        message: t("streaks.shareMessage", { count: milestoneValue }),
      });
    } catch (_) {}
  }, [milestoneValue, t]);

  if (!visible) return null;

  const ringSize = 100;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
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

  const { data: streaksData, refetch: refetchStreaks } = useQuery({
    queryKey: ["streaks"],
    queryFn: api.getStreaks,
    staleTime: 60000,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMeals(), refetchProfile(), refetchWorkouts(),
      refetchRecovery(), refetchAchievements(), refetchStreaks(),
    ]);
    setRefreshing(false);
  }, [refetchMeals, refetchProfile, refetchWorkouts, refetchRecovery, refetchAchievements, refetchStreaks]);

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

  const topInsight = useMemo<GoalInsight | null>(() => {
    if (!profile?.fitnessGoals?.length) return null;
    const input: GoalInsightsInput = {
      goals: profile.fitnessGoals,
      profile: {
        calorieGoal: mealsData?.calorieGoal ?? undefined,
        proteinGoalG: undefined,
        weeklyWorkoutDays: profile.weeklyWorkoutDays ?? undefined,
      },
      workouts: recentWorkoutsList,
      streaks: streaksData ? {
        currentWorkoutStreak: streaksData.currentWorkoutStreak ?? 0,
        longestWorkoutStreak: streaksData.longestWorkoutStreak ?? 0,
        currentMealStreak: streaksData.currentMealStreak ?? 0,
      } : undefined,
    };
    const all = computeGoalInsights(input);
    return all.length > 0 ? all[0] : null;
  }, [profile, mealsData, recentWorkoutsList, streaksData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* ═══ ZONE 1 — HERO ═══ */}

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {streaksData && (streaksData.currentWorkoutStreak ?? 0) > 0 && (
              <Pressable
                onPress={() => router.push("/streaks" as any)}
                style={[styles.streakHeroBadge, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "40" }]}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                  {streaksData.currentWorkoutStreak}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={[styles.avatarBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
            >
              <Text style={[styles.avatarText, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                {user?.firstName?.[0] || "U"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.section}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
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
            </View>

            <View style={styles.heroRight}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {t("home.todaysWorkout")}
                </Text>
                {hasCoachOnboarding && (
                  <View style={[styles.aiPill, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="cpu" size={9} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 9 }}>
                      {t("home.aiCoach")}
                    </Text>
                  </View>
                )}
              </View>
              {profileLoading ? (
                <SkeletonCard>
                  <SkeletonBox width="100%" height={42} borderRadius={12} />
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
            </View>
          </View>
        </Animated.View>

        {/* ═══ ZONE 2 — QUICK ACTIONS ═══ */}

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
          <HeroActions theme={theme} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
          <CoachPromptChips theme={theme} />
        </Animated.View>

        {/* ═══ ZONE 3 — SECONDARY FEED ═══ */}

        {streaksData && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <StreakSummaryCard streaksData={streaksData} achievementsData={achievementsData} theme={theme} />
          </Animated.View>
        )}

        {streaksData && (
          <View style={styles.section}>
            <DontBreakStreakBanner
              streaksData={streaksData}
              workoutsData={workoutsData}
              mealsData={mealsData}
              theme={theme}
            />
          </View>
        )}

        <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Feather name="target" size={14} color={theme.primary} />
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {t("home.goalInsight")}
            </Text>
          </View>
          {topInsight ? (
            <AIInsightCard insight={topInsight} theme={theme} />
          ) : (
            <AIInsightEmptyState theme={theme} />
          )}
        </Animated.View>

        {(workoutsData || mealsData) && (
          <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.section}>
            <RecentActivitySection workoutsData={workoutsData} mealsData={mealsData} theme={theme} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.section}>
          <WeeklyReportCard theme={theme} streaksData={streaksData} workoutsData={workoutsData} />
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
  streakHeroBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  heroRow: {
    flexDirection: "row", gap: 12,
  },
  heroLeft: { flex: 1 },
  heroRight: { flex: 1 },
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
  heroBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 16, borderWidth: 1,
  },
  heroBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  coachChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  insightIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  weeklyIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  streakStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1,
  },
  streakBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  logNowBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
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
