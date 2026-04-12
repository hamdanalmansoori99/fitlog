import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { dateLocale, rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import {
  generateWeeklyPlan,
  getRecommendations,
  UserCoachProfile,
  CoachRecommendation,
} from "@/lib/coachEngine";
import { getTemplateById, WorkoutTemplate } from "@/lib/workoutTemplates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSubscription } from "@/hooks/useSubscription";
import { UpsellModal } from "@/components/UpsellModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanDay {
  day: string;
  template: WorkoutTemplate | null;
  rest: boolean;
  note: string;
  completed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffColor(d: string | undefined, theme: any) {
  if (d === "Beginner") return theme.primary;
  if (d === "Intermediate") return theme.secondary;
  if (d === "Advanced") return theme.danger;
  return theme.primary;
}

function restorePlan(saved: any[], templates: WorkoutTemplate[]): PlanDay[] {
  return saved.map((s: any) => {
    const t = s.templateId ? getTemplateById(s.templateId) ?? null : null;
    return { day: s.day, template: t, rest: s.rest, note: s.note, completed: s.completed ?? false };
  });
}

// ─── Swap Workout Modal ───────────────────────────────────────────────────────

function SwapModal({
  visible,
  dayLabel,
  profile,
  recentWorkouts,
  currentTemplateId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  dayLabel: string;
  profile: UserCoachProfile;
  recentWorkouts: any[];
  currentTemplateId?: string;
  onSelect: (rec: CoachRecommendation) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const recs = getRecommendations(profile, recentWorkouts, 12).filter(
    (r) => r.template.id !== currentTemplateId
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[swap.container, { backgroundColor: theme.background }]}>
        <View style={[swap.header, { borderBottomColor: theme.border }]}>
          <Text style={[swap.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("workouts.plan.chooseWorkoutFor", { day: dayLabel })}
          </Text>
          <Pressable onPress={onClose} style={swap.closeBtn} hitSlop={12}>
            <Feather name="x" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Rest option */}
        <Pressable
          onPress={() => onSelect({ template: null as any, score: 0, whyGoodForYou: "", equipmentMatch: "full", missingEquipment: [], substitutionsAvailable: false })}
          style={[swap.restRow, { borderBottomColor: theme.border }]}
        >
          <View style={[swap.restIcon, { backgroundColor: theme.card }]}>
            <Feather name="moon" size={18} color={theme.textMuted} />
          </View>
          <Text style={[swap.restLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t("workouts.plan.setAsRestDay")}
          </Text>
        </Pressable>

        <FlashList
          data={recs}
          keyExtractor={(r) => r.template.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10, paddingTop: 12 }}
          renderItem={({ item: rec }) => (
            <Pressable
              onPress={() => onSelect(rec)}
              style={({ pressed }) => [
                swap.recCard,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={swap.recRow}>
                <View style={[swap.equipDot, {
                  backgroundColor: rec.equipmentMatch === "full" ? theme.primary + "25" : theme.warning + "25",
                }]}>
                  <Feather
                    name={rec.equipmentMatch === "full" ? "check-circle" : "refresh-cw"}
                    size={14}
                    color={rec.equipmentMatch === "full" ? theme.primary : theme.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[swap.recName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {t(rec.template.nameKey, { defaultValue: rec.template.name })}
                  </Text>
                  <View style={swap.recMeta}>
                    <Feather name="clock" size={10} color={theme.textMuted} />
                    <Text style={[swap.recMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {rec.template.durationMinutes} {t("common.min")}
                    </Text>
                    <Text style={{ color: diffColor(rec.template.difficulty, theme), fontFamily: "Inter_500Medium", fontSize: 10 }}>
                      · {t(`workouts.plan.difficulty.${rec.template.difficulty}`)}
                    </Text>
                  </View>
                </View>
                <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
              </View>
              <Text style={[swap.recWhy, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                {t(rec.whyGoodForYou)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[{ color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 40, fontSize: 14 }]}>
              {t("workouts.plan.noAlternatives")}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyPlanScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile, staleTime: 300_000 });
  const { data: workoutsData } = useQuery({ queryKey: ["workouts", { limit: 100 }], queryFn: () => api.getWorkouts({ limit: 100 }), staleTime: 120_000 });
  const { data: recoveryToday } = useQuery({ queryKey: ["recoveryToday"], queryFn: api.getRecoveryToday, staleTime: 120_000 });

  const recentWorkouts = (workoutsData?.workouts || []).slice(0, 14).map((w: any) => ({
    name: w.name,
    activityType: w.activityType,
    date: w.date,
    durationMinutes: w.durationMinutes,
  }));

  const userProfile: UserCoachProfile = {
    availableEquipment: profile?.availableEquipment || [],
    workoutLocation: profile?.workoutLocation || "Home",
    trainingPreferences: profile?.trainingPreferences || [],
    experienceLevel: profile?.experienceLevel || "Beginner",
    preferredWorkoutDuration: profile?.preferredWorkoutDuration || "45 minutes",
    weeklyWorkoutDays: profile?.weeklyWorkoutDays || 3,
    fitnessGoals: profile?.fitnessGoals || [],
  };

  const { features } = useSubscription();
  const [upsellVisible, setUpsellVisible] = useState(false);

  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  // Load or generate plan once profile data arrives
  useEffect(() => {
    if (!profile || plan !== null) return;
    const savedPlan = profile.savedWeeklyPlan;
    if (savedPlan && Array.isArray(savedPlan) && savedPlan.length === 7) {
      setPlan(restorePlan(savedPlan, []));
      setSaved(true);
    } else {
      setPlan(generateWeeklyPlan(userProfile, recentWorkouts));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const planToSave = useCallback(() => {
    if (!plan) return [];
    return plan.map((p) => ({
      day: p.day,
      templateId: p.template?.id ?? null,
      rest: p.rest,
      note: p.note,
      completed: p.completed ?? false,
    }));
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateProfile({ savedWeeklyPlan: planToSave() }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const logMutation = useMutation({
    mutationFn: (w: { name: string; activityType: string; durationMinutes: number }) =>
      api.createWorkout({ ...w, date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
    },
  });

  const regenerate = () => {
    if (!features.smartProgression) {
      setUpsellVisible(true);
      return;
    }
    setPlan(generateWeeklyPlan(userProfile, recentWorkouts));
    setSaved(false);
  };

  const toggleComplete = (idx: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const day = { ...next[idx] };
      const nowDone = !day.completed;
      day.completed = nowDone;
      next[idx] = day;
      // Auto-log workout when marked complete
      if (nowDone && day.template) {
        logMutation.mutate({
          name: day.template.name,
          activityType: day.template.activityType,
          durationMinutes: day.template.durationMinutes,
        });
      }
      return next;
    });
    setSaved(false);
  };

  const swapDay = (idx: number, rec: CoachRecommendation) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      if (rec.template === null) {
        // Set as rest day
        next[idx] = { day: prev[idx].day, template: null, rest: true, note: t("workouts.plan.restDay"), completed: false };
      } else {
        next[idx] = { day: prev[idx].day, template: rec.template, rest: false, note: rec.whyGoodForYou, completed: false };
      }
      return next;
    });
    setEditingDayIdx(null);
    setSaved(false);
  };

  const today = new Date().toLocaleString(dateLocale(), { weekday: "long" });

  if (profileLoading || plan === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 12 }}>
          {t("workouts.plan.buildingPlan")}
        </Text>
      </View>
    );
  }

  const workoutDays = plan.filter((p) => !p.rest);
  const completedCount = plan.filter((p) => p.completed).length;
  const totalMinutes = workoutDays.reduce((s, d) => s + (d.template?.durationMinutes || 0), 0);
  const progressPct = workoutDays.length > 0 ? completedCount / workoutDays.length : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Nav */}
      <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("workouts.plan.weeklyPlan")}
        </Text>
        <Pressable onPress={regenerate} style={styles.refreshBtn} hitSlop={8}>
          <Feather name="refresh-cw" size={18} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100, maxWidth: 600, width: "100%", alignSelf: "center" as const }]}
      >
        {/* Summary card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.primaryDim }]}>
              <Feather name="calendar" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("workouts.plan.summaryTitle", { count: workoutDays.length, minutes: totalMinutes })}
              </Text>
              <Text style={[styles.summarySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {userProfile.experienceLevel} · {userProfile.preferredWorkoutDuration}
              </Text>
            </View>
            {saved && (
              <Animated.View entering={FadeIn} style={[styles.savedPill, { backgroundColor: theme.primaryDim }]}>
                <Feather name="check" size={12} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("workouts.plan.saved")}</Text>
              </Animated.View>
            )}
          </View>

          {/* Progress bar */}
          {workoutDays.length > 0 && (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {t("workouts.plan.progressThisWeek")}
                </Text>
                <Text style={[styles.progressLabel, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {completedCount}/{workoutDays.length}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <Animated.View
                  style={[styles.progressFill, { width: `${progressPct * 100}%` as any, backgroundColor: theme.primary }]}
                />
              </View>
            </View>
          )}

          {/* Goal tags */}
          {userProfile.fitnessGoals.length > 0 && (
            <View style={styles.goalRow}>
              {userProfile.fitnessGoals.slice(0, 3).map((g) => (
                <View key={g} style={[styles.goalPill, { backgroundColor: theme.secondaryDim }]}>
                  <Text style={{ color: theme.secondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>{g}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Recovery readiness banner */}
        {recoveryToday && (() => {
          const energy = recoveryToday.energyLevel ?? 3;
          const sleep = recoveryToday.sleepHours ?? 8;
          const sorenessVals = Object.values(recoveryToday.soreness ?? {}) as number[];
          const hasHighSoreness = sorenessVals.some((v: number) => v >= 2);
          const isRest = energy <= 1 && sleep < 5;
          const isLow = energy <= 2 || hasHighSoreness;

          if (isRest) {
            return (
              <Animated.View entering={FadeInDown.duration(250)} style={[styles.readinessBanner, { backgroundColor: "#ef535018", borderColor: "#ef5350" }]}>
                <Feather name="alert-triangle" size={16} color="#ef5350" />
                <Text style={[styles.readinessText, { color: "#ef5350" }]}>
                  {t("workouts.restRecommended", { defaultValue: "Rest day recommended \u2014 low energy and poor sleep" })}
                </Text>
              </Animated.View>
            );
          }
          if (isLow) {
            return (
              <Animated.View entering={FadeInDown.duration(250)} style={[styles.readinessBanner, { backgroundColor: "#ffab4018", borderColor: "#ffab40" }]}>
                <Feather name="alert-triangle" size={16} color="#ffab40" />
                <Text style={[styles.readinessText, { color: "#ffab40" }]}>
                  {t("workouts.lowReadiness", { defaultValue: "Your body may need lighter work today" })}
                </Text>
              </Animated.View>
            );
          }
          return null;
        })()}

        {/* Day cards */}
        {plan.map((day, idx) => {
          const isToday = day.day === today;
          const isDone = !!day.completed;

          return (
            <Animated.View key={day.day} entering={FadeInDown.duration(250)}>
              <View style={[
                styles.dayCard,
                {
                  backgroundColor: isToday && !isDone ? theme.primaryDim : theme.card,
                  borderColor: isToday && !isDone ? theme.primary : isDone ? theme.primary + "50" : theme.border,
                },
              ]}>
                {/* ── Top row: day label + edit/check actions ── */}
                <View style={styles.dayHeader}>
                  <Text style={[
                    styles.dayName,
                    { fontFamily: isToday ? "Inter_700Bold" : "Inter_500Medium", color: isToday && !isDone ? theme.primary : theme.textMuted },
                  ]}>
                    {day.day}{isToday ? ` — ${t("workouts.plan.today")}` : ""}
                  </Text>
                  <View style={styles.dayActions}>
                    {/* Edit/swap button */}
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); setEditingDayIdx(idx); }}
                      style={[styles.editBtn, { borderColor: theme.border }]}
                      hitSlop={12}
                    >
                      <Feather name="edit-2" size={12} color={theme.textMuted} />
                    </Pressable>
                    {/* Mark complete checkbox */}
                    {!day.rest && (
                      <Pressable
                        onPress={(e) => { e.stopPropagation?.(); toggleComplete(idx); }}
                        style={[styles.checkBtn, {
                          backgroundColor: isDone ? theme.primary : "transparent",
                          borderColor: isDone ? theme.primary : theme.border,
                        }]}
                        hitSlop={12}
                        accessibilityLabel={isDone ? t("workouts.plan.markIncomplete") : t("workouts.plan.markComplete")}
                        accessibilityRole="checkbox"
                      >
                        <Feather name="check" size={14} color={isDone ? "#0f0f1a" : theme.border} />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* ── Content area ── */}
                {day.rest ? (
                  <View style={styles.restContent}>
                    <Feather name="moon" size={15} color={theme.textMuted} />
                    <Text style={[styles.restText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {t(day.note)}
                    </Text>
                  </View>
                ) : (
                  /* Tapping the workout info area navigates to the template */
                  <Pressable
                    onPress={() => {
                      if (day.template) {
                        router.push({ pathname: "/workouts/template" as any, params: { id: day.template.id, whyGoodForYou: day.note } });
                      }
                    }}
                    style={styles.workoutContent}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.workoutNameRow}>
                        <Text style={[styles.workoutName, {
                          color: isDone ? theme.textMuted : theme.text,
                          fontFamily: "Inter_600SemiBold",
                          textDecorationLine: isDone ? "line-through" : "none",
                        }]} numberOfLines={1}>
                          {day.template?.name}
                        </Text>
                        {isDone && (
                          <View style={[styles.donePill, { backgroundColor: theme.primary + "25" }]}>
                            <Feather name="check-circle" size={11} color={theme.primary} />
                            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 10 }}>{t("workouts.plan.done")}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.workoutMeta}>
                        <Feather name="clock" size={10} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                          {day.template?.durationMinutes} {t("common.min")}
                        </Text>
                        <View style={[styles.diffBadge, { backgroundColor: diffColor(day.template?.difficulty, theme) + "20" }]}>
                          <Text style={{ color: diffColor(day.template?.difficulty, theme), fontFamily: "Inter_400Regular", fontSize: 10 }}>
                            {t(`workouts.plan.difficulty.${day.template?.difficulty}`)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.dayNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {t(day.note)}
                      </Text>
                    </View>
                    <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
                  </Pressable>
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Save footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <Button
          title={saved ? t("workouts.plan.planSaved") : t("workouts.plan.saveThisPlan")}
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={saved}
        />
        <Button
          title={t("workouts.plan.regeneratePlan")}
          onPress={regenerate}
          variant="outline"
        />
      </View>

      {/* Swap modal */}
      {editingDayIdx !== null && (
        <SwapModal
          visible={editingDayIdx !== null}
          dayLabel={plan[editingDayIdx]?.day ?? ""}
          profile={userProfile}
          recentWorkouts={recentWorkouts}
          currentTemplateId={plan[editingDayIdx]?.template?.id}
          onSelect={(rec) => swapDay(editingDayIdx, rec)}
          onClose={() => setEditingDayIdx(null)}
        />
      )}

      <UpsellModal visible={upsellVisible} onClose={() => setUpsellVisible(false)} feature="smartProgression" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  refreshBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  content: { paddingHorizontal: 16, gap: 10, paddingTop: 14 },
  summaryCard: { marginBottom: 2 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 15 },
  summarySub: { fontSize: 12, marginTop: 2 },
  savedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  progressBlock: { gap: 6, marginBottom: 10 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  goalPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dayCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayName: { fontSize: 13 },
  dayActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  restContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  restText: { fontSize: 13, flex: 1 },
  workoutContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  workoutName: { fontSize: 15 },
  donePill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  workoutMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  metaText: { fontSize: 11 },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dayNote: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  readinessBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  readinessText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, lineHeight: 18 },
});

const swap = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  restRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  restIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  restLabel: { fontSize: 15 },
  recCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  recRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  equipDot: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  recName: { fontSize: 14 },
  recMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  recMetaText: { fontSize: 11 },
  recWhy: { fontSize: 12, lineHeight: 16, paddingStart: 42 },
});
