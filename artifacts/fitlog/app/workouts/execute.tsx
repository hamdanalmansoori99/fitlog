import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Platform, Alert, Vibration, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, SlideInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { getTemplateById } from "@/lib/workoutTemplates";
import { getFilteredExercises } from "@/lib/coachEngine";
import { calculateStrengthTarget } from "@/lib/progressionEngine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetData {
  reps: string;
  weight: string;
  completed: boolean;
  rpe?: number;
}
interface ExerciseData {
  name: string;
  targetReps: string;
  targetDuration?: string;
  targetSets: number;
  restSec: number;
  sets: SetData[];
  skipped: boolean;
  alternatives: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRestSec(rest?: string): number {
  if (!rest) return 60;
  const m = rest.match(/(\d+)/);
  const n = m ? parseInt(m[1]) : 60;
  if (rest.includes("min")) return n * 60;
  return Math.min(n, 180);
}

function parseRepsFirst(reps?: string): string {
  if (!reps) return "10";
  const m = reps.match(/\d+/);
  return m ? m[0] : reps;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function estimateCals(durationMin: number, activityType: string): number {
  const mets: Record<string, number> = {
    gym: 5, running: 9, cycling: 7, walking: 4,
    swimming: 8, tennis: 7, yoga: 3, other: 5,
  };
  return Math.round((mets[activityType] || 5) * 70 * (durationMin / 60));
}

const MOODS = ["Exhausted", "Tough", "Good", "Great", "Crushing it"];
const MOOD_ICONS = ["😓", "💪", "😊", "🔥", "🏆"];
const RPE_VALUES = [2, 4, 6, 8, 10];
const RPE_EMOJIS = ["🟢", "🟡", "🟠", "🔴", "🔥"];
const RPE_LABELS = ["Easy", "Moderate", "Hard", "V.Hard", "Max"];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExecuteWorkoutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: templateId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const template = templateId ? getTemplateById(templateId as string) : undefined;

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const userEquipment: string[] = profile?.availableEquipment || [];

  const filteredExercises = useMemo(
    () => (template && profile ? getFilteredExercises(template, userEquipment) : []),
    [template, profile]
  );

  const isGym = template?.activityType === "gym";

  // Build session state from filtered exercises
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [phase, setPhase] = useState<"active" | "rest" | "done">("active");
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mood, setMood] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const [prModal, setPrModal] = useState<{ exercise: string; weight: number; reps: number; previousBest: number } | null>(null);

  // Store next position when entering rest phase
  const pendingRef = useRef<{ exIdx: number; setIdx: number } | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise exercises once filteredExercises loads
  useEffect(() => {
    if (filteredExercises.length > 0 && exercises.length === 0) {
      setExercises(
        filteredExercises.map((ex) => ({
          name: ex.name,
          targetReps: ex.reps || "",
          targetDuration: ex.duration,
          targetSets: ex.sets || 3,
          restSec: parseRestSec(ex.rest),
          alternatives: ex.alternatives || [],
          skipped: false,
          sets: Array.from({ length: ex.sets || 3 }, () => ({
            reps: parseRepsFirst(ex.reps),
            weight: "",
            completed: false,
          })),
        }))
      );
    }
  }, [filteredExercises]);

  // Elapsed timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, []);

  // Rest countdown (use setTimeout chain to avoid stale closures)
  useEffect(() => {
    if (phase !== "rest" || restSecondsLeft <= 0) return;
    const t = setTimeout(() => {
      setRestSecondsLeft((s) => {
        if (s <= 1) {
          // Time's up — advance
          if (pendingRef.current) {
            const { exIdx, setIdx: si } = pendingRef.current;
            setExerciseIdx(exIdx);
            setSetIdx(si);
            setPhase("active");
            pendingRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, restSecondsLeft]);

  // Exercise history for all gym exercises
  const gymNames = useMemo(
    () => (isGym ? exercises.map((e) => e.name) : []),
    [exercises, isGym]
  );
  const { data: historyData } = useQuery({
    queryKey: ["execHistory", gymNames],
    queryFn: () => api.getExerciseHistory(gymNames),
    enabled: gymNames.length > 0,
    staleTime: 120000,
  });
  const historyMap = useMemo<Record<string, any[]>>(() => {
    const m: Record<string, any[]> = {};
    if (historyData?.exercises) {
      for (const e of historyData.exercises) m[e.name] = e.sessions ?? [];
    }
    return m;
  }, [historyData]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      router.replace("/(tabs)" as any);
    },
    onError: (err: any) => Alert.alert(t("common.error"), err.message || t("workouts.errorSaving")),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (name: string) => api.createUserTemplate({
      name: name || template?.name || "My Template",
      activityType: template?.activityType || "gym",
      estimatedMinutes: Math.round(elapsedSeconds / 60) || undefined,
      exercises: exercises
        .filter((e) => !e.skipped && e.sets.some((s) => s.completed))
        .map((e, i) => ({
          name: e.name,
          order: i,
          sets: e.sets
            .filter((s) => s.completed)
            .map((s) => ({
              reps: parseInt(s.reps) || undefined,
              weightKg: parseFloat(s.weight) || undefined,
              rpe: s.rpe,
            })),
        })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      setTemplateSaved(true);
      setSaveAsTemplate(false);
    },
    onError: () => Alert.alert(t("common.error"), t("workouts.errorSavingTemplate")),
  });

  // ── Event handlers ─────────────────────────────────────────────────────────

  const updateSet = useCallback((exI: number, sI: number, field: "reps" | "weight", val: string) => {
    setExercises((prev) => {
      const next = prev.map((e, ei) =>
        ei !== exI ? e : {
          ...e,
          sets: e.sets.map((s, si) => si !== sI ? s : { ...s, [field]: val }),
        }
      );
      return next;
    });
  }, []);

  const setRpe = useCallback((exI: number, sI: number, rpe: number) => {
    setExercises((prev) =>
      prev.map((e, ei) =>
        ei !== exI ? e : {
          ...e,
          sets: e.sets.map((s, si) => si !== sI ? s : { ...s, rpe }),
        }
      )
    );
  }, []);

  function advance(fromExI: number, fromSetI: number) {
    const ex = exercises[fromExI];
    const nextSetI = fromSetI + 1;

    if (nextSetI < ex.sets.length) {
      // More sets in this exercise
      const rest = ex.restSec;
      if (rest > 0) {
        pendingRef.current = { exIdx: fromExI, setIdx: nextSetI };
        setRestSecondsLeft(rest);
        setPhase("rest");
      } else {
        setSetIdx(nextSetI);
      }
    } else {
      // Move to next exercise
      const nextExI = findNextExercise(fromExI + 1);
      if (nextExI === -1) {
        setPhase("done");
      } else {
        const rest = ex.restSec;
        if (rest > 0) {
          pendingRef.current = { exIdx: nextExI, setIdx: 0 };
          setRestSecondsLeft(rest);
          setPhase("rest");
        } else {
          setExerciseIdx(nextExI);
          setSetIdx(0);
        }
      }
    }
  }

  function findNextExercise(startFrom: number): number {
    for (let i = startFrom; i < exercises.length; i++) {
      if (!exercises[i].skipped) return i;
    }
    return -1;
  }

  function checkForPR(exIdx: number, sIdx: number) {
    const ex = exercises[exIdx];
    const set = ex.sets[sIdx];
    const weight = parseFloat(set.weight);
    const reps = parseInt(set.reps);
    if (!weight || weight <= 0 || !reps || reps <= 0) return;

    const sessions = historyMap[ex.name] ?? [];
    if (sessions.length === 0) return;

    let previousBestWeight = 0;
    for (const session of sessions) {
      for (const s of session.sets || []) {
        if ((s.weightKg ?? 0) > previousBestWeight) {
          previousBestWeight = s.weightKg ?? 0;
        }
      }
    }

    if (weight > previousBestWeight && previousBestWeight > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPrModal({ exercise: ex.name, weight, reps, previousBest: previousBestWeight });
    }
  }

  function completeSet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const capturedExIdx = exerciseIdx;
    const capturedSetIdx = setIdx;
    setExercises((prev) =>
      prev.map((e, ei) =>
        ei !== exerciseIdx ? e : {
          ...e,
          sets: e.sets.map((s, si) => si !== setIdx ? s : { ...s, completed: true }),
        }
      )
    );
    if (isGym) {
      checkForPR(capturedExIdx, capturedSetIdx);
    }
    advance(exerciseIdx, setIdx);
  }

  function skipSet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advance(exerciseIdx, setIdx);
  }

  function skipExercise() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises((prev) =>
      prev.map((e, ei) => ei !== exerciseIdx ? e : { ...e, skipped: true })
    );
    const nextExI = findNextExercise(exerciseIdx + 1);
    if (nextExI === -1) {
      setPhase("done");
    } else {
      setExerciseIdx(nextExI);
      setSetIdx(0);
    }
  }

  function replaceExercise() {
    const ex = exercises[exerciseIdx];
    if (!ex.alternatives.length) {
      Alert.alert(t("workouts.noAlternatives"), t("workouts.noAlternativesMessage"));
      return;
    }
    const buttons = ex.alternatives.map((alt) => ({
      text: alt,
      onPress: () => {
        setExercises((prev) =>
          prev.map((e, ei) =>
            ei !== exerciseIdx
              ? e
              : {
                  ...e,
                  name: alt,
                  sets: e.sets.map((s) => ({ ...s, completed: false })),
                }
          )
        );
        setSetIdx(0);
      },
    }));
    buttons.push({ text: t("common.cancel"), onPress: () => {} });
    Alert.alert(t("workouts.replaceExerciseTitle"), t("workouts.chooseAlternative"), buttons as any);
  }

  function skipRest() {
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    if (pendingRef.current) {
      const { exIdx, setIdx: si } = pendingRef.current;
      setExerciseIdx(exIdx);
      setSetIdx(si);
      setPhase("active");
      pendingRef.current = null;
    }
    setRestSecondsLeft(0);
  }

  const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSave() {
    if (!template) return;
    const durationMin = Math.round(elapsedSeconds / 60);
    const gymExercises = isGym
      ? exercises
          .filter((e) => !e.skipped)
          .map((e, i) => ({
            name: e.name,
            order: i,
            sets: e.sets
              .filter((s) => s.completed)
              .map((s, j) => ({
                reps: parseInt(s.reps) || undefined,
                weightKg: parseFloat(s.weight) || undefined,
                rpe: s.rpe,
                completed: true,
                order: j,
              })),
          }))
          .filter((e) => e.sets.length > 0)
      : [];

    const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.completed));
    const cals = estimateCals(durationMin, template.activityType);

    saveMutation.mutate({
      activityType: template.activityType,
      name: template.name,
      date: new Date().toISOString(),
      durationMinutes: durationMin || template.durationMinutes,
      caloriesBurned: cals,
      mood: mood || undefined,
      exercises: gymExercises,
      metadata: { source: "execute", templateId: template.id },
    });
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!template) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, fontFamily: "Inter_400Regular" }}>{t("workouts.workoutNotFoundMsg")}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.primary, marginTop: 12, fontFamily: "Inter_500Medium" }}>{t("workouts.goBackLabel")}</Text>
        </Pressable>
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular" }}>{t("workouts.loadingWorkout")}</Text>
      </View>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────────

  if (phase === "done") {
    const durationMin = Math.round(elapsedSeconds / 60);
    const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length;
    const completedExercises = exercises.filter((e) => !e.skipped && e.sets.some((s) => s.completed)).length;
    const cals = estimateCals(durationMin, template.activityType);

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 32, padding: 20, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Trophy */}
          <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center", gap: 8, paddingVertical: 16 }}>
            <View style={[styles.trophyCircle, { backgroundColor: theme.primaryDim }]}>
              <Text style={{ fontSize: 44 }}>🏆</Text>
            </View>
            <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 8 }}>
              {t("workouts.workoutComplete")}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
              {template.name}
            </Text>
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.summaryRow}>
            {[
              { icon: "clock", label: t("workouts.durationLabel"), value: fmt(elapsedSeconds) + " min", color: theme.secondary },
              { icon: "check-circle", label: t("workouts.setsDone"), value: String(completedSets), color: theme.primary },
              { icon: "zap", label: t("workouts.estCalories"), value: `~${cals}`, color: theme.orange },
            ].map((s) => (
              <View key={s.label} style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Feather name={s.icon as any} size={20} color={s.color} />
                <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 4 }}>{s.value}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Exercise summary */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {t("workouts.exercisesCompleted", { count: completedExercises, s: completedExercises !== 1 ? "s" : "" })}
                </Text>
              </View>
              {exercises.filter((e) => !e.skipped).map((ex, i) => {
                const done = ex.sets.filter((s) => s.completed).length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.summaryExRow,
                      { borderBottomColor: theme.border },
                      i < exercises.filter((e) => !e.skipped).length - 1 && { borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={[styles.exNumDot, { backgroundColor: done > 0 ? theme.primaryDim : theme.card }]}>
                      <Text style={{ color: done > 0 ? theme.primary : theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 11 }}>
                        {done > 0 ? "✓" : "–"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{ex.name}</Text>
                      {done > 0 && (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                          {ex.sets
                            .filter((s) => s.completed)
                            .map((s) => `${s.reps}${s.weight ? `×${s.weight}kg` : ""}`)
                            .join("  ")}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: done > 0 ? theme.primary : theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                      {done}/{ex.sets.length}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </Animated.View>

          {/* Mood */}
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 }}>
              {t("workouts.howDidItFeelQuestion")}
            </Text>
            <View style={styles.moodRow}>
              {MOODS.map((m, i) => (
                <Pressable
                  key={m}
                  onPress={() => setMood(m)}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: mood === m ? theme.primaryDim : theme.card,
                      borderColor: mood === m ? theme.primary : theme.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{MOOD_ICONS[i]}</Text>
                  <Text style={{ color: mood === m ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 9, textAlign: "center" }}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Save as Template */}
          <Animated.View entering={FadeInDown.delay(260).duration(400)}>
            {templateSaved ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 }}>
                <Feather name="check-circle" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.templateSaved")}</Text>
              </View>
            ) : !saveAsTemplate ? (
              <Pressable
                onPress={() => { setSaveAsTemplate(true); setTemplateName(template?.name || ""); }}
                style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1 }, { borderColor: theme.secondary + "50", backgroundColor: theme.secondaryDim }]}
              >
                <Feather name="bookmark" size={17} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.saveAsTemplate")}</Text>
              </Pressable>
            ) : (
              <Card style={{ gap: 10 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.templateNameLabel")}</Text>
                <TextInput
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder={template?.name || "My Template"}
                  placeholderTextColor={theme.textMuted}
                  style={{
                    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    color: theme.text, borderColor: theme.border, backgroundColor: theme.background,
                    fontFamily: "Inter_400Regular", fontSize: 15,
                  }}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setSaveAsTemplate(false)}
                    style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", borderColor: theme.border }}
                  >
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium" }}>{t("common.cancel")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => saveTemplateMutation.mutate(templateName)}
                    disabled={saveTemplateMutation.isPending}
                    style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: theme.secondary }}
                  >
                    <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold" }}>
                      {saveTemplateMutation.isPending ? t("workouts.saving") : t("workouts.saveBtnLabel")}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            )}
          </Animated.View>

          {/* Save CTA */}
          <Animated.View entering={FadeInDown.delay(280).duration(400)} style={{ gap: 10 }}>
            <Button title={t("workouts.saveWorkout")} onPress={handleSave} loading={saveMutation.isPending} />
            <Pressable
              onPress={() => {
                Alert.alert(t("workouts.discardWorkoutTitle"), t("workouts.discardWorkoutMessage"), [
                  { text: t("workouts.keepLabel"), style: "cancel" },
                  { text: t("workouts.discardLabel"), style: "destructive", onPress: () => router.replace("/(tabs)" as any) },
                ]);
              }}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("workouts.discardSession")}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {prModal && (
          <Modal transparent animationType="fade" visible={!!prModal} onRequestClose={() => setPrModal(null)}>
            <View style={styles.prOverlay}>
              <Animated.View entering={ZoomIn.duration(400)} style={[styles.prCard, { backgroundColor: theme.card }]}>
                <Text style={{ fontSize: 52, textAlign: "center" }}>🏆</Text>
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center", marginTop: 8 }}>
                  {t("pr.newPersonalRecord")}
                </Text>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center", marginTop: 12 }}>
                  {prModal.exercise}
                </Text>
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 32, textAlign: "center", marginTop: 4 }}>
                  {prModal.weight}kg × {prModal.reps}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                  {t("pr.previousBest", { weight: prModal.previousBest })}
                </Text>
                <Pressable
                  onPress={() => setPrModal(null)}
                  style={[styles.prBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    {t("pr.celebrate")}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  // ── Rest screen ────────────────────────────────────────────────────────────

  if (phase === "rest") {
    const nextPending = pendingRef.current;
    const upNextEx = nextPending ? exercises[nextPending.exIdx] : null;
    const isNewExercise = nextPending && nextPending.setIdx === 0 && nextPending.exIdx !== exerciseIdx;
    const restPct = exercises[exerciseIdx]?.restSec > 0
      ? restSecondsLeft / exercises[exerciseIdx].restSec
      : 0;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
              {template.name}
            </Text>
          </View>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            {fmt(elapsedSeconds)}
          </Text>
        </View>

        <View style={[styles.restBody, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 14, letterSpacing: 1 }}>
              {t("workouts.restLabel")}
            </Text>
            {/* Big timer */}
            <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 72, lineHeight: 80 }}>
              {fmt(restSecondsLeft)}
            </Text>
            {/* Progress ring (simple bar) */}
            <View style={[styles.restBar, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.restBarFill,
                  { backgroundColor: theme.primary, width: `${restPct * 100}%` as any },
                ]}
              />
            </View>
          </Animated.View>

          {/* Up next */}
          {upNextEx && (
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <Card style={{ borderColor: theme.border }}>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 4 }}>
                  {isNewExercise ? t("workouts.nextExercise") : t("workouts.upNextSet", { set: (nextPending?.setIdx ?? 0) + 1, total: upNextEx.sets.length })}
                </Text>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                  {upNextEx.name}
                </Text>
                {isNewExercise && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
                    {upNextEx.targetSets} sets × {upNextEx.targetReps || upNextEx.targetDuration}
                  </Text>
                )}
              </Card>
            </Animated.View>
          )}

          {/* Skip rest */}
          <Pressable
            onPress={skipRest}
            style={[styles.skipRestBtn, { borderColor: theme.primary, backgroundColor: theme.primaryDim }]}
          >
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {t("workouts.skipRest")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Active exercise screen ─────────────────────────────────────────────────

  const currentEx = exercises[exerciseIdx];
  const currentSet = currentEx?.sets[setIdx];
  const nextExIdx = findNextExercise(exerciseIdx + 1);
  const nextEx = nextExIdx !== -1 ? exercises[nextExIdx] : null;
  const prevSessions = historyMap[currentEx?.name] ?? [];
  const progression = isGym && prevSessions.length > 0 ? calculateStrengthTarget(prevSessions) : null;
  const trendColors: Record<string, string> = { progress: theme.primary, maintain: theme.secondary, deload: theme.warning };
  const trendColor = progression ? (trendColors[progression.trend] ?? theme.textMuted) : theme.textMuted;

  const activeExercises = exercises.filter((e) => !e.skipped);
  const activeIdx = activeExercises.indexOf(currentEx);
  const completedSetCount = exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() =>
            Alert.alert(t("workouts.endWorkoutTitle"), t("workouts.endWorkoutMessage"), [
              { text: t("workouts.keepGoing"), style: "cancel" },
              { text: t("workouts.endAndReview"), onPress: () => setPhase("done") },
            ])
          }
          style={styles.stopBtn}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {fmt(elapsedSeconds)}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Progress bar ── */}
      <View style={[styles.progressContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {activeExercises.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    i < activeIdx
                      ? theme.primary
                      : i === activeIdx
                      ? theme.primary + "60"
                      : theme.border,
                  flex: 1,
                },
              ]}
            />
          ))}
        </View>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 6 }}>
          {t("workouts.exerciseN", { n: activeIdx + 1 })} / {activeExercises.length}  ·  {completedSetCount} {t("workouts.setsDone").toLowerCase()}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Exercise header ── */}
        <Animated.View entering={FadeIn.duration(300)} key={currentEx.name + exerciseIdx}>
          <View style={{ gap: 4, marginBottom: 4 }}>
            {currentEx.alternatives.length > 0 && (
              <Pressable onPress={replaceExercise} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
                <Feather name="refresh-cw" size={11} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 11 }}>{t("workouts.replaceExercise")}</Text>
              </Pressable>
            )}
            <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 26 }}>
              {currentEx.name}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
              {currentEx.targetSets} sets × {currentEx.targetReps || currentEx.targetDuration}
              {currentEx.restSec > 0 ? `  ·  ${currentEx.restSec}s rest` : ""}
            </Text>
          </View>

          {/* Previous performance */}
          {progression && progression.trend !== "first" && (
            <Animated.View entering={FadeInDown.delay(80).duration(300)}>
              <View style={[styles.progressionRow, { backgroundColor: trendColor + "12", borderColor: trendColor + "30" }]}>
                <Feather name="trending-up" size={13} color={trendColor} />
                <View style={{ flex: 1 }}>
                  {progression.previousDisplay && (
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      {t("workouts.last")}: {progression.previousDisplay}
                    </Text>
                  )}
                  <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {t("workouts.target")}: {progression.suggestedSets != null && progression.suggestedReps != null
                      ? `${progression.suggestedSets}×${progression.suggestedReps}${progression.suggestedWeightKg ? ` @ ${progression.suggestedWeightKg}kg` : ""}`
                      : t("workouts.matchPrevious")}
                  </Text>
                </View>
                <View style={{ backgroundColor: trendColor + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                    {progression.trend === "progress" ? t("workouts.levelUpArrow") : progression.trend === "deload" ? t("workouts.recoveryArrow") : t("workouts.holdArrow")}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
          {(!progression || progression.trend === "first") && prevSessions.length === 0 && isGym && (
            <View style={[styles.firstTimeBadge, { backgroundColor: theme.primaryDim }]}>
              <Feather name="star" size={11} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 11 }}>{t("workouts.firstTimeExercise")}</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Sets list ── */}
        <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }}>
          {/* Header row */}
          <View style={[styles.setHeaderRow, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.setHeaderCell, { color: theme.textMuted, flex: 1 }]}>{t("workouts.setLabel")}</Text>
            <Text style={[styles.setHeaderCell, { color: theme.textMuted, flex: 2 }]}>{t("workouts.reps")}</Text>
            <Text style={[styles.setHeaderCell, { color: theme.textMuted, flex: 2 }]}>{t("workouts.weightKgLabel")}</Text>
            <View style={{ width: 32 }} />
          </View>

          {currentEx.sets.map((s, si) => {
            const isActive = si === setIdx;
            const rowBg = s.completed
              ? theme.primary + "08"
              : isActive
              ? theme.background
              : theme.card;

            return (
              <View
                key={si}
                style={[
                  styles.setRow,
                  { backgroundColor: rowBg, borderBottomColor: theme.border },
                  si < currentEx.sets.length - 1 && { borderBottomWidth: 1 },
                ]}
              >
                <View style={[
                  styles.setNumBadge,
                  { backgroundColor: s.completed ? theme.primary : isActive ? theme.primaryDim : theme.card, flex: 1 }
                ]}>
                  {s.completed
                    ? <Feather name="check" size={13} color="#0f0f1a" />
                    : <Text style={{ color: isActive ? theme.primary : theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 12 }}>{si + 1}</Text>
                  }
                </View>
                <TextInput
                  value={s.reps}
                  onChangeText={(t) => updateSet(exerciseIdx, si, "reps", t)}
                  editable={!s.completed}
                  keyboardType="numeric"
                  style={[styles.setInput, { color: s.completed ? theme.textMuted : theme.text, borderColor: isActive ? theme.primary + "50" : theme.border, flex: 2 }]}
                />
                <TextInput
                  value={s.weight}
                  onChangeText={(t) => updateSet(exerciseIdx, si, "weight", t)}
                  editable={!s.completed}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.setInput, { color: s.completed ? theme.textMuted : theme.text, borderColor: isActive ? theme.primary + "50" : theme.border, flex: 2 }]}
                />
                <View style={{ width: 32, alignItems: "center" }}>
                  {s.completed && <Feather name="check-circle" size={16} color={theme.primary} />}
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── RPE for active set ── */}
        {currentSet && !currentSet.completed && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 8 }}>
              {t("workouts.howHard")}
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {RPE_VALUES.map((val, ri) => {
                const sel = currentSet.rpe === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => setRpe(exerciseIdx, setIdx, sel ? undefined as any : val)}
                    style={[
                      styles.rpeChip,
                      { backgroundColor: sel ? theme.primary + "20" : theme.card, borderColor: sel ? theme.primary : theme.border, flex: 1 },
                    ]}
                  >
                    <Text style={{ fontSize: 15 }}>{RPE_EMOJIS[ri]}</Text>
                    <Text style={{ color: sel ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center" }}>
                      {RPE_LABELS[ri]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={skipSet}
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 14 }}>{t("workouts.skipSet")}</Text>
          </Pressable>
          <Pressable
            onPress={completeSet}
            style={[styles.completeBtn, { backgroundColor: theme.primary, flex: 2 }]}
          >
            <Feather name="check" size={18} color="#0f0f1a" />
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 16 }}>{t("workouts.doneBtn")}</Text>
          </Pressable>
          <Pressable
            onPress={skipExercise}
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
          >
            <Feather name="skip-forward" size={14} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("workouts.skipBtn")}</Text>
          </Pressable>
        </View>

        {/* ── Next exercise preview ── */}
        {nextEx && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <View style={[styles.nextPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="arrow-right" size={12} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, letterSpacing: 0.5 }}>
                  {t("workouts.nextLabel")}
                </Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{nextEx.name}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                {nextEx.targetSets} sets × {nextEx.targetReps || nextEx.targetDuration}
              </Text>
            </View>
          </Animated.View>
        )}

        {!nextEx && (
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
              {t("workouts.lastExercise")}
            </Text>
          </View>
        )}
      </ScrollView>

      {prModal && (
        <Modal transparent animationType="fade" visible={!!prModal} onRequestClose={() => setPrModal(null)}>
          <View style={styles.prOverlay}>
            <Animated.View entering={ZoomIn.duration(400)} style={[styles.prCard, { backgroundColor: theme.card }]}>
              <Text style={{ fontSize: 52, textAlign: "center" }}>🏆</Text>
              <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center", marginTop: 8 }}>
                {t("pr.newPersonalRecord")}
              </Text>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center", marginTop: 12 }}>
                {prModal.exercise}
              </Text>
              <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 32, textAlign: "center", marginTop: 4 }}>
                {prModal.weight}kg × {prModal.reps}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                {t("pr.previousBest", { weight: prModal.previousBest })}
              </Text>
              <Pressable
                onPress={() => setPrModal(null)}
                style={[styles.prBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                  {t("pr.celebrate")}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  navBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: 1,
  },
  stopBtn: { width: 44, height: 44, justifyContent: "center" },
  progressContainer: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  progressDot: { height: 4, borderRadius: 2 },
  content: { padding: 16, gap: 14 },

  // Progression badge
  progressionRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 6,
  },
  firstTimeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    alignSelf: "flex-start", marginTop: 6,
  },

  // Sets table
  setHeaderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  setHeaderCell: { fontFamily: "Inter_500Medium", fontSize: 11 },
  setRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  setNumBadge: { height: 28, width: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  setInput: {
    borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center",
  },

  // RPE
  rpeChip: {
    alignItems: "center", paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 10, borderWidth: 1, gap: 3,
  },

  // Actions
  actionRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  secondaryBtn: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", gap: 3,
  },
  completeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16,
  },

  // Next exercise
  nextPreview: {
    borderWidth: 1, borderRadius: 14, padding: 14,
  },

  // Rest screen
  restBody: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 32, padding: 24,
  },
  restBar: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  restBarFill: { height: "100%", borderRadius: 3 },
  skipRestBtn: {
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5,
  },

  // Done / summary
  trophyCircle: {
    width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center",
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 2,
  },
  summaryExRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  exNumDot: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  moodRow: { flexDirection: "row", gap: 6 },
  moodChip: {
    alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 4,
  },
  prOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  prCard: {
    width: "100%", maxWidth: 340, borderRadius: 24,
    padding: 28, alignItems: "center",
  },
  prBtn: {
    width: "100%", paddingVertical: 14, borderRadius: 14,
    alignItems: "center", marginTop: 20,
  },
});
