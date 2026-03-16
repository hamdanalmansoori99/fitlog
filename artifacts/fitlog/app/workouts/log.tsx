import React, { useState, useMemo, useEffect } from "react";
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
import { EXERCISES } from "@/lib/exerciseLibrary";

const ACTIVITY_TYPES = [
  { id: "cycling", label: "Cycling", icon: "wind" as const, color: "secondary" },
  { id: "running", label: "Running", icon: "activity" as const, color: "primary" },
  { id: "walking", label: "Walking", icon: "navigation" as const, color: "cyan" },
  { id: "gym", label: "Gym / Weights", icon: "zap" as const, color: "purple" },
  { id: "swimming", label: "Swimming", icon: "droplet" as const, color: "secondary" },
  { id: "tennis", label: "Tennis", icon: "circle" as const, color: "warning" },
  { id: "yoga", label: "Yoga", icon: "heart" as const, color: "pink" },
  { id: "other", label: "Other", icon: "more-horizontal" as const, color: "textMuted" },
];

const MOODS = ["Exhausted", "Tough", "Good", "Great", "Crushing it"];
const MOOD_ICONS = ["😴", "😤", "🙂", "😁", "🔥"];

const GYM_EXERCISES = EXERCISES.map((e) => e.name);

const RPE_LABELS = ["Very Easy", "Easy", "Moderate", "Hard", "Max Effort"];
const RPE_VALUES = [2, 4, 6, 8, 10];
const RPE_EMOJIS = ["🟢", "🟡", "🟠", "🔴", "🔥"];

interface GymExercise {
  name: string;
  sets: { reps: string; weight: string }[];
  rpe?: number;
}

export default function LogWorkoutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const params = useLocalSearchParams<{ prefillType?: string; prefillExercises?: string; prefillName?: string }>();

  const [step, setStep] = useState<"select" | "form">("select");
  const [activityType, setActivityType] = useState("");
  
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
  const [yogaType, setYogaType] = useState("");
  const [setsPlayed, setSetsPlayed] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [laps, setLaps] = useState("");
  
  // Gym exercises
  const [exercises, setExercises] = useState<GymExercise[]>([
    { name: "", sets: [{ reps: "", weight: "" }] },
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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  
  const mutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setSuccess(true);
    },
    onError: (err: any) => setError(err.message),
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
      setActivityType(params.prefillType);
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
          setExerciseSearch(parsed.map(() => ""));
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
    if (yogaType) metadata.yogaType = yogaType;
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
        swimming: 8, tennis: 7, yoga: 3, other: 5,
      };
      const met = mets[activityType] || 5;
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

    mutation.mutate({
      activityType,
      name: workoutName || undefined,
      date: new Date(date + "T" + new Date().toTimeString().slice(0, 5)).toISOString(),
      durationMinutes: durationMinutes || undefined,
      distanceKm: parsedDistance,
      caloriesBurned: estimatedCals,
      mood: mood || undefined,
      notes: notes || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      exercises: gymExercises,
    });
  };
  
  if (success) {
    const activityLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.label || "workout";
    const completedExercises = exercises.filter(e => e.name && e.sets.some(s => s.reps || s.weight));
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <SuccessView
          title={t("workouts.workoutLogged")}
          subtitle={t("workouts.recordedKeepUp", { activity: activityLabel })}
        />
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
        <Pressable onPress={() => step === "form" ? setStep("select") : router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {step === "select" ? t("workouts.chooseActivity") : t("workouts.logWorkout")}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
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
                  {act.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.form}>
            {/* Date */}
            <Input label={t("workouts.date")} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            
            {/* Name (optional, gym required) */}
            {activityType === "gym" && (
              <Input label={t("workouts.workoutName")} value={workoutName} onChangeText={setWorkoutName} placeholder="e.g. Push Day" />
            )}
            {activityType === "other" && (
              <Input label={t("workouts.activityName")} value={workoutName} onChangeText={setWorkoutName} placeholder="e.g. Rock Climbing" />
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
            
            {/* Distance */}
            {["cycling", "running", "walking", "swimming"].includes(activityType) && (
              <Input
                label={activityType === "swimming" ? t("workouts.distanceMeters") : t("workouts.distanceKm")}
                value={distanceKm}
                onChangeText={setDistanceKm}
                placeholder={activityType === "swimming" ? "1000" : "5.0"}
                keyboardType="decimal-pad"
              />
            )}
            
            {/* Activity specific fields */}
            {activityType === "cycling" && (
              <>
                <ChipGroup
                  label={t("workouts.routeType")}
                  options={["Road", "Mountain", "Stationary", "Trail"]}
                  selected={routeType}
                  onSelect={setRouteType}
                  theme={theme}
                />
                <ChipGroup
                  label={t("workouts.intensity")}
                  options={["Easy", "Moderate", "Hard"]}
                  selected={intensity}
                  onSelect={setIntensity}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "running" && (
              <>
                <ChipGroup label={t("workouts.terrainLabel")} options={["Road", "Trail", "Treadmill", "Track"]} selected={terrain} onSelect={setTerrain} theme={theme} />
                <ChipGroup label={t("workouts.intensity")} options={["Easy", "Moderate", "Hard", "Intervals"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "walking" && (
              <>
                <Input label={t("workouts.stepsOptional")} value={steps} onChangeText={setSteps} placeholder="8000" keyboardType="numeric" />
                <ChipGroup label={t("workouts.terrainLabel")} options={["Flat", "Hilly", "Treadmill"]} selected={terrain} onSelect={setTerrain} theme={theme} />
                <ChipGroup label={t("workouts.intensity")} options={["Light", "Moderate", "Brisk"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "tennis" && (
              <>
                <ChipGroup label={t("workouts.matchType")} options={["Singles", "Doubles"]} selected={matchType} onSelect={setMatchType} theme={theme} />
                <Input label={t("workouts.setsPlayed")} value={setsPlayed} onChangeText={setSetsPlayed} placeholder="3" keyboardType="numeric" />
                <ChipGroup label={t("workouts.resultLabel")} options={["Won", "Lost", "Practice"]} selected={result} onSelect={setResult} theme={theme} />
                <ChipGroup label={t("workouts.intensity")} options={["Easy", "Moderate", "Hard"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "swimming" && (
              <>
                <Input label={t("workouts.lapsLabel")} value={laps} onChangeText={setLaps} placeholder="20" keyboardType="numeric" />
                <ChipGroup label={t("workouts.strokeLabel")} options={["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Mixed"]} selected={strokeType} onSelect={setStrokeType} theme={theme} />
              </>
            )}
            
            {activityType === "yoga" && (
              <ChipGroup label={t("workouts.typeLabel")} options={["Vinyasa", "Hatha", "Yin", "Power", "Stretching", "Other"]} selected={yogaType} onSelect={setYogaType} theme={theme} />
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
                      placeholder={t("workouts.exerciseNamePlaceholder")}
                      placeholderTextColor={theme.textMuted}
                      style={[styles.exerciseInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular" }]}
                    />
                    
                    {/* Autocomplete */}
                    {ex.name.length > 1 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
                        {GYM_EXERCISES.filter(e => e.toLowerCase().includes(ex.name.toLowerCase()) && e !== ex.name).slice(0, 5).map(suggestion => (
                          <Pressable
                            key={suggestion}
                            onPress={() => {
                              const newEx = [...exercises];
                              newEx[exIdx].name = suggestion;
                              setExercises(newEx);
                            }}
                            style={[styles.suggestion, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
                          >
                            <Text style={{ color: theme.primary, fontFamily: "Inter_400Regular", fontSize: 12 }}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}

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
                        newEx[exIdx].sets.push({ reps: "", weight: "" });
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
                              <Text style={{ fontSize: 14 }}>{RPE_EMOJIS[rpeIdx]}</Text>
                              <Text style={{ color: selected ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center" }}>
                                {RPE_LABELS[rpeIdx]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </Card>
                ))}
                
                <Pressable
                  onPress={() => setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }])}
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
                  {MOODS.map((m, i) => (
                    <Pressable
                      key={m}
                      onPress={() => setMood(m)}
                      style={[
                        styles.moodChip,
                        {
                          backgroundColor: mood === m ? theme.primaryDim : theme.card,
                          borderColor: mood === m ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{MOOD_ICONS[i]}</Text>
                      <Text style={[
                        styles.moodLabel,
                        { color: mood === m ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium" },
                      ]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {/* Notes */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.notesOptional")}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t("workouts.notesPlaceholder")}
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.notesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_400Regular" }]}
              />
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
  label: string; options: string[]; selected: string; onSelect: (v: string) => void; theme: any;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
          {options.map(opt => (
            <Pressable
              key={opt}
              onPress={() => onSelect(selected === opt ? "" : opt)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected === opt ? theme.primaryDim : theme.card,
                  borderColor: selected === opt ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={{
                color: selected === opt ? theme.primary : theme.textMuted,
                fontFamily: "Inter_500Medium", fontSize: 13,
              }}>{opt}</Text>
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
  content: { padding: 20, gap: 16 },
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
  suggestion: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, marginRight: 6 },
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
