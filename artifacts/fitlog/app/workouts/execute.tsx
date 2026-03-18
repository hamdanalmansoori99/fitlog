import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Platform, Alert, Vibration, Modal, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, ZoomIn, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { getTemplateById } from "@/lib/workoutTemplates";
import { getFilteredExercises } from "@/lib/coachEngine";
import { calculateStrengthTarget, ExerciseSession } from "@/lib/progressionEngine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { ShareCard } from "@/components/ShareCard";

// ─── Isolated elapsed timer display — only this component re-renders per tick ─
function ElapsedTimer({ elapsedRef }: { elapsedRef: React.MutableRefObject<number> }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDisplay(elapsedRef.current), 1000);
    return () => clearInterval(id);
  }, [elapsedRef]);
  const mins = Math.floor(display / 60);
  const secs = display % 60;
  const str = `${mins}:${secs.toString().padStart(2, "0")}`;
  return <Text style={{ color: "#e0e0f0", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{str}</Text>;
}

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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
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
  const elapsedSecondsRef = useRef(0);
  const [mood, setMood] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const [prModal, setPrModal] = useState<{ exercise: string; weight: number; reps: number; previousBest: number; previousBestReps?: number } | null>(null);
  const [prBadgeVisible, setPrBadgeVisible] = useState(false);
  const [prBadgeText, setPrBadgeText] = useState("");
  const prCelebratedRef = useRef<Set<string>>(new Set());

  const prShareRef = useRef<View>(null);
  const completionShareRef = useRef<View>(null);

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

  // Elapsed timer — increments ref only, no re-render on parent
  useEffect(() => {
    elapsedRef.current = setInterval(() => { elapsedSecondsRef.current += 1; }, 1000);
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
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["execHistory", gymNames],
    queryFn: () => api.getExerciseHistory(gymNames),
    enabled: gymNames.length > 0,
    staleTime: 120000,
  });
  const historyMap = useMemo<Record<string, ExerciseSession[]>>(() => {
    const m: Record<string, ExerciseSession[]> = {};
    if (historyData?.exercises) {
      for (const e of historyData.exercises) m[e.name] = e.sessions ?? [];
    }
    return m;
  }, [historyData]);

  const touchedSetsRef = useRef<Set<string>>(new Set());
  const autoPopulatedRef = useRef(false);
  useEffect(() => {
    if (autoPopulatedRef.current || !isGym) return;
    const keys = Object.keys(historyMap);
    if (keys.length === 0 || exercises.length === 0) return;
    autoPopulatedRef.current = true;
    setExercises((prev) =>
      prev.map((ex, exI) => {
        const sessions = historyMap[ex.name];
        if (!sessions || sessions.length === 0) return ex;
        const prog = calculateStrengthTarget(sessions);
        if (!prog.suggestedWeightKg && !prog.suggestedReps) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (s.completed) return s;
            const key = `${exI}-${si}`;
            if (touchedSetsRef.current.has(key)) return s;
            return {
              ...s,
              weight: prog.suggestedWeightKg ? String(prog.suggestedWeightKg) : s.weight,
              reps: prog.suggestedReps ? String(prog.suggestedReps) : s.reps,
            };
          }),
        };
      })
    );
  }, [historyMap]);

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
      estimatedMinutes: Math.round(elapsedSecondsRef.current / 60) || undefined,
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
    touchedSetsRef.current.add(`${exI}-${sI}`);
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

  const setRpe = useCallback((exI: number, sI: number, rpe: number | undefined) => {
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

  async function sharePR() {
    try {
      if (Platform.OS === "web") {
        const uri = await captureRef(prShareRef, { format: "png", quality: 1, result: "data-uri" });
        const link = document.createElement("a");
        link.href = uri;
        link.download = "fitlog-pr.png";
        link.click();
      } else {
        const uri = await captureRef(prShareRef, { format: "jpg", quality: 0.95 });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: t("pr.share") });
        } else {
          await Share.share({ message: prModal ? t("pr.prSet", { exercise: prModal.exercise, weight: prModal.weight, reps: prModal.reps }) : "" });
        }
      }
    } catch {
      if (prModal) {
        await Share.share({ message: t("pr.prSet", { exercise: prModal.exercise, weight: prModal.weight, reps: prModal.reps }) }).catch(() => {});
      }
    }
  }

  async function shareCompletion() {
    try {
      if (Platform.OS === "web") {
        const uri = await captureRef(completionShareRef, { format: "png", quality: 1, result: "data-uri" });
        const link = document.createElement("a");
        link.href = uri;
        link.download = "fitlog-workout.png";
        link.click();
      } else {
        const uri = await captureRef(completionShareRef, { format: "jpg", quality: 0.95 });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: t("workouts.shareWorkoutBtn") });
        } else {
          const durationMin = Math.round(elapsedSecondsRef.current / 60);
          const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length;
          await Share.share({ message: `${template?.name ?? ""} — ${durationMin} min, ${completedSets} sets done via FitLog` });
        }
      }
    } catch {
      const durationMin = Math.round(elapsedSecondsRef.current / 60);
      const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length;
      await Share.share({ message: `${template?.name ?? ""} — ${durationMin} min, ${completedSets} sets done via FitLog` }).catch(() => {});
    }
  }

  function renderPRModal() {
    if (!prModal) return null;
    return (
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
              {prModal.previousBestReps ? ` × ${prModal.previousBestReps}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16, width: "100%" }}>
              <Pressable
                onPress={() => { sharePR(); setPrModal(null); }}
                style={[styles.prBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary, flex: 1 }]}
              >
                <Feather name="share-2" size={14} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  {t("pr.share")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPrModal(null)}
                style={[styles.prBtn, { backgroundColor: theme.primary, flex: 1 }]}
              >
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  {t("pr.dismiss")}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
          {/* Hidden ShareCard for image capture */}
          <View style={{ position: "absolute", left: -2000, top: 0 }}>
            <ShareCard
              ref={prShareRef}
              type="pr"
              headline={prModal.exercise}
              subline={`${prModal.weight} kg × ${prModal.reps} reps`}
              stats={[
                { label: "weight", value: `${prModal.weight} kg`, accent: true },
                { label: "reps", value: `${prModal.reps}`, accent: false },
                { label: "prev best", value: `${prModal.previousBest} kg`, accent: false },
              ]}
              rtl={i18n.dir() === "rtl"}
            />
          </View>
        </View>
      </Modal>
    );
  }

  function checkForPR(exIdx: number, sIdx: number) {
    const ex = exercises[exIdx];
    const set = ex.sets[sIdx];
    const weight = parseFloat(set.weight);
    const reps = parseInt(set.reps);
    if (!weight || weight <= 0 || !reps || reps <= 0) return;

    const volume = weight * reps;
    const sessions = historyMap[ex.name] ?? [];
    if (sessions.length === 0) return;

    let previousBestVolume = 0;
    let previousBestWeight = 0;
    let previousBestReps = 0;
    for (const session of sessions) {
      for (const s of session.sets || []) {
        const sVol = (s.weightKg ?? 0) * (s.reps ?? 0);
        if (sVol > previousBestVolume) {
          previousBestVolume = sVol;
          previousBestWeight = s.weightKg ?? 0;
          previousBestReps = s.reps ?? 0;
        }
      }
    }

    if (volume > previousBestVolume && previousBestVolume > 0) {
      // Only celebrate once per exercise per session
      if (!prCelebratedRef.current.has(ex.name)) {
        prCelebratedRef.current.add(ex.name);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPrBadgeText(`🏆 ${t("pr.newPersonalRecord")}!`);
        setPrBadgeVisible(true);
        setTimeout(() => setPrBadgeVisible(false), 2400);
        setPrModal({ exercise: ex.name, weight, reps, previousBest: previousBestWeight, previousBestReps });
      }
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
    if (pendingRef.current) {
      const { exIdx, setIdx: si } = pendingRef.current;
      setExerciseIdx(exIdx);
      setSetIdx(si);
      setPhase("active");
      pendingRef.current = null;
    }
    setRestSecondsLeft(0);
  }

  const scrollRef = useRef<ScrollView>(null);

  function handleSave() {
    if (!template) return;
    const durationMin = Math.round(elapsedSecondsRef.current / 60);
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
          <View style={{ width: 44 }} />
          <View style={{ alignItems: "center", flex: 1, gap: 4 }}>
            <SkeletonBox width={100} height={12} />
            <SkeletonBox width={60} height={18} />
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 16, gap: 14 }}>
          <SkeletonBox width="60%" height={26} />
          <SkeletonBox width="40%" height={14} />
          <SkeletonCard style={{ gap: 10 }}>
            <SkeletonBox height={14} />
            {[1, 2, 3].map(i => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <SkeletonBox width={28} height={28} borderRadius={8} />
                <SkeletonBox width={60} height={32} borderRadius={8} />
                <SkeletonBox width={60} height={32} borderRadius={8} />
              </View>
            ))}
          </SkeletonCard>
          <SkeletonBox width="100%" height={50} borderRadius={14} />
        </View>
      </View>
    );
  }

  // ── Done screen ────────────────────────────────────────────────────────────

  if (phase === "done") {
    const durationMin = Math.round(elapsedSecondsRef.current / 60);
    const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length;
    const completedExercises = exercises.filter((e) => !e.skipped && e.sets.some((s) => s.completed)).length;
    const cals = estimateCals(durationMin, template.activityType);

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
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
              { icon: "clock", label: t("workouts.durationLabel"), value: fmt(elapsedSecondsRef.current) + " min", color: theme.secondary },
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
                  <Text style={{ color: mood === m ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center" }}>
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
              onPress={shareCompletion}
              style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 }, { borderColor: theme.primary + "50", backgroundColor: theme.primaryDim }]}
            >
              <Feather name="share-2" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.shareWorkoutBtn")}</Text>
            </Pressable>
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

          {/* Hidden ShareCard for completion image capture — off-screen */}
          <View style={{ position: "absolute", left: -2000, top: 0 }}>
            <ShareCard
              ref={completionShareRef}
              type="workout"
              headline={template.name || t("workouts.workoutComplete")}
              stats={[
                { label: "min", value: String(Math.round(elapsedSecondsRef.current / 60)), accent: false },
                { label: t("workouts.setsDone"), value: String(exercises.flatMap((e) => e.sets.filter((s) => s.completed)).length), accent: true },
                { label: t("workouts.estCalories"), value: `~${estimateCals(Math.round(elapsedSecondsRef.current / 60), template.activityType)}`, accent: false },
                { label: "exercises", value: String(exercises.filter((e) => !e.skipped && e.sets.some((s) => s.completed)).length), accent: false },
              ]}
              exercises={exercises.filter((e) => !e.skipped && e.sets.some((s) => s.completed)).map((ex) => {
                const done = ex.sets.filter((s) => s.completed);
                const best = done.reduce((b: any, s: any) => parseFloat(s.weight || "0") > parseFloat(b?.weight || "0") ? s : b, null);
                const summary = best?.weight && parseFloat(best.weight) > 0
                  ? `${best.weight} kg × ${best.reps}`
                  : `${done.length} sets`;
                return { name: ex.name, summary };
              })}
              rtl={i18n.dir() === "rtl"}
            />
          </View>
        </ScrollView>

        {renderPRModal()}
      </View>
    );
  }

  // ── Active exercise screen (also renders during rest with floating timer) ──

  const isResting = phase === "rest";
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
  const completedSetsInExercise = currentEx.sets.filter((s) => s.completed).length;

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
          <ElapsedTimer elapsedRef={elapsedSecondsRef} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Sticky exercise sub-header: exercise name + Set X of Y ── */}
      <View style={[styles.stickyExHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 17 }} numberOfLines={1}>
            {currentEx.name}
          </Text>
          <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 1 }}>
            {t("workouts.setLabel")} {Math.min(setIdx + 1, currentEx.sets.length)} / {currentEx.sets.length}
          </Text>
        </View>
        {currentEx.alternatives.length > 0 && (
          <Pressable
            onPress={replaceExercise}
            style={[styles.swapChip, { backgroundColor: theme.secondaryDim, borderColor: theme.secondary + "50" }]}
          >
            <Feather name="refresh-cw" size={13} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {t("workouts.replaceExercise")}
            </Text>
          </Pressable>
        )}
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
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 5 }}>
          {t("workouts.exerciseN", { n: activeIdx + 1 })} / {activeExercises.length}  ·  {completedSetCount} {t("workouts.setsDone").toLowerCase()}
        </Text>
      </View>

      {/* ── Rest Timer — fullscreen bottom sheet overlay ── */}
      <Modal
        visible={isResting}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={skipRest}
      >
        <View style={[styles.restOverlay, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View
            entering={SlideInDown.duration(300).easing(Easing.out(Easing.cubic))}
            style={[styles.restSheet, { backgroundColor: theme.card }]}
          >
            <View style={{ alignItems: "center", gap: 8, paddingBottom: 8 }}>
              <View style={[styles.restDot, { backgroundColor: theme.primary, width: 10, height: 10, borderRadius: 5 }]} />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}>
                {t("workouts.restLabel")}
              </Text>
            </View>

            <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 72, textAlign: "center", lineHeight: 80 }}>
              {fmt(restSecondsLeft)}
            </Text>

            <View style={[styles.restProgressBar, { backgroundColor: theme.border, marginVertical: 8 }]}>
              <View
                style={[
                  styles.restProgressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${((currentEx?.restSec || 60) > 0 ? (restSecondsLeft / (currentEx?.restSec || 60)) * 100 : 0)}%`,
                  },
                ]}
              />
            </View>

            {pendingRef.current && (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginBottom: 8 }}>
                {pendingRef.current.exIdx !== exerciseIdx
                  ? `${t("workouts.nextExercise")}: ${exercises[pendingRef.current.exIdx]?.name}`
                  : t("workouts.upNextSet", { set: pendingRef.current.setIdx + 1, total: currentEx?.sets.length })}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setRestSecondsLeft((s) => s + 30)}
                style={[styles.restActionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
              >
                <Feather name="plus" size={16} color={theme.text} />
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>+30s</Text>
              </Pressable>
              <Pressable
                onPress={skipRest}
                style={[styles.restActionBtn, { backgroundColor: theme.primary, flex: 2 }]}
              >
                <Feather name="skip-forward" size={16} color="#0f0f1a" />
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  {t("workouts.skipRest")}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20, maxWidth: 600, width: "100%", alignSelf: "center" as const }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Exercise header ── */}
        <Animated.View entering={FadeIn.duration(300)} key={currentEx.name + exerciseIdx}>
          <View style={{ gap: 4, marginBottom: 4 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              {currentEx.targetSets} sets × {currentEx.targetReps || currentEx.targetDuration}
              {currentEx.restSec > 0 ? `  ·  ${currentEx.restSec}s ${t("workouts.restLabel").toLowerCase()}` : ""}
            </Text>
          </View>

          {/* Coaching hint */}
          {progression && progression.trend !== "first" && (
            <Animated.View entering={FadeInDown.duration(250)}>
              <View style={[styles.coachHintCard, { backgroundColor: trendColor + "08", borderColor: trendColor + "25" }]}>
                {progression.previousDisplay && (
                  <View style={styles.coachHintRow}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, width: 52 }}>
                      {t("workouts.last")}
                    </Text>
                    <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 }}>
                      {progression.previousDisplay}
                    </Text>
                  </View>
                )}
                <View style={styles.coachHintRow}>
                  <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 11, width: 52 }}>
                    {t("workouts.target")}
                  </Text>
                  <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 }}>
                    {progression.suggestedSets != null && progression.suggestedReps != null
                      ? `${progression.suggestedSets}×${progression.suggestedReps}${progression.suggestedWeightKg ? ` @ ${progression.suggestedWeightKg}kg` : ""}`
                      : t("workouts.matchPrevious")}
                  </Text>
                  <View style={{ backgroundColor: trendColor + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                      {progression.trend === "progress" ? t("workouts.levelUpArrow") : progression.trend === "deload" ? t("workouts.recoveryArrow") : t("workouts.holdArrow")}
                    </Text>
                  </View>
                </View>
                <View style={[styles.coachHintRow, { marginTop: 2 }]}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, width: 52 }}>
                    {t("workouts.coachNoteLabel")}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 }}>
                    {progression.rationale}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
          {(!progression || progression.trend === "first") && prevSessions.length === 0 && isGym && !historyLoading && (
            <View style={[styles.coachHintCard, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "25" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="star" size={12} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                  {t("workouts.setBaseline")}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* ── Sets list — card-style rows ── */}
        <View style={{ gap: 8 }}>
          {currentEx.sets.map((s, si) => {
            const isActive = si === setIdx;
            const hasHistory = !s.completed && progression && progression.trend !== "first";
            const suggestedText = hasHistory && (progression!.suggestedWeightKg != null || progression!.suggestedReps != null)
              ? [
                  progression!.suggestedReps != null ? `${progression!.suggestedReps} ${t("workouts.repsUnit")}` : null,
                  progression!.suggestedWeightKg != null ? `${progression!.suggestedWeightKg}${t("common.kg")}` : null,
                ].filter(Boolean).join(" × ")
              : null;
            const lastText = hasHistory && (progression!.prevReps != null || progression!.prevWeightKg != null)
              ? [
                  progression!.prevReps != null ? `${progression!.prevReps} ${t("workouts.repsUnit")}` : null,
                  progression!.prevWeightKg != null ? `${progression!.prevWeightKg}${t("common.kg")}` : null,
                ].filter(Boolean).join(" × ")
              : null;
            const rpeIdx = RPE_VALUES.indexOf(s.rpe ?? -1);
            const rpeLabel = rpeIdx >= 0 ? RPE_EMOJIS[rpeIdx] : "RPE";

            return (
              <View
                key={si}
                style={[
                  styles.setCard,
                  {
                    backgroundColor: s.completed ? theme.primary + "10" : isActive ? theme.card : theme.card + "80",
                    borderColor: s.completed ? theme.primary + "40" : isActive ? theme.primary + "60" : theme.border,
                    opacity: s.completed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Hint row */}
                {(lastText || suggestedText) && (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    {lastText && (
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        {t("workouts.lastLabel")}: {lastText}
                      </Text>
                    )}
                    {suggestedText && (
                      <Text style={{ color: trendColor, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                        ↑ {suggestedText}
                      </Text>
                    )}
                  </View>
                )}

                {/* Main row: checkbox | set# | reps | × | weight | RPE */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, minHeight: 52 }}>
                  {/* Checkbox / set number */}
                  <Pressable
                    onPress={si === setIdx && !s.completed ? completeSet : undefined}
                    style={[
                      styles.setCheckbox,
                      {
                        backgroundColor: s.completed ? theme.primary : isActive ? theme.primaryDim : theme.background,
                        borderColor: s.completed ? theme.primary : isActive ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {s.completed
                      ? <Feather name="check" size={16} color="#0f0f1a" />
                      : <Text style={{ color: isActive ? theme.primary : theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 14 }}>{si + 1}</Text>
                    }
                  </Pressable>

                  {/* Reps input */}
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10, marginBottom: 2 }}>
                      {t("workouts.reps")}
                    </Text>
                    <TextInput
                      value={s.reps}
                      onChangeText={(v) => updateSet(exerciseIdx, si, "reps", v)}
                      editable={!s.completed && isActive}
                      keyboardType="numeric"
                      selectTextOnFocus
                      style={[
                        styles.setInputCard,
                        {
                          color: s.completed ? theme.textMuted : isActive ? theme.text : theme.textMuted,
                          borderColor: isActive && !s.completed ? theme.primary + "60" : theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    />
                  </View>

                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 18 }}>×</Text>

                  {/* Weight input */}
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10, marginBottom: 2 }}>
                      {t("workouts.weightKgLabel")}
                    </Text>
                    <TextInput
                      value={s.weight}
                      onChangeText={(v) => updateSet(exerciseIdx, si, "weight", v)}
                      editable={!s.completed && isActive}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      selectTextOnFocus
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.setInputCard,
                        {
                          color: s.completed ? theme.textMuted : isActive ? theme.text : theme.textMuted,
                          borderColor: isActive && !s.completed ? theme.primary + "60" : theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    />
                  </View>

                  {/* RPE button */}
                  <Pressable
                    onPress={!s.completed && isActive ? () => {
                      const cur = s.rpe;
                      const idx = RPE_VALUES.indexOf(cur ?? -1);
                      const next = idx < RPE_VALUES.length - 1 ? RPE_VALUES[idx + 1] : undefined;
                      setRpe(exerciseIdx, si, next);
                    } : undefined}
                    style={[
                      styles.rpeQuickBtn,
                      {
                        backgroundColor: s.rpe != null ? theme.primary + "15" : theme.background,
                        borderColor: s.rpe != null ? theme.primary + "50" : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{rpeLabel}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Action buttons (hidden during rest) ── */}
        {!isResting && (
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
        )}

        {/* ── Next exercise preview ── */}
        {nextEx && (
          <Animated.View entering={FadeInDown.duration(250)}>
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


      {renderPRModal()}

      {/* ── PR inline badge (2s auto-dismiss) ── */}
      {prBadgeVisible && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          exiting={FadeOut.duration(500)}
          style={styles.prBadgeOverlay}
          pointerEvents="none"
        >
          <View style={[styles.prBadge, { backgroundColor: theme.primary }]}>
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 18 }}>
              {prBadgeText}
            </Text>
          </View>
        </Animated.View>
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

  // Coaching hint
  coachHintCard: {
    borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, marginTop: 6,
  },
  coachHintRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },

  // Sticky exercise sub-header
  stickyExHeader: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, gap: 12,
  },
  swapChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },

  // Card-style set rows
  setCard: {
    borderWidth: 1, borderRadius: 14, padding: 12,
  },
  setCheckbox: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  setInputCard: {
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8,
    fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center",
    minWidth: 64,
  },
  rpeQuickBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
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

  // Rest timer bottom sheet overlay
  restOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end", padding: 16,
  },
  restSheet: {
    borderRadius: 28, padding: 28, gap: 12, alignItems: "center",
  },
  restDot: { width: 8, height: 8, borderRadius: 4 },
  restActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5,
  },
  restProgressBar: { height: 6, borderRadius: 3, overflow: "hidden", width: "100%" },
  restProgressFill: { height: "100%", borderRadius: 3 },

  // PR badge
  prBadgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
  },
  prBadge: {
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20,
    shadowColor: "#00e676", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
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
    minHeight: 44,
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
    flexDirection: "row", paddingVertical: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
});
