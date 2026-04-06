import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  Alert, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SuccessView } from "@/components/SuccessView";
import { calculateStrengthTarget } from "@/lib/progressionEngine";
import { EXERCISES, normalizeExerciseName } from "@/lib/exerciseLibrary";
import { usePendingWorkoutsStore } from "@/store/pendingWorkoutsStore";
import { isNetworkError } from "@/hooks/usePendingWorkoutSync";

const ACTIVITY_TYPES = [
  { id: "gym", labelKey: "workouts.activityLabelGym", icon: "zap" as const, color: "purple" },
  { id: "cardio", labelKey: "workouts.activityLabelCardio", icon: "activity" as const, color: "primary" },
  { id: "other", labelKey: "workouts.activityLabelOther", icon: "more-horizontal" as const, color: "textMuted" },
];

const CARDIO_SUB_TYPES = [
  { id: "running", labelKey: "workouts.activityLabelRunning", icon: "activity" as const },
  { id: "cycling", labelKey: "workouts.activityLabelCycling", icon: "wind" as const },
  { id: "walking", labelKey: "workouts.activityLabelWalking", icon: "navigation" as const },
  { id: "swimming", labelKey: "workouts.activityLabelSwimming", icon: "droplet" as const },
];

const MOOD_OPTIONS = [
  { value: "Exhausted",   icon: "frown", labelKey: "workouts.moodExhausted" },
  { value: "Tough",       icon: "shield", labelKey: "workouts.moodTough" },
  { value: "Good",        icon: "smile", labelKey: "workouts.moodGood" },
  { value: "Great",       icon: "zap", labelKey: "workouts.moodGreat" },
  { value: "Crushing it", icon: "award", labelKey: "workouts.moodCrushingIt" },
] as const;


const RPE_LABEL_KEYS = [
  "workouts.rpeVeryEasy", "workouts.rpeEasy", "workouts.rpeModerate",
  "workouts.rpeHard", "workouts.rpeMaxEffort",
];
const RPE_VALUES = [2, 4, 6, 8, 10];
const RPE_ICONS = ["circle", "circle", "circle", "circle", "zap"] as const;
const RPE_COLORS = ["#4caf50", "#ffeb3b", "#ff9800", "#f44336", "#ff6b35"];

interface GymExercise {
  name: string;
  sets: { reps: string; weight: string }[];
  rpe?: number;
  autoFilled?: boolean;
}

function emptySet() { return { reps: "", weight: "" }; }
function defaultSets() { return [emptySet(), emptySet(), emptySet()]; }

export default function LogWorkoutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const params = useLocalSearchParams<{ prefillType?: string; prefillExercises?: string; prefillName?: string }>();

  const [step, setStep] = useState<"select" | "form">("select");
  const [activityType, setActivityType] = useState("");
  const [cardioSubType, setCardioSubType] = useState("");
  
  // Common fields
  const [durationH, setDurationH] = useState("0");
  const [durationM, setDurationM] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutName, setWorkoutName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Activity-specific
  const [routeType, setRouteType] = useState("");
  const [intensity, setIntensity] = useState("");
  const [matchType, setMatchType] = useState("");
  const [result, setResult] = useState("");
  const [terrain, setTerrain] = useState("");
  const [steps, setSteps] = useState("");
  const [strokeType, setStrokeType] = useState("");
  const [setsPlayed, setSetsPlayed] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [laps, setLaps] = useState("");
  
  // Gym exercises
  const [exercises, setExercises] = useState<GymExercise[]>([
    { name: "", sets: defaultSets() },
  ]);

  const exerciseNames = useMemo(
    () => exercises.map((e) => e.name).filter((n) => n.length > 2),
    [exercises]
  );

  const { data: exerciseHistoryData } = useQuery({
    queryKey: ["exerciseHistory", exerciseNames],
    queryFn: () => api.getExerciseHistory(exerciseNames),
    enabled: activityType === "gym" && exerciseNames.length > 0,
    staleTime: 30000,
  });

  const exerciseHistoryMap = useMemo<Record<string, any[]>>(() => {
    const map: Record<string, any[]> = {};
    if (exerciseHistoryData?.exercises) {
      for (const entry of exerciseHistoryData.exercises) {
        map[entry.name] = entry.sessions ?? [];
      }
    }
    return map;
  }, [exerciseHistoryData]);

  // Auto-fill sets from history when data arrives for a named exercise
  useEffect(() => {
    if (Object.keys(exerciseHistoryMap).length === 0) return;
    setExercises(prev => prev.map(ex => {
      if (!ex.name || ex.autoFilled) return ex;
      const sessions = exerciseHistoryMap[ex.name];
      if (!sessions || sessions.length === 0) return ex;
      const target = calculateStrengthTarget(sessions);
      if (target.trend === "first" || !target.suggestedSets || !target.suggestedReps) return ex;
      // Don't overwrite if user already typed something
      const allEmpty = ex.sets.every(s => !s.reps && !s.weight);
      if (!allEmpty) return ex;
      const sets = Array.from({ length: target.suggestedSets }, () => ({
        reps: String(target.suggestedReps),
        weight: target.suggestedWeightKg ? String(target.suggestedWeightKg) : "",
      }));
      return { ...ex, sets, autoFilled: true };
    }));
  }, [exerciseHistoryMap]);

  const [success, setSuccess] = useState(false);
  const [newAchievements, setNewAchievements] = useState<{ key: string; title: string }[]>([]);
  const [error, setError] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const lastPayload = useRef<any>(null);
  const { addToQueue } = usePendingWorkoutsStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const mutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      if (data?.newAchievements?.length > 0) {
        setNewAchievements(data.newAchievements);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSuccess(true);
    },
    onError: (err: any) => {
      if (isNetworkError(err) && lastPayload.current) {
        addToQueue(lastPayload.current, "log");
        setSuccess(true);
      } else {
        setError(err.message || t("workouts.errorSaving"));
      }
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (name: string) => {
      const completedExercises = exercises.filter(e => e.name && e.sets.some(s => s.reps || s.weight));
      return api.createUserTemplate({
        name: name || workoutName || activityType || "My Template",
        activityType,
        exercises: activityType === "gym" ? completedExercises.map((e, i) => ({
          name: e.name,
          order: i,
          sets: e.sets.filter(s => s.reps || s.weight).map(s => ({
            reps: parseInt(s.reps) || undefined,
            weightKg: parseFloat(s.weight) || undefined,
            rpe: e.rpe,
          })),
        })) : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      setTemplateSaved(true);
      setShowSaveTemplate(false);
    },
    onError: (err: any) => setError(err.message || t("workouts.failedSaveTemplate")),
  });

  useEffect(() => {
    if (params.prefillType) {
      const cardioIds = ["running", "cycling", "walking", "swimming"];
      if (cardioIds.includes(params.prefillType)) {
        setActivityType("cardio");
        setCardioSubType(params.prefillType);
      } else {
        setActivityType(params.prefillType);
      }
      setStep("form");
    }
    if (params.prefillName) {
      setWorkoutName(params.prefillName);
    }
    if (params.prefillExercises) {
      try {
        const parsed = JSON.parse(params.prefillExercises);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExercises(parsed.map((ex: any) => ({
            name: ex.name || "",
            sets: ex.sets?.length > 0
              ? ex.sets.map((s: any) => ({ reps: s.reps ? String(s.reps) : "", weight: s.weightKg ? String(s.weightKg) : "" }))
              : [{ reps: "", weight: "" }],
            rpe: ex.sets?.[0]?.rpe,
          })));
        }
      } catch {}
    }
  }, []);
  
  const handleSubmit = () => {
    setError("");
    const durationMinutes = (parseInt(durationH) || 0) * 60 + (parseInt(durationM || "0") || 0);

    // ── Validation ──────────────────────────────────────────────────────────
    if (activityType === "gym") {
      const namedExercises = exercises.filter(e => e.name.trim());
      if (namedExercises.length === 0) {
        setError(t("workouts.addExerciseError"));
        return;
      }
    } else {
      const parsedDist = distanceKm ? parseFloat(distanceKm) : 0;
      if (durationMinutes === 0 && parsedDist <= 0) {
        setError(t("workouts.durationOrDistanceError"));
        return;
      }
    }

    if (distanceKm) {
      const d = parseFloat(distanceKm);
      if (isNaN(d) || d <= 0 || d > 2000) {
        setError(t("workouts.distanceRangeError"));
        return;
      }
    }

    if (caloriesBurned) {
      const c = parseInt(caloriesBurned);
      if (isNaN(c) || c < 0 || c > 10000) {
        setError(t("workouts.caloriesRangeError"));
        return;
      }
    }

    if (durationM && (parseInt(durationM) < 0 || parseInt(durationM) > 59)) {
      setError(t("workouts.minutesRangeError"));
      return;
    }

    const metadata: any = {};
    
    if (routeType) metadata.routeType = routeType;
    if (intensity) metadata.intensity = intensity;
    if (matchType) metadata.matchType = matchType;
    if (result) metadata.result = result;
    if (terrain) metadata.terrain = terrain;
    if (strokeType) metadata.strokeType = strokeType;
    if (setsPlayed) metadata.setsPlayed = setsPlayed;
    if (steps) metadata.steps = steps;
    if (laps) metadata.laps = laps;
    
    // Estimate calories
    let estimatedCals: number | undefined;
    if (caloriesBurned) {
      estimatedCals = parseInt(caloriesBurned);
    } else if (durationMinutes > 0) {
      const mets: Record<string, number> = {
        cycling: 7, running: 9, walking: 4, gym: 5,
        swimming: 8, cardio: 7, other: 5,
      };
      const met = (activityType === "cardio" && cardioSubType ? mets[cardioSubType] : mets[activityType]) || 5;
      estimatedCals = Math.round(met * 70 * (durationMinutes / 60)); // ~70kg default
    }
    
    const gymExercises = activityType === "gym"
      ? exercises.filter(e => e.name).map((e, i) => ({
          name: e.name,
          order: i,
          rpe: e.rpe,
          sets: e.sets.map((s, j) => ({
            reps: parseInt(s.reps) || undefined,
            weightKg: parseFloat(s.weight) || undefined,
            rpe: e.rpe,
            completed: true,
            order: j,
          })),
        }))
      : [];
    
    const parsedDistance = distanceKm ? parseFloat(distanceKm) : undefined;
    if (parsedDistance && parsedDistance > 0 && durationMinutes > 0) {
      metadata.paceMinPerKm = parseFloat((durationMinutes / parsedDistance).toFixed(2));
    }

    // Store the specific sub-type for cardio workouts to keep data backward-compatible
    const storedActivityType = activityType === "cardio" && cardioSubType ? cardioSubType : activityType;

    const payload = {
      activityType: storedActivityType,
      name: workoutName || undefined,
      date: new Date(date + "T" + new Date().toTimeString().slice(0, 5)).toISOString(),
      durationMinutes: durationMinutes || undefined,
      distanceKm: parsedDistance,
      caloriesBurned: estimatedCals,
      mood: mood || undefined,
      notes: notes || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      exercises: gymExercises,
    };
    lastPayload.current = payload;
    mutation.mutate(payload);
  };
  
  if (success) {
    const activityType_ = ACTIVITY_TYPES.find(a => a.id === activityType);
    const cardioSub_ = activityType === "cardio" ? CARDIO_SUB_TYPES.find(s => s.id === cardioSubType) : null;
    const activityLabel = cardioSub_ ? t(cardioSub_.labelKey) : (activityType_ ? t(activityType_.labelKey) : t("workouts.activityLabelOther"));
    const completedExercises = exercises.filter(e => e.name && e.sets.some(s => s.reps || s.weight));
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <SuccessView
          title={t("workouts.workoutLogged")}
          subtitle={t("workouts.recordedKeepUp", { activity: activityLabel })}
        />
        {newAchievements.length > 0 && (
          <View style={{ width: "100%", paddingHorizontal: 20, marginBottom: 8 }}>
            {newAchievements.map((ach) => (
              <View
                key={ach.key}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  backgroundColor: theme.primary + "18", borderColor: theme.primary + "40",
                  borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: theme.primary + "30", alignItems: "center", justifyContent: "center",
                }}>
                  <Feather name="award" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 11, marginBottom: 2 }}>
                    {t("achievements.newlyUnlocked")}
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    {ach.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {activityType === "gym" && completedExercises.length > 0 && (
          <View style={{ width: "100%", paddingHorizontal: 20, gap: 8 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center", marginBottom: 4 }}>
              {t("workouts.nextSessionTargets")}
            </Text>
            {completedExercises.map((ex) => {
              const sessions = exerciseHistoryMap[ex.name] ?? [];
              const target = calculateStrengthTarget(sessions);
              if (target.trend === "first") return null;
              const trendColors: Record<string, string> = { progress: theme.primary, maintain: theme.secondary, deload: theme.warning };
              const trendColor = trendColors[target.trend] ?? theme.textMuted;
              const trendLabels: Record<string, string> = { progress: t("workouts.levelUp"), maintain: t("workouts.holdSteady"), deload: t("workouts.recoveryLabel") };
              return (
                <View
                  key={ex.name}
                  style={[styles.successProgressRow, { backgroundColor: theme.card, borderColor: trendColor + "40" }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{ex.name}</Text>
                    <Text style={{ color: trendColor, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {target.suggestedSets != null && target.suggestedReps != null
                        ? `${t("workouts.target")}: ${target.suggestedSets}×${target.suggestedReps}${target.suggestedWeightKg ? ` @ ${target.suggestedWeightKg}kg` : ""}`
                        : t("workouts.sameAsBefore")}
                    </Text>
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: trendColor + "20" }]}>
                    <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{trendLabels[target.trend] ?? target.trend}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {/* Save as Template */}
        {activityType === "gym" && !templateSaved && !showSaveTemplate && (
          <Pressable
            onPress={() => { setShowSaveTemplate(true); setSavedTemplateName(workoutName || ""); }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 }}
          >
            <Feather name="bookmark" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.saveAsTemplate")}</Text>
          </Pressable>
        )}
        {activityType === "gym" && showSaveTemplate && (
          <View style={{ width: "100%", paddingHorizontal: 20, gap: 8 }}>
            <TextInput
              value={savedTemplateName}
              onChangeText={setSavedTemplateName}
              placeholder={t("workouts.templateName")}
              placeholderTextColor={theme.textMuted}
              style={{
                borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                color: theme.text, borderColor: theme.border, backgroundColor: theme.card,
                fontFamily: "Inter_400Regular", fontSize: 15,
              }}
            />
            <Button
              title={saveTemplateMutation.isPending ? t("workouts.saving") : t("workouts.saveTemplate")}
              onPress={() => saveTemplateMutation.mutate(savedTemplateName)}
              style={{ backgroundColor: theme.secondary }}
            />
          </View>
        )}
        {templateSaved && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 20 }}>
            <Feather name="check-circle" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.templateSaved")}</Text>
          </View>
        )}
        <Button title={t("workouts.goToDashboard")} onPress={() => router.replace("/(tabs)")} style={{ marginHorizontal: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", maxWidth: 600, width: "100%", alignSelf: "center" }}>
          <Pressable onPress={() => step === "form" ? setStep("select") : router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {step === "select" ? t("workouts.chooseActivity") : t("workouts.logWorkout")}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32, maxWidth: 600, width: "100%", alignSelf: "center" }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === "select" ? (
          <View style={styles.grid}>
            {ACTIVITY_TYPES.map((act) => (
              <Pressable
                key={act.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActivityType(act.id);
                  setStep("form");
                }}
                style={({ pressed }) => [
                  styles.actCard,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.actIcon, { backgroundColor: (theme as any)[act.color] + "20" }]}>
                  <Feather name={act.icon} size={28} color={(theme as any)[act.color]} />
                </View>
                <Text style={[styles.actLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t(act.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.form}>
            {/* Date — auto-filled silently, hidden from UI */}
            
            {/* Name (optional, gym required) */}
            {activityType === "gym" && (
              <Input label={t("workouts.workoutName")} value={workoutName} onChangeText={setWorkoutName} placeholder={t("workouts.gymNameExample")} />
            )}
            {activityType === "other" && (
              <Input label={t("workouts.activityName")} value={workoutName} onChangeText={setWorkoutName} placeholder={t("workouts.activityNameExample")} />
            )}
            
            {/* Duration */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.duration")}</Text>
              <View style={styles.durationRow}>
                <View style={{ flex: 1 }}>
                  <Input value={durationH} onChangeText={setDurationH} placeholder="0" keyboardType="numeric" />
                  <Text style={[styles.durationUnit, { color: theme.textMuted }]}>{t("workouts.hours")}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Input value={durationM} onChangeText={setDurationM} placeholder="45" keyboardType="numeric" />
                  <Text style={[styles.durationUnit, { color: theme.textMuted }]}>{t("workouts.minutes")}</Text>
                </View>
              </View>
            </View>
            
            {/* Cardio sub-type selector */}
            {activityType === "cardio" && (
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.cardioType")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
                    {CARDIO_SUB_TYPES.map((sub) => (
                      <Pressable
                        key={sub.id}
                        onPress={() => setCardioSubType(cardioSubType === sub.id ? "" : sub.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: cardioSubType === sub.id ? theme.primaryDim : theme.card,
                            borderColor: cardioSubType === sub.id ? theme.primary : theme.border,
                            flexDirection: "row", alignItems: "center", gap: 6,
                          },
                        ]}
                      >
                        <Feather name={sub.icon} size={14} color={cardioSubType === sub.id ? theme.primary : theme.textMuted} />
                        <Text style={{
                          color: cardioSubType === sub.id ? theme.primary : theme.textMuted,
                          fontFamily: "Inter_500Medium", fontSize: 13,
                        }}>{t(sub.labelKey)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Distance */}
            {activityType === "cardio" && cardioSubType && (
              <Input
                label={cardioSubType === "swimming" ? t("workouts.distanceMeters") : t("workouts.distanceKm")}
                value={distanceKm}
                onChangeText={setDistanceKm}
                placeholder={cardioSubType === "swimming" ? "1000" : "5.0"}
                keyboardType="decimal-pad"
              />
            )}
            
            {/* Activity specific fields */}
            {activityType === "cardio" && cardioSubType === "cycling" && (
              <>
                <ChipGroup
                  label={t("workouts.routeType")}
                  options={[
                    { value: "Road", label: t("workouts.optRoad") },
                    { value: "Mountain", label: t("workouts.optMountain") },
                    { value: "Stationary", label: t("workouts.optStationary") },
                    { value: "Trail", label: t("workouts.optTrail") },
                  ]}
                  selected={routeType}
                  onSelect={setRouteType}
                  theme={theme}
                />
                <ChipGroup
                  label={t("workouts.intensity")}
                  options={[
                    { value: "Easy", label: t("workouts.rpeEasy") },
                    { value: "Moderate", label: t("workouts.rpeModerate") },
                    { value: "Hard", label: t("workouts.rpeHard") },
                  ]}
                  selected={intensity}
                  onSelect={setIntensity}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "cardio" && cardioSubType === "running" && (
              <>
                <ChipGroup
                  label={t("workouts.terrainLabel")}
                  options={[
                    { value: "Road", label: t("workouts.optRoad") },
                    { value: "Trail", label: t("workouts.optTrail") },
                    { value: "Treadmill", label: t("workouts.optTreadmill") },
                    { value: "Track", label: t("workouts.optTrack") },
                  ]}
                  selected={terrain}
                  onSelect={setTerrain}
                  theme={theme}
                />
                <ChipGroup
                  label={t("workouts.intensity")}
                  options={[
                    { value: "Easy", label: t("workouts.rpeEasy") },
                    { value: "Moderate", label: t("workouts.rpeModerate") },
                    { value: "Hard", label: t("workouts.rpeHard") },
                    { value: "Intervals", label: t("workouts.optIntervals") },
                  ]}
                  selected={intensity}
                  onSelect={setIntensity}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "cardio" && cardioSubType === "walking" && (
              <>
                <Input label={t("workouts.stepsOptional")} value={steps} onChangeText={setSteps} placeholder="8000" keyboardType="numeric" />
                <ChipGroup
                  label={t("workouts.terrainLabel")}
                  options={[
                    { value: "Flat", label: t("workouts.optFlat") },
                    { value: "Hilly", label: t("workouts.optHilly") },
                    { value: "Treadmill", label: t("workouts.optTreadmill") },
                  ]}
                  selected={terrain}
                  onSelect={setTerrain}
                  theme={theme}
                />
                <ChipGroup
                  label={t("workouts.intensity")}
                  options={[
                    { value: "Light", label: t("workouts.optLight") },
                    { value: "Moderate", label: t("workouts.rpeModerate") },
                    { value: "Brisk", label: t("workouts.optBrisk") },
                  ]}
                  selected={intensity}
                  onSelect={setIntensity}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "cardio" && cardioSubType === "swimming" && (
              <>
                <Input label={t("workouts.lapsLabel")} value={laps} onChangeText={setLaps} placeholder="20" keyboardType="numeric" />
                <ChipGroup
                  label={t("workouts.strokeLabel")}
                  options={[
                    { value: "Freestyle", label: t("workouts.optFreestyle") },
                    { value: "Backstroke", label: t("workouts.optBackstroke") },
                    { value: "Breaststroke", label: t("workouts.optBreaststroke") },
                    { value: "Butterfly", label: t("workouts.optButterfly") },
                    { value: "Mixed", label: t("workouts.optMixed") },
                  ]}
                  selected={strokeType}
                  onSelect={setStrokeType}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "other" && (
              <Input label={t("workouts.caloriesBurnedLabel")} value={caloriesBurned} onChangeText={setCaloriesBurned} placeholder="250" keyboardType="numeric" />
            )}
            
            {/* Gym Exercises */}
            {activityType === "gym" && (
              <View style={styles.exercisesSection}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.exercisesLabel")}</Text>
                {exercises.map((ex, exIdx) => (
                  <Card key={exIdx} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={[styles.exerciseNum, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                        {t("workouts.exerciseN", { n: exIdx + 1 })}
                      </Text>
                      {exercises.length > 1 && (
                        <Pressable
                          hitSlop={10}
                          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                          onPress={() => {
                          const newEx = [...exercises];
                          newEx.splice(exIdx, 1);
                          setExercises(newEx);
                        }}>
                          <Feather name="x" size={18} color={theme.danger} />
                        </Pressable>
                      )}
                    </View>
                    
                    <TextInput
                      value={ex.name}
                      onChangeText={(t) => {
                        const newEx = [...exercises];
                        newEx[exIdx].name = t;
                        setExercises(newEx);
                      }}
                      onBlur={() => {
                        const canonical = normalizeExerciseName(ex.name);
                        if (canonical !== ex.name) {
                          const newEx = [...exercises];
                          newEx[exIdx].name = canonical;
                          newEx[exIdx].autoFilled = false;
                          setExercises(newEx);
                        }
                      }}
                      placeholder={t("workouts.exerciseNamePlaceholder")}
                      placeholderTextColor={theme.textMuted}
                      style={[styles.exerciseInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular" }]}
                    />

                    {/* Autocomplete — ranked: starts-with first, then contains */}
                    {ex.name.length > 1 && (() => {
                      const q = ex.name.toLowerCase();
                      const hits = EXERCISES.filter(e => {
                        const en = e.name.toLowerCase();
                        return en !== q && en.includes(q);
                      }).sort((a, b) => {
                        const aS = a.name.toLowerCase().startsWith(q) ? 0 : 1;
                        const bS = b.name.toLowerCase().startsWith(q) ? 0 : 1;
                        return aS - bS;
                      }).slice(0, 6);
                      if (hits.length === 0) return null;
                      return (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {hits.map(s => (
                              <Pressable
                                key={s.id}
                                onPress={() => {
                                  const newEx = [...exercises];
                                  newEx[exIdx].name = s.name;
                                  newEx[exIdx].autoFilled = false;
                                  setExercises(newEx);
                                }}
                                style={[styles.suggestion, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "60" }]}
                              >
                                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{s.name}</Text>
                                <Text style={{ color: theme.primary + "90", fontFamily: "Inter_400Regular", fontSize: 10 }}>{s.primaryMuscle}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                      );
                    })()}

                    {/* Previous performance + progression target */}
                    {ex.name.length > 2 && exerciseHistoryMap[ex.name] != null && (() => {
                      const sessions = exerciseHistoryMap[ex.name] ?? [];
                      const target = calculateStrengthTarget(sessions);
                      if (target.trend === "first") return null;
                      const trendColors: Record<string, string> = { progress: theme.primary, maintain: theme.secondary, deload: theme.warning };
                      const trendColor = trendColors[target.trend] ?? theme.textMuted;
                      return (
                        <View style={[styles.progressionBadge, { backgroundColor: trendColor + "15", borderColor: trendColor + "40" }]}>
                          <Feather name="trending-up" size={12} color={trendColor} />
                          <View style={{ flex: 1 }}>
                            {target.previousDisplay && (
                              <Text style={[styles.progressionBadgeText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                                {t("workouts.last")}: {target.previousDisplay}
                              </Text>
                            )}
                            <Text style={[styles.progressionBadgeTarget, { color: trendColor, fontFamily: "Inter_600SemiBold" }]}>
                              {t("workouts.target")}: {target.suggestedSets != null && target.suggestedReps != null
                                ? `${target.suggestedSets}×${target.suggestedReps}${target.suggestedWeightKg ? ` @ ${target.suggestedWeightKg}kg` : ""}`
                                : target.suggestedReps != null ? `${target.suggestedReps} ${t("workouts.reps")}` : t("workouts.sameAsBefore")}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                    
                    {/* Sets */}
                    <View style={styles.setsHeader}>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 1 }]}>{t("workouts.setLabel")}</Text>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 2 }]}>{t("workouts.reps")}</Text>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 2 }]}>{t("workouts.weightKgLabel")}</Text>
                      <View style={{ width: 24 }} />
                    </View>
                    
                    {ex.sets.map((s, setIdx) => (
                      <View key={setIdx} style={styles.setRow}>
                        <Text style={[styles.setNum, { color: theme.primary, fontFamily: "Inter_600SemiBold", flex: 1 }]}>{setIdx + 1}</Text>
                        <TextInput
                          value={s.reps}
                          onChangeText={(t) => {
                            const newEx = [...exercises];
                            newEx[exIdx].sets[setIdx].reps = t;
                            setExercises(newEx);
                          }}
                          placeholder="12"
                          keyboardType="numeric"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.setInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular", flex: 2 }]}
                        />
                        <TextInput
                          value={s.weight}
                          onChangeText={(t) => {
                            const newEx = [...exercises];
                            newEx[exIdx].sets[setIdx].weight = t;
                            setExercises(newEx);
                          }}
                          placeholder="60"
                          keyboardType="decimal-pad"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.setInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular", flex: 2 }]}
                        />
                        <Pressable
                          hitSlop={10}
                          style={{ width: 32, height: 44, alignItems: "center", justifyContent: "center" }}
                          onPress={() => {
                          if (ex.sets.length > 1) {
                            const newEx = [...exercises];
                            newEx[exIdx].sets.splice(setIdx, 1);
                            setExercises(newEx);
                          }
                        }}>
                          <Feather name="x" size={16} color={ex.sets.length > 1 ? theme.danger : theme.border} />
                        </Pressable>
                      </View>
                    ))}
                    
                    <Pressable
                      onPress={() => {
                        const newEx = [...exercises];
                        const last = newEx[exIdx].sets[newEx[exIdx].sets.length - 1];
                        newEx[exIdx].sets.push({ reps: last.reps, weight: last.weight });
                        setExercises(newEx);
                      }}
                      style={[styles.addSetBtn, { borderColor: theme.primary }]}
                    >
                      <Feather name="plus" size={14} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t("workouts.addSet")}</Text>
                    </Pressable>

                    {/* RPE Selector */}
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6 }]}>
                        {t("workouts.effortLevel")}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {RPE_VALUES.map((rpeVal, rpeIdx) => {
                          const selected = ex.rpe === rpeVal;
                          return (
                            <Pressable
                              key={rpeVal}
                              onPress={() => {
                                const newEx = [...exercises];
                                newEx[exIdx].rpe = selected ? undefined : rpeVal;
                                setExercises(newEx);
                              }}
                              style={[
                                styles.rpeChip,
                                {
                                  backgroundColor: selected ? theme.primary + "20" : theme.card,
                                  borderColor: selected ? theme.primary : theme.border,
                                  flex: 1,
                                },
                              ]}
                            >
                              <Feather name={RPE_ICONS[rpeIdx]} size={14} color={selected ? theme.primary : RPE_COLORS[rpeIdx]} />
                              <Text style={{ color: selected ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center" }}>
                                {t(RPE_LABEL_KEYS[rpeIdx])}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </Card>
                ))}
                
                <Pressable
                  onPress={() => setExercises([...exercises, { name: "", sets: defaultSets() }])}
                  style={[styles.addExBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <Feather name="plus" size={18} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium" }}>{t("workouts.addExercise")}</Text>
                </Pressable>
              </View>
            )}
            
            {/* Mood */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.mood")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.moodRow}>
                  {MOOD_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setMood(opt.value)}
                      style={[
                        styles.moodChip,
                        {
                          backgroundColor: mood === opt.value ? theme.primaryDim : theme.card,
                          borderColor: mood === opt.value ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Feather name={opt.icon as keyof typeof Feather.glyphMap} size={18} color={mood === opt.value ? theme.primary : theme.textMuted} />
                      <Text style={[
                        styles.moodLabel,
                        { color: mood === opt.value ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium" },
                      ]}>{t(opt.labelKey)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {error ? (
              <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13 }}>{error}</Text>
            ) : null}
            
            <Button title={t("workouts.saveWorkout")} onPress={handleSubmit} loading={mutation.isPending} />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ChipGroup({ label, options, selected, onSelect, theme }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  theme: any;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
          {options.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(selected === opt.value ? "" : opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected === opt.value ? theme.primaryDim : theme.card,
                  borderColor: selected === opt.value ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={{
                color: selected === opt.value ? theme.primary : theme.textMuted,
                fontFamily: "Inter_500Medium", fontSize: 13,
              }}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actCard: {
    width: "47%", padding: 16, borderRadius: 16, borderWidth: 1, gap: 10,
    alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  actIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actLabel: { fontSize: 14 },
  form: { gap: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  durationRow: { flexDirection: "row", gap: 12 },
  durationUnit: { fontSize: 11, marginTop: 4, textAlign: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, borderWidth: 1.5, minHeight: 44, justifyContent: "center" },
  moodRow: { flexDirection: "row", gap: 8 },
  moodChip: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", gap: 4, minHeight: 52,
  },
  moodLabel: { fontSize: 11 },
  notesInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 80,
    textAlignVertical: "top", fontSize: 15,
  },
  exercisesSection: { gap: 12 },
  exerciseCard: { gap: 10 },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseNum: { fontSize: 14 },
  exerciseInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 48,
  },
  suggestions: { marginTop: 4 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 2 },
  setsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  setLabel: { fontSize: 12 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setNum: { fontSize: 14, textAlign: "center" },
  setInput: {
    borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, textAlign: "center", minHeight: 44,
  },
  addSetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", minHeight: 44,
  },
  addExBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 32 },
  successProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressionBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  progressionBadgeText: { fontSize: 11 },
  progressionBadgeTarget: { fontSize: 12 },
  rpeChip: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    minHeight: 52,
    justifyContent: "center",
  },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
  successSub: { fontSize: 15 },
});
