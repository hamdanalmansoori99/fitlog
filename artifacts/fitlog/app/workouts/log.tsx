import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SuccessView } from "@/components/SuccessView";

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

const GYM_EXERCISES = [
  "Bench Press", "Squat", "Deadlift", "Bicep Curl", "Lat Pulldown",
  "Shoulder Press", "Leg Press", "Dumbbell Row", "Lunges", "Tricep Pushdown",
  "Pull-Up", "Push-Up", "Cable Fly", "Incline Press", "Romanian Deadlift",
  "Hip Thrust", "Leg Curl", "Leg Extension", "Calf Raise", "Face Pull",
  "Lateral Raise", "Front Raise", "Rear Delt Fly", "Barbell Row", "T-Bar Row",
  "Preacher Curl", "Hammer Curl", "Skull Crusher", "Dips", "Chest Fly",
];

interface GymExercise {
  name: string;
  sets: { reps: string; weight: string }[];
}

export default function LogWorkoutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
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
  const [exerciseSearch, setExerciseSearch] = useState<string[]>([""]); 
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  
  const mutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      setSuccess(true);
      setTimeout(() => {
        router.replace("/(tabs)/workouts");
      }, 2000);
    },
    onError: (err: any) => setError(err.message),
  });
  
  const handleSubmit = () => {
    const durationMinutes = parseInt(durationH) * 60 + parseInt(durationM || "0");
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
          sets: e.sets.map((s, j) => ({
            reps: parseInt(s.reps) || undefined,
            weightKg: parseFloat(s.weight) || undefined,
            order: j,
          })),
        }))
      : [];
    
    mutation.mutate({
      activityType,
      name: workoutName || undefined,
      date: new Date(date + "T" + new Date().toTimeString().slice(0, 5)).toISOString(),
      durationMinutes: durationMinutes || undefined,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      caloriesBurned: estimatedCals,
      mood: mood || undefined,
      notes: notes || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      exercises: gymExercises,
    });
  };
  
  if (success) {
    const activityLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.label || "workout";
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <SuccessView
          title="Workout Logged!"
          subtitle={`${activityLabel} recorded. Keep up the great work!`}
        />
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
          {step === "select" ? "Choose Activity" : "Log Workout"}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
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
            <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            
            {/* Name (optional, gym required) */}
            {activityType === "gym" && (
              <Input label="Workout Name" value={workoutName} onChangeText={setWorkoutName} placeholder="e.g. Push Day" />
            )}
            {activityType === "other" && (
              <Input label="Activity Name" value={workoutName} onChangeText={setWorkoutName} placeholder="e.g. Rock Climbing" />
            )}
            
            {/* Duration */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Duration</Text>
              <View style={styles.durationRow}>
                <View style={{ flex: 1 }}>
                  <Input value={durationH} onChangeText={setDurationH} placeholder="0" keyboardType="numeric" />
                  <Text style={[styles.durationUnit, { color: theme.textMuted }]}>hours</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Input value={durationM} onChangeText={setDurationM} placeholder="45" keyboardType="numeric" />
                  <Text style={[styles.durationUnit, { color: theme.textMuted }]}>minutes</Text>
                </View>
              </View>
            </View>
            
            {/* Distance */}
            {["cycling", "running", "walking", "swimming"].includes(activityType) && (
              <Input
                label={activityType === "swimming" ? "Distance (meters)" : "Distance (km)"}
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
                  label="Route Type"
                  options={["Road", "Mountain", "Stationary", "Trail"]}
                  selected={routeType}
                  onSelect={setRouteType}
                  theme={theme}
                />
                <ChipGroup
                  label="Intensity"
                  options={["Easy", "Moderate", "Hard"]}
                  selected={intensity}
                  onSelect={setIntensity}
                  theme={theme}
                />
              </>
            )}
            
            {activityType === "running" && (
              <>
                <ChipGroup label="Terrain" options={["Road", "Trail", "Treadmill", "Track"]} selected={terrain} onSelect={setTerrain} theme={theme} />
                <ChipGroup label="Intensity" options={["Easy", "Moderate", "Hard", "Intervals"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "walking" && (
              <>
                <Input label="Steps (optional)" value={steps} onChangeText={setSteps} placeholder="8000" keyboardType="numeric" />
                <ChipGroup label="Terrain" options={["Flat", "Hilly", "Treadmill"]} selected={terrain} onSelect={setTerrain} theme={theme} />
                <ChipGroup label="Intensity" options={["Light", "Moderate", "Brisk"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "tennis" && (
              <>
                <ChipGroup label="Match Type" options={["Singles", "Doubles"]} selected={matchType} onSelect={setMatchType} theme={theme} />
                <Input label="Sets Played" value={setsPlayed} onChangeText={setSetsPlayed} placeholder="3" keyboardType="numeric" />
                <ChipGroup label="Result" options={["Won", "Lost", "Practice"]} selected={result} onSelect={setResult} theme={theme} />
                <ChipGroup label="Intensity" options={["Easy", "Moderate", "Hard"]} selected={intensity} onSelect={setIntensity} theme={theme} />
              </>
            )}
            
            {activityType === "swimming" && (
              <>
                <Input label="Laps" value={laps} onChangeText={setLaps} placeholder="20" keyboardType="numeric" />
                <ChipGroup label="Stroke" options={["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Mixed"]} selected={strokeType} onSelect={setStrokeType} theme={theme} />
              </>
            )}
            
            {activityType === "yoga" && (
              <ChipGroup label="Type" options={["Vinyasa", "Hatha", "Yin", "Power", "Stretching", "Other"]} selected={yogaType} onSelect={setYogaType} theme={theme} />
            )}
            
            {activityType === "other" && (
              <Input label="Calories Burned" value={caloriesBurned} onChangeText={setCaloriesBurned} placeholder="250" keyboardType="numeric" />
            )}
            
            {/* Gym Exercises */}
            {activityType === "gym" && (
              <View style={styles.exercisesSection}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Exercises</Text>
                {exercises.map((ex, exIdx) => (
                  <Card key={exIdx} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={[styles.exerciseNum, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                        Exercise {exIdx + 1}
                      </Text>
                      {exercises.length > 1 && (
                        <Pressable onPress={() => {
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
                      placeholder="Exercise name..."
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
                    
                    {/* Sets */}
                    <View style={styles.setsHeader}>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 1 }]}>Set</Text>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 2 }]}>Reps</Text>
                      <Text style={[styles.setLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular", flex: 2 }]}>Weight (kg)</Text>
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
                        <Pressable onPress={() => {
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
                      <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>Add Set</Text>
                    </Pressable>
                  </Card>
                ))}
                
                <Pressable
                  onPress={() => setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }])}
                  style={[styles.addExBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <Feather name="plus" size={18} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium" }}>Add Exercise</Text>
                </Pressable>
              </View>
            )}
            
            {/* Mood */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Mood</Text>
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
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="How did it feel?"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.notesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_400Regular" }]}
              />
            </View>
            
            {error ? (
              <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13 }}>{error}</Text>
            ) : null}
            
            <Button title="Save Workout" onPress={handleSubmit} loading={mutation.isPending} />
          </View>
        )}
      </ScrollView>
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
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  durationRow: { flexDirection: "row", gap: 12 },
  durationUnit: { fontSize: 11, marginTop: 4, textAlign: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  moodRow: { flexDirection: "row", gap: 8 },
  moodChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", gap: 4,
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
    borderWidth: 1.5, borderRadius: 10, padding: 10, fontSize: 14,
  },
  suggestions: { marginTop: 4 },
  suggestion: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
  setsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  setLabel: { fontSize: 12 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setNum: { fontSize: 14, textAlign: "center" },
  setInput: {
    borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, textAlign: "center",
  },
  addSetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
  },
  addExBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
  successSub: { fontSize: 15 },
});
