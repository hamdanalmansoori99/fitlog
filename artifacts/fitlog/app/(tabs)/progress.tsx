import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, Image, Alert, TextInput, KeyboardAvoidingView,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import { GoalInsightsPanel } from "@/components/GoalInsightsPanel";
import { computeGoalInsights } from "@/lib/goalInsights";
import { PremiumGate } from "@/components/PremiumGate";
import { PremiumBadge } from "@/components/PremiumBadge";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { usePhotoStore } from "@/store/photoStore";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { dateLocale } from "@/lib/rtl";

function MiniLineChart({ data, color, unit, showTrend = true }: { data: number[]; color: string; unit?: string; showTrend?: boolean }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (data.length === 0) return null;

  if (data.length === 1) {
    return (
      <View style={{ height: 60, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
          {t("progress.logMoreEntries")}
        </Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padMin = min - range * 0.15;
  const padMax = max + range * 0.05;
  const padRange = padMax - padMin || 1;
  const delta = data[data.length - 1] - data[0];
  const unitLabel = unit || "";

  return (
    <View>
      <View style={{ height: 60, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {data.map((v, i) => {
          const h = Math.max(((v - padMin) / padRange) * 50 + 8, 4);
          const isLast = i === data.length - 1;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: isLast ? color : color + "55",
                borderRadius: 3,
              }}
            />
          );
        })}
      </View>
      {showTrend && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Feather
            name={delta < -0.05 ? "trending-down" : delta > 0.05 ? "trending-up" : "minus"}
            size={13}
            color={delta < -0.05 ? theme.primary : delta > 0.05 ? theme.danger : theme.textMuted}
          />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unitLabel ? ` ${unitLabel}` : ""} {t("progress.entries", { count: data.length })}
          </Text>
        </View>
      )}
    </View>
  );
}

const DONUT_SIZE = 100;
const DONUT_R = 36;
const DONUT_SW = 14;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);

  if (total === 0) {
    return (
      <View style={styles.pieChart}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
          {t("progress.noMacroData")}
        </Text>
      </View>
    );
  }

  let offset = 0;
  const segments = data.map(d => {
    const pct = Math.max(d.value, 0) / total;
    const dash = pct * DONUT_CIRC;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <View style={[styles.pieChart, { flexDirection: "row", alignItems: "center", gap: 16 }]}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <G rotation="-90" origin={`${DONUT_CX},${DONUT_CY}`}>
          <Circle
            cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
            stroke={theme.border} strokeWidth={DONUT_SW} fill="none"
          />
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
              stroke={seg.color}
              strokeWidth={DONUT_SW}
              fill="none"
              strokeDasharray={`${seg.dash} ${DONUT_CIRC - seg.dash}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={{ flex: 1, gap: 7 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
              {d.label}
            </Text>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {total > 0 ? Math.round((Math.max(d.value, 0) / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const STREAK_MILESTONES_PROG = [3, 7, 14, 30, 60, 100];
function nextStreakMilestoneProg(current: number): number | null {
  return STREAK_MILESTONES_PROG.find(m => m > current) ?? null;
}

function StreakCard({ icon, value, label, color, showNextMilestone = false }: {
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
  color: string;
  showNextMilestone?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const nextMilestone = showNextMilestone ? nextStreakMilestoneProg(value) : null;
  const daysToNext = nextMilestone != null ? nextMilestone - value : null;
  return (
    <View style={[styles.streakCard, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <Feather name={icon} size={22} color={color} />
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 28 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" }}>{label}</Text>
      {showNextMilestone && daysToNext != null && value > 0 && (
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center", marginTop: 2 }}>
          {t("progress.streakNextIn", { count: daysToNext })}
        </Text>
      )}
    </View>
  );
}

function WeeklyAdherenceGrid({ perDay, theme }: {
  perDay: { date: string; workout: boolean; meal: boolean; hydration: boolean }[];
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const { t } = useTranslation();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const sorted = [...perDay].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {t("progress.adherenceGridTitle")}
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {sorted.map((day, i) => {
          const isToday = day.date === todayStr;
          const dayLetter = (["sun","mon","tue","wed","thu","fri","sat"] as const).map(k => t(`components.weeklyBarChart.${k}`))[new Date(day.date + "T12:00:00").getDay()];
          return (
            <View key={day.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{
                color: isToday ? theme.text : theme.textMuted,
                fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular",
                fontSize: 9,
              }}>
                {dayLetter}
              </Text>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: day.workout ? theme.primary : "transparent",
                borderWidth: 1.5,
                borderColor: day.workout ? theme.primary : theme.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {day.workout && <Feather name="activity" size={10} color="#0f0f1a" />}
              </View>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: day.meal ? (theme.warning || "#ffab40") : "transparent",
                borderWidth: 1.5,
                borderColor: day.meal ? (theme.warning || "#ffab40") : theme.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {day.meal && <Feather name="coffee" size={10} color="#0f0f1a" />}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("progress.workoutAdherence")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.warning || "#ffab40" }} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("progress.mealAdherence")}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [measureDays, setMeasureDays] = useState(60);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string; note: string } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string } | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { photos, addPhoto, deletePhoto } = usePhotoStore();
  const sortedPhotos = useMemo(() =>
    [...photos].sort((a, b) => a.date.localeCompare(b.date)),
    [photos]
  );

  function openNoteModal(uri: string) {
    setPendingNote("");
    setPendingPhoto({ uri });
  }

  function savePendingPhoto() {
    if (!pendingPhoto) return;
    addPhoto({ uri: pendingPhoto.uri, date: new Date().toISOString().split("T")[0], note: pendingNote.trim() });
    setPendingPhoto(null);
    setPendingNote("");
  }

  async function handleAddPhoto() {
    Alert.alert(t("progress.addProgressPhoto"), t("progress.chooseSource"), [
      {
        text: t("progress.camera"), onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync();
          if (!cam.granted) return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [3, 4] });
          if (!result.canceled && result.assets[0]) openNoteModal(result.assets[0].uri);
        },
      },
      {
        text: t("progress.photoLibrary"), onPress: async () => {
          const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!lib.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [3, 4] });
          if (!result.canceled && result.assets[0]) openNoteModal(result.assets[0].uri);
        },
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  function handleDeletePhoto(id: string) {
    Alert.alert(t("progress.deletePhoto"), t("progress.deletePhotoMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deletePhoto(id) },
    ]);
  }
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: workoutSummary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({ queryKey: ["workoutSummary"], queryFn: api.getWorkoutSummary });
  const { data: nutritionStats, isLoading: nutritionLoading, isError: nutritionError, refetch: refetchNutrition } = useQuery({ queryKey: ["nutritionStats"], queryFn: api.getNutritionStats });
  const { data: streaks, isLoading: streaksLoading, isError: streaksError, refetch: refetchStreaks2 } = useQuery({ queryKey: ["streaks"], queryFn: api.getStreaks });
  const { data: records, isLoading: recordsLoading } = useQuery({ queryKey: ["records"], queryFn: api.getPersonalRecords });
  const { data: achievementsData } = useQuery({ queryKey: ["achievements"], queryFn: api.getAchievements, staleTime: 300000 });
  const { data: measurements, isLoading: measurementsLoading } = useQuery({ queryKey: ["measurements", measureDays], queryFn: () => api.getMeasurements(measureDays) });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings, staleTime: 60000 });
  const { data: workoutsData } = useQuery({ queryKey: ["workouts"], queryFn: () => api.getWorkouts({ limit: 60 }), staleTime: 120000 });
  const { data: recoveryTodayData } = useQuery({ queryKey: ["recoveryToday"], queryFn: api.getRecoveryToday, staleTime: 60000 });

  const useImperial = settings?.unitSystem === "imperial";
  const toDisplayWeight = (kg: number) => useImperial ? kg * 2.20462 : kg;
  const weightUnit = useImperial ? "lbs" : "kg";

  const sortedMeasurements = (measurements?.measurements || [])
    .slice()
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weightData = sortedMeasurements
    .filter((m: any) => m.weightKg)
    .map((m: any) => toDisplayWeight(m.weightKg));

  function extractMetric(field: string) {
    const vals = sortedMeasurements.filter((m: any) => m[field] != null).map((m: any) => Number(m[field]));
    if (vals.length === 0) return null;
    const current = vals[vals.length - 1];
    const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
    const delta = prev != null ? current - prev : null;
    return { values: vals, current, delta };
  }

  const metricDefs = [
    { key: "bodyFatPercent", label: t("progress.bodyFat"), unit: "%", icon: "activity" as const, color: "#e040fb", field: "bodyFatPercent" },
    { key: "waistCm", label: t("progress.waist"), unit: useImperial ? "in" : "cm", icon: "maximize" as const, color: "#448aff", field: "waistCm", imperial: 0.393701 },
    { key: "chestCm", label: t("progress.chest"), unit: useImperial ? "in" : "cm", icon: "shield" as const, color: "#00e676", field: "chestCm", imperial: 0.393701 },
    { key: "hipsCm", label: t("progress.hips"), unit: useImperial ? "in" : "cm", icon: "circle" as const, color: "#ffab40", field: "hipsCm", imperial: 0.393701 },
    { key: "armsCm", label: t("progress.arms"), unit: useImperial ? "in" : "cm", icon: "zap" as const, color: "#ff6d00", field: "armsCm", imperial: 0.393701 },
  ];

  const metricResults = metricDefs.map(def => {
    const raw = extractMetric(def.field);
    if (!raw) return { ...def, data: null };
    const convert = useImperial && def.imperial ? (v: number) => v * def.imperial! : (v: number) => v;
    return {
      ...def,
      data: {
        values: raw.values.map(convert),
        current: convert(raw.current),
        delta: raw.delta != null ? convert(raw.delta) : null,
      },
    };
  });

  const latestMeasurementId = sortedMeasurements.length > 0
    ? sortedMeasurements[sortedMeasurements.length - 1].id
    : null;
  
  const caloriesData = (nutritionStats?.dailyCalories || [])
    .slice(-30)
    .map((d: any) => d.calories);
  
  const activityColors: Record<string, string> = {
    cycling: theme.secondary,
    running: theme.primary,
    walking: theme.cyan,
    gym: theme.purple,
    swimming: "#4fc3f7",
    tennis: theme.warning,
    yoga: theme.pink,
    other: theme.textMuted,
  };

  const goalInsights = useMemo(() => {
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
      nutritionStats: nutritionStats ?? undefined,
      streaks: streaks ?? undefined,
      records: records?.records ?? undefined,
      recovery: recoveryLog
        ? {
            sleepQuality: recoveryLog.sleepQuality ?? undefined,
            energyLevel: recoveryLog.energyLevel ?? undefined,
            soreness: recoveryLog.soreness ?? {},
          }
        : undefined,
      workoutSummary: workoutSummary ?? undefined,
    });
  }, [profile, workoutsData, nutritionStats, streaks, records, recoveryTodayData, workoutSummary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("progress.title")}</Text>
        <Pressable
          onPress={() => router.push("/measurements/add")}
          style={[styles.addBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Feather name="plus" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("progress.log")}</Text>
        </Pressable>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + bottomPad, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
      >
        {/* ── ERROR RETRY BANNER ── */}
        {(summaryError || nutritionError || streaksError) && (
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: theme.danger + "18", borderWidth: 1, borderColor: theme.danger + "40", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name="alert-circle" size={18} color={theme.danger} />
            <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("common.error")}</Text>
            <Pressable onPress={() => { refetchSummary(); refetchNutrition(); refetchStreaks2(); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.danger + "25" }}>
              <Text style={{ color: theme.danger, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        )}

        {/* ── CONSISTENCY SCORE ── */}
        {!summaryLoading && workoutSummary && profile && (() => {
          const weeklyTarget = profile.weeklyWorkoutDays || 3;
          const monthlyTarget = weeklyTarget * 4;
          const totalMonth = workoutSummary.totalThisMonth || 0;
          const score = Math.min(Math.round((totalMonth / Math.max(monthlyTarget, 1)) * 100), 100);
          const streak = streaks?.currentWorkoutStreak || 0;
          const isHighScore = score >= 80;
          const isMidScore = score >= 40;
          const motivationMsg = score === 0
            ? t("home.buildMomentum")
            : isHighScore
            ? t("home.crushingIt")
            : t("home.keepPushing");
          const barColor = isHighScore ? theme.primary : isMidScore ? theme.secondary : theme.warning;
          return (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isHighScore ? theme.primary + "30" : theme.border, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {t("home.consistencyScore")}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                      {t("home.consistencyScoreDesc")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", gap: 2 }}>
                    <Text style={{ color: barColor, fontFamily: "Inter_700Bold", fontSize: 32, lineHeight: 36 }}>{score}%</Text>
                    {streak > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Text style={{ fontSize: 11 }}>🔥</Text>
                        <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{streak}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ height: 6, width: `${score}%` as `${number}%`, backgroundColor: barColor, borderRadius: 3 }} />
                </View>
                <Text style={{ color: isHighScore ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                  {motivationMsg}
                </Text>
              </View>
            </Animated.View>
          );
        })()}

        {/* Workout History Calendar */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.workoutHistory")}</Text>
          <WorkoutCalendar />
        </Animated.View>

        {/* Weekly Report entry point */}
        <Animated.View entering={FadeInDown.delay(10).duration(350)}>
          <Pressable
            onPress={() => router.push("/progress/weekly-report" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1,
                borderColor: theme.primary + "40",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryDim, alignItems: "center", justifyContent: "center" }}>
              <Feather name="bar-chart-2" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                {t("home.weeklyReport")}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 }}>
                {t("home.weeklyReportSummary")}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.primary} />
          </Pressable>
        </Animated.View>

        {/* Goal-based insights */}
        <Animated.View entering={FadeInDown.delay(20).duration(350)}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.goalInsights")}</Text>
          <GoalInsightsPanel
            insights={goalInsights}
            goals={profile?.fitnessGoals || []}
            theme={theme}
          />
        </Animated.View>

        {/* Streaks */}
        <Animated.View entering={FadeInDown.delay(40).duration(350)}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.streaksTitle")}</Text>
          {streaksLoading ? (
            <View style={styles.streaksRow}>
              {[0, 1, 2].map(i => (
                <SkeletonCard key={i} style={{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 18 } as any}>
                  <SkeletonBox width={24} height={24} borderRadius={8} />
                  <SkeletonBox width={32} height={28} borderRadius={6} />
                  <SkeletonBox width={52} height={11} borderRadius={4} />
                </SkeletonCard>
              ))}
            </View>
          ) : (
            <View style={styles.streaksRow}>
              <StreakCard icon="zap" value={streaks?.currentWorkoutStreak || 0} label={t("progress.workoutStreak")} color={theme.primary} showNextMilestone />
              <StreakCard icon="award" value={streaks?.longestWorkoutStreak || 0} label={t("progress.longestStreak")} color={theme.warning} />
              <StreakCard icon="coffee" value={streaks?.currentMealStreak || 0} label={t("progress.mealStreak")} color={theme.pink} showNextMilestone />
            </View>
          )}

          {/* ── WEEKLY ADHERENCE GRID ── */}
          {achievementsData?.weeklyScore?.perDay?.length > 0 && (
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginTop: 12,
            }}>
              <WeeklyAdherenceGrid
                perDay={achievementsData.weeklyScore.perDay}
                theme={theme}
              />
            </View>
          )}
        </Animated.View>
        
        {/* Workout Stats */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          {summaryLoading ? (
            <SkeletonCard>
              <SkeletonBox width="40%" height={15} borderRadius={6} style={{ marginBottom: 10 } as any} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <SkeletonBox width={52} height={36} borderRadius={8} />
                  <SkeletonBox width={60} height={12} borderRadius={4} />
                </View>
                <View style={{ width: 1, height: 40, backgroundColor: "transparent" }} />
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <SkeletonBox width={52} height={36} borderRadius={8} />
                  <SkeletonBox width={60} height={12} borderRadius={4} />
                </View>
              </View>
            </SkeletonCard>
          ) : (
            <Card>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.workoutStats")}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {workoutSummary?.totalThisWeek || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("progress.thisWeek")}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {workoutSummary?.totalThisMonth || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("progress.thisMonth")}</Text>
                </View>
              </View>
            </Card>
          )}
        </Animated.View>
        
        {/* Weekly Frequency */}
        {summaryLoading ? (
          <SkeletonCard>
            <SkeletonBox width="50%" height={15} borderRadius={6} style={{ marginBottom: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 6 }}>
              {[55, 80, 40, 100, 65, 45, 90].map((h, i) => (
                <SkeletonBox key={i} style={{ flex: 1 } as any} height={h} borderRadius={6} />
              ))}
            </View>
          </SkeletonCard>
        ) : workoutSummary?.weeklyFrequency ? (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.workoutsPerWeek")}</Text>
            <WeeklyBarChart
              data={workoutSummary.weeklyFrequency.map((w: any, idx: number, arr: any[]) => {
                const weeksAgo = arr.length - 1 - idx;
                const dayLabel = weeksAgo === 0 ? "This wk" : `${weeksAgo}w`;
                return {
                  dayLabel,
                  activeMinutes: w.count,
                  isToday: weeksAgo === 0,
                  valueLabel: w.count === 0 ? "" : String(w.count),
                };
              })}
              emptyMessage={t("progress.noWorkoutsLogged")}
            />
          </Card>
        ) : null}
        
        {/* Activity Breakdown */}
        {summaryLoading ? null : workoutSummary?.activityBreakdown?.length > 0 ? (
          <PremiumGate feature="advancedAnalytics" minHeight={180}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>{t("progress.activityBreakdown")}</Text>
              <PremiumBadge small />
            </View>
            <DonutChart
              data={workoutSummary.activityBreakdown.map((a: any) => ({
                label: `${a.activityType.charAt(0).toUpperCase() + a.activityType.slice(1)} (${a.count})`,
                value: a.count,
                color: activityColors[a.activityType] || theme.textMuted,
              }))}
            />
          </Card>
          </PremiumGate>
        ) : null}
        
        {/* Body Measurements */}
        <View>
          <View style={styles.measureHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.bodyMeasurements")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => router.push("/measurements/add")}
                style={[styles.measureLogBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "40" }]}
              >
                <Feather name="plus" size={13} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{t("progress.logMeasurement")}</Text>
              </Pressable>
              <View style={styles.rangeRow}>
                {[60, 90, 365].map(d => (
                  <Pressable
                    key={d}
                    onPress={() => setMeasureDays(d)}
                    style={[
                      styles.rangeBtn,
                      { backgroundColor: measureDays === d ? theme.primary : theme.card, borderColor: theme.border },
                    ]}
                  >
                    <Text style={{
                      color: measureDays === d ? "#0f0f1a" : theme.textMuted,
                      fontFamily: "Inter_500Medium", fontSize: 11,
                    }}>
                      {d}d
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          
          {measurementsLoading ? (
            <SkeletonCard>
              <SkeletonBox width="50%" height={13} borderRadius={5} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 }}>
                {[40, 60, 35, 70, 50, 65, 45].map((h, i) => (
                  <SkeletonBox key={i} style={{ flex: 1 } as any} height={h} borderRadius={4} />
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 }}>
                <SkeletonBox width={60} height={24} borderRadius={6} />
                <SkeletonBox width={80} height={13} borderRadius={5} />
              </View>
            </SkeletonCard>
          ) : sortedMeasurements.length > 0 ? (
            <>
              {weightData.length > 0 && (
                <PremiumGate feature="advancedAnalytics" minHeight={140}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {t("progress.weightOverTime")}
                    </Text>
                    <PremiumBadge small />
                  </View>
                  <MiniLineChart data={weightData} color={theme.primary} unit={weightUnit} />
                  <View style={styles.weightInfo}>
                    <Text style={[styles.weightCurrent, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                      {weightData[weightData.length - 1]?.toFixed(1)} {weightUnit}
                    </Text>
                    <Text style={[{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                      {t("progress.currentWeight")}
                    </Text>
                  </View>
                </Card>
                </PremiumGate>
              )}

              <View style={styles.metricGrid}>
                {metricResults.map(metric => {
                  const d = metric.data;
                  const hasData = d !== null && d.values.length > 0;
                  const hasChart = d !== null && d.values.length >= 2;
                  const deltaVal = d?.delta ?? null;
                  const displayCurrent = hasData ? d!.current.toFixed(1) : "—";
                  const displayDelta = deltaVal != null ? Math.abs(deltaVal).toFixed(1) : null;

                  return (
                    <Pressable
                      key={metric.key}
                      onPress={() => {
                        if (latestMeasurementId) {
                          router.push(`/measurements/edit?id=${latestMeasurementId}` as any);
                        } else {
                          router.push("/measurements/add");
                        }
                      }}
                      style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <View style={styles.metricCardHeader}>
                        <View style={[styles.metricIconWrap, { backgroundColor: metric.color + "18" }]}>
                          <Feather name={metric.icon} size={14} color={metric.color} />
                        </View>
                        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }}>{metric.label}</Text>
                        {deltaVal != null && (
                          <View style={[styles.deltaBadge, { backgroundColor: metric.color + "18" }]}>
                            <Feather
                              name={deltaVal < -0.05 ? "trending-down" : deltaVal > 0.05 ? "trending-up" : "minus"}
                              size={11}
                              color={metric.color}
                            />
                            <Text style={{
                              color: metric.color,
                              fontFamily: "Inter_500Medium", fontSize: 10,
                            }}>
                              {deltaVal > 0 ? "+" : deltaVal < 0 ? "-" : ""}{displayDelta}{metric.unit}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: hasData ? theme.text : theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 4 }}>
                        {displayCurrent}{hasData && <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: "Inter_400Regular" }}> {metric.unit}</Text>}
                      </Text>
                      {hasChart ? (
                        <View style={{ marginTop: 6 }}>
                          <MiniLineChart data={d!.values} color={metric.color} showTrend={false} />
                        </View>
                      ) : (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 8 }}>
                          {hasData ? t("progress.logMoreToSeeTrend") : t("progress.noDataTapToLog")}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Animated.View entering={ZoomIn.duration(350)}>
              <Card>
                <View style={styles.empty}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="trending-up" size={24} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {t("progress.noMeasurements")}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {t("progress.logMeasurementsMessage")}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/measurements/add")}
                    style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
                  >
                    <Feather name="plus" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("progress.logMeasurement")}</Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          )}
        </View>

        {/* Progress Photos — below measurements as specified */}
        <Animated.View entering={FadeInDown.delay(45).duration(350)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>{t("progress.progressPhotos")}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {sortedPhotos.length >= 2 && (
                <Pressable
                  onPress={() => setCompareOpen(true)}
                  style={[styles.addBtn, { backgroundColor: theme.secondaryDim ?? theme.cardAlt, borderColor: theme.secondary + "50" }]}
                >
                  <Feather name="columns" size={14} color={theme.secondary} />
                  <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("progress.compare")}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleAddPhoto}
                style={[styles.addBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Feather name="camera" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("progress.addPhoto")}</Text>
              </Pressable>
            </View>
          </View>

          {sortedPhotos.length === 0 ? (
            <View style={[styles.emptyPhotoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.emptyPhotoIcon, { backgroundColor: theme.cardAlt }]}>
                <Feather name="camera" size={22} color={theme.textMuted} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("progress.noPhotosYet")}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 230 }}>
                {t("progress.trackTransformation")}
              </Text>
              <Pressable
                onPress={handleAddPhoto}
                style={[{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 4, borderColor: theme.primary + "50", backgroundColor: theme.primary + "15" }]}
              >
                <Feather name="camera" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("progress.takePhoto")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {sortedPhotos.map((photo) => (
                <Pressable key={photo.id} onPress={() => setPhotoViewer({ uri: photo.uri, note: photo.note })} style={styles.photoCell}>
                  <Image source={{ uri: photo.uri }} style={[styles.photoThumb, { borderColor: theme.border }]} resizeMode="cover" />
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4, textAlign: "center" }}>
                    {new Date(photo.date + "T12:00:00").toLocaleDateString(dateLocale(), { month: "short", day: "numeric" })}
                  </Text>
                  {!!photo.note && (
                    <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", marginTop: 1 }} numberOfLines={1}>
                      {photo.note}
                    </Text>
                  )}
                  <Pressable
                    onPress={() => handleDeletePhoto(photo.id)}
                    style={[styles.photoDeleteBtn, { backgroundColor: theme.danger + "dd" }]}
                    hitSlop={4}
                  >
                    <Feather name="x" size={11} color="#fff" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
        
        {/* Nutrition Stats */}
        {nutritionLoading ? (
          <SkeletonCard>
            <SkeletonBox width="35%" height={15} borderRadius={6} style={{ marginBottom: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <SkeletonBox width={52} height={32} borderRadius={8} />
                <SkeletonBox width={70} height={12} borderRadius={4} />
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: "transparent" }} />
              <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <SkeletonBox width={52} height={32} borderRadius={8} />
                <SkeletonBox width={70} height={12} borderRadius={4} />
              </View>
            </View>
          </SkeletonCard>
        ) : nutritionStats ? (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.nutrition")}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg7DayCalories || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("progress.sevenDayAvgKcal")}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg30DayCalories || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("progress.thirtyDayAvgKcal")}</Text>
              </View>
            </View>
            {caloriesData.length >= 2 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 4 }]}>
                  {t("progress.calorieTrend", { count: caloriesData.length })}
                </Text>
                <View style={{ height: 44, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
                  {caloriesData.map((v: number, i: number) => {
                    const max = Math.max(...caloriesData, 1);
                    const isLast = i === caloriesData.length - 1;
                    const h = Math.max((v / max) * 38 + 4, 4);
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: h,
                          backgroundColor: isLast ? theme.orange : theme.orange + "50",
                          borderRadius: 3,
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            )}
            <PremiumGate feature="advancedAnalytics" minHeight={160}>
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {t("progress.macroSplit")}
                </Text>
                <PremiumBadge small />
              </View>
              <DonutChart
                data={[
                  { label: t("common.protein"), value: nutritionStats.macroSplit?.proteinPercentage || 0, color: theme.secondary },
                  { label: t("common.carbs"), value: nutritionStats.macroSplit?.carbsPercentage || 0, color: theme.warning },
                  { label: t("common.fat"), value: nutritionStats.macroSplit?.fatPercentage || 0, color: theme.orange },
                ]}
              />
            </View>
            </PremiumGate>
          </Card>
        ) : (
          <Card>
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.cardAlt }]}>
                <Feather name="coffee" size={22} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.noNutritionData")}</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("progress.logMealsToSee")}
              </Text>
              <Pressable
                onPress={() => router.push("/meals/add" as any)}
                style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
              >
                <Feather name="plus" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("progress.logFirstMeal")}</Text>
              </Pressable>
            </View>
          </Card>
        )}
        
        {/* Personal Records */}
        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.personalRecords")}</Text>
          {recordsLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map(i => (
                <SkeletonCard key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 } as any}>
                  <SkeletonBox width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBox width="40%" height={12} borderRadius={4} />
                    <SkeletonBox width="60%" height={18} borderRadius={5} />
                  </View>
                  <SkeletonBox width={38} height={12} borderRadius={4} />
                </SkeletonCard>
              ))}
            </View>
          ) : records?.records?.length > 0 ? (
            <>
              {records.records.map((r: any, i: number) => {
                let displayValue = r.value;
                if (useImperial) {
                  if (r.rawKg != null) {
                    displayValue = `${(r.rawKg * 2.20462).toFixed(1)} lbs`;
                  } else if (r.rawKm != null) {
                    displayValue = `${(r.rawKm * 0.621371).toFixed(1)} mi`;
                  } else if (r.rawPaceMinPerKm != null) {
                    const pacePerMi = r.rawPaceMinPerKm * 1.60934;
                    const m = Math.floor(pacePerMi);
                    const s = Math.round((pacePerMi - m) * 60);
                    displayValue = `${m}:${s.toString().padStart(2, "0")} /mi`;
                  }
                }
                const exerciseName = r.label?.replace(/^Best /, "") || "";
                const isRecentPR = achievementsData?.recentPRs?.some(
                  (p: any) => p.exercise?.toLowerCase() === exerciseName.toLowerCase()
                ) ?? false;
                const prAccent = isRecentPR ? (theme.warning || "#ffab40") : theme.primary;
                return (
                <Card key={i} style={[styles.recordCard, isRecentPR && { borderColor: prAccent + "50", borderWidth: 1 }]}>
                  <View style={[styles.recordIcon, { backgroundColor: prAccent + "20" }]}>
                    <Feather name="award" size={18} color={prAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.recordLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{r.label}</Text>
                      {isRecentPR && (
                        <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: prAccent + "25" }}>
                          <Text style={{ color: prAccent, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.3 }}>
                            {t("progress.prRecentBadge")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.recordValue, { color: isRecentPR ? prAccent : theme.text, fontFamily: "Inter_700Bold" }]}>{displayValue}</Text>
                  </View>
                  {r.date && (
                    <Text style={[styles.recordDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {new Date(r.date).toLocaleDateString(dateLocale(), { month: "short", day: "numeric" })}
                    </Text>
                  )}
                </Card>
                );
              })}
            </>
          ) : (
            <Card>
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.cardAlt }]}>
                  <Feather name="award" size={22} color={theme.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("progress.noPRsYet")}</Text>
                <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {t("progress.logGymWorkouts")}
                </Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal visible={!!photoViewer} transparent animationType="fade" onRequestClose={() => setPhotoViewer(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000ee", alignItems: "center", justifyContent: "center" }} onPress={() => setPhotoViewer(null)}>
          {photoViewer && (
            <Image source={{ uri: photoViewer.uri }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          )}
          {!!photoViewer?.note && (
            <View style={{ backgroundColor: "#ffffff18", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12 }}>
              <Text style={{ color: "#ffffffcc", fontFamily: "Inter_500Medium", fontSize: 14 }}>{photoViewer.note}</Text>
            </View>
          )}
          <Text style={{ color: "#ffffff99", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 12 }}>{t("progress.tapToClose")}</Text>
        </Pressable>
      </Modal>

      {/* Compare modal: oldest vs newest side by side */}
      <Modal visible={compareOpen} transparent animationType="fade" onRequestClose={() => setCompareOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000ee", justifyContent: "center", padding: 20 }} onPress={() => setCompareOpen(false)}>
          <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 20, gap: 16 }} onStartShouldSetResponder={() => true}>
            <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 17, textAlign: "center" }}>{t("progress.compareTitle")}</Text>
            {sortedPhotos.length >= 2 && (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 }}>{t("progress.first")}</Text>
                  <Pressable onPress={() => { setCompareOpen(false); setPhotoViewer({ uri: sortedPhotos[0].uri, note: sortedPhotos[0].note }); }}>
                    <Image source={{ uri: sortedPhotos[0].uri }} style={{ width: "100%", aspectRatio: 0.75, borderRadius: 12, borderWidth: 1, borderColor: theme.border }} resizeMode="cover" />
                  </Pressable>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {new Date(sortedPhotos[0].date + "T12:00:00").toLocaleDateString(dateLocale(), { month: "short", day: "numeric", year: "2-digit" })}
                  </Text>
                  {!!sortedPhotos[0].note && (
                    <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" }} numberOfLines={1}>{sortedPhotos[0].note}</Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 }}>{t("progress.latest")}</Text>
                  <Pressable onPress={() => { setCompareOpen(false); setPhotoViewer({ uri: sortedPhotos[sortedPhotos.length - 1].uri, note: sortedPhotos[sortedPhotos.length - 1].note }); }}>
                    <Image source={{ uri: sortedPhotos[sortedPhotos.length - 1].uri }} style={{ width: "100%", aspectRatio: 0.75, borderRadius: 12, borderWidth: 1, borderColor: theme.border }} resizeMode="cover" />
                  </Pressable>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {new Date(sortedPhotos[sortedPhotos.length - 1].date + "T12:00:00").toLocaleDateString(dateLocale(), { month: "short", day: "numeric", year: "2-digit" })}
                  </Text>
                  {!!sortedPhotos[sortedPhotos.length - 1].note && (
                    <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" }} numberOfLines={1}>{sortedPhotos[sortedPhotos.length - 1].note}</Text>
                  )}
                </View>
              </View>
            )}
            <Pressable onPress={() => setCompareOpen(false)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("progress.tapToClose")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Note input modal shown after picking a photo */}
      <Modal visible={!!pendingPhoto} transparent animationType="slide" onRequestClose={() => setPendingPhoto(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: "#000000bb" }} onPress={() => setPendingPhoto(null)} />
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, gap: 16 }}>
            {pendingPhoto && (
              <Image source={{ uri: pendingPhoto.uri }} style={{ width: "100%", height: 200, borderRadius: 12 }} resizeMode="cover" />
            )}
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("progress.addNoteOptional")}</Text>
            <TextInput
              value={pendingNote}
              onChangeText={setPendingNote}
              placeholder={t("progress.notePlaceholder")}
              placeholderTextColor={theme.textMuted}
              style={{
                backgroundColor: theme.background,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={savePendingPhoto}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setPendingPhoto(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: "center" }}
              >
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 14 }}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={savePendingPhoto}
                style={{ flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.primary, alignItems: "center" }}
              >
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>{t("progress.savePhoto")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { fontSize: 28 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, marginBottom: 12 },
  cardSub: { fontSize: 12, marginBottom: 8 },
  streaksRow: { flexDirection: "row", gap: 10 },
  streakCard: {
    flex: 1, alignItems: "center", gap: 4, padding: 14, borderRadius: 16, borderWidth: 1,
  },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 40 },
  pieChart: { gap: 10, marginTop: 8 },
  measureHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  rangeRow: { flexDirection: "row", gap: 4 },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  weightInfo: { marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 6 },
  weightCurrent: { fontSize: 22 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 20 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 240 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  recordCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, paddingVertical: 12 },
  recordIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recordLabel: { fontSize: 12 },
  recordValue: { fontSize: 17 },
  recordDate: { fontSize: 12 },
  measureListHeader: { marginBottom: 10 },
  measureRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  measureLogBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  metricGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10,
  },
  metricCard: {
    width: "47.5%", borderRadius: 14, borderWidth: 1, padding: 12,
  },
  metricCardHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  metricIconWrap: {
    width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  deltaBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  emptyPhotoCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  emptyPhotoIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  compareRow: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  compareThumb: { width: 100, height: 130, borderRadius: 10, borderWidth: 1 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCell: { width: "47%", alignItems: "center" },
  photoThumb: { width: "100%", aspectRatio: 0.75, borderRadius: 10, borderWidth: 1 },
  photoDeleteBtn: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
