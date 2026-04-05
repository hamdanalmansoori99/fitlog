import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const ACTIVITY_TYPES = [
  { id: "cycling", labelKey: "workouts.activityLabelCycling", icon: "wind" as const },
  { id: "running", labelKey: "workouts.activityLabelRunning", icon: "activity" as const },
  { id: "walking", labelKey: "workouts.activityLabelWalking", icon: "navigation" as const },
  { id: "gym", labelKey: "workouts.activityLabelGym", icon: "zap" as const },
  { id: "swimming", labelKey: "workouts.activityLabelSwimming", icon: "droplet" as const },
  { id: "tennis", labelKey: "workouts.activityLabelTennis", icon: "circle" as const },
  { id: "yoga", labelKey: "workouts.activityLabelYoga", icon: "heart" as const },
  { id: "other", labelKey: "workouts.activityLabelOther", icon: "more-horizontal" as const },
];

const MOOD_ICONS: { icon: string; label: string; labelKey: string }[] = [
  { icon: "moon", label: "Exhausted", labelKey: "workouts.moodExhausted" },
  { icon: "frown", label: "Tough", labelKey: "workouts.moodTough" },
  { icon: "meh", label: "Good", labelKey: "workouts.moodGood" },
  { icon: "smile", label: "Great", labelKey: "workouts.moodGreat" },
  { icon: "zap", label: "Crushing it", labelKey: "workouts.moodCrushingIt" },
];

export default function EditWorkoutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = parseInt(id || "0");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [name, setName] = useState("");
  const [activityType, setActivityType] = useState("gym");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const { data: workout, isLoading, isError, refetch } = useQuery({
    queryKey: ["workout", id],
    queryFn: () => api.getWorkout(workoutId),
    enabled: workoutId > 0 && !prefilled,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!workout || prefilled) return;
    setName(workout.name || "");
    setActivityType(workout.activityType || "gym");
    setDate(workout.date ? new Date(workout.date).toISOString().split("T")[0] : "");
    setDuration(workout.durationMinutes != null ? String(workout.durationMinutes) : "");
    setDistance(workout.distanceKm != null ? String(workout.distanceKm) : "");
    setCalories(workout.caloriesBurned != null ? String(workout.caloriesBurned) : "");
    setMood(workout.mood != null ? workout.mood : null);
    setNotes(workout.notes || "");
    setPrefilled(true);
  }, [workout, prefilled]);

  const mutation = useMutation({
    mutationFn: (body: any) => api.updateWorkout(workoutId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", id] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      showToast(t("workouts.workoutUpdated"), "success");
      router.back();
    },
    onError: () => setError(t("workouts.failedToSave")),
  });

  const handleSave = () => {
    setError("");
    if (!name.trim()) { setError(t("workouts.workoutNameRequired")); return; }
    if (!date.trim()) { setError(t("workouts.dateRequired")); return; }
    if (duration) {
      const d = parseFloat(duration);
      if (isNaN(d) || d < 1 || d > 600) { setError(t("workouts.durationValidation")); return; }
    }
    if (distance) {
      const d = parseFloat(distance);
      if (isNaN(d) || d < 0 || d > 1000) { setError(t("workouts.distanceValidation")); return; }
    }
    if (calories) {
      const c = parseFloat(calories);
      if (isNaN(c) || c < 0 || c > 5000) { setError(t("workouts.caloriesValidation")); return; }
    }
    mutation.mutate({
      name: name.trim(),
      activityType,
      date: new Date(date + "T12:00:00").toISOString(),
      durationMinutes: duration ? parseFloat(duration) : undefined,
      distanceKm: distance ? parseFloat(distance) : undefined,
      caloriesBurned: calories ? parseFloat(calories) : undefined,
      mood: mood ?? undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (isLoading && !prefilled) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.editWorkout")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ height: 52, borderRadius: 12, backgroundColor: theme.card }} />
          ))}
        </View>
      </View>
    );
  }

  if (isError || !workoutId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={40} color={theme.danger} />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 8 }}>{t("workouts.workoutNotFoundMsg")}</Text>
        {isError && (
          <Pressable onPress={() => refetch()} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.danger + "20" }}>
            <Text style={{ color: theme.danger, fontFamily: "Inter_600SemiBold" }}>{t("common.retry")}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium" }}>{t("workouts.goBackLabel")}</Text>
        </Pressable>
      </View>
    );
  }

  const isDistanceBased = ["running", "cycling", "walking", "swimming"].includes(activityType);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.editWorkout")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36, maxWidth: 600, width: "100%", alignSelf: "center" as const }]}
          keyboardShouldPersistTaps="handled"
        >
          <Input label={t("workouts.workoutName")} value={name} onChangeText={setName} placeholder="Morning Run" />
          <Input
            label={t("workouts.date")}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />

          {/* Activity Type */}
          <View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {t("workouts.activityTypeLabel")}
            </Text>
            <View style={styles.activityGrid}>
              {ACTIVITY_TYPES.map(a => (
                <Pressable
                  key={a.id}
                  onPress={() => { setActivityType(a.id); Haptics.selectionAsync(); }}
                  style={[
                    styles.activityChip,
                    {
                      backgroundColor: activityType === a.id ? theme.primaryDim : theme.card,
                      borderColor: activityType === a.id ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather name={a.icon} size={14} color={activityType === a.id ? theme.primary : theme.textMuted} />
                  <Text style={{ color: activityType === a.id ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    {t(a.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label={t("workouts.durationMin")}
                value={duration}
                onChangeText={setDuration}
                placeholder="45"
                keyboardType="decimal-pad"
              />
            </View>
            {isDistanceBased && (
              <View style={{ flex: 1 }}>
                <Input
                  label={t("workouts.distanceKm")}
                  value={distance}
                  onChangeText={setDistance}
                  placeholder="5.0"
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </View>

          <Input
            label={t("workouts.caloriesBurnedLabel")}
            value={calories}
            onChangeText={setCalories}
            placeholder="320"
            keyboardType="decimal-pad"
          />

          {/* Mood */}
          <View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("workouts.mood")}</Text>
            <View style={styles.moodRow}>
              {MOOD_ICONS.map((m, idx) => (
                <Pressable
                  key={m.label}
                  onPress={() => { setMood(idx === mood ? null : idx); Haptics.selectionAsync(); }}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: mood === idx ? theme.primaryDim : theme.card,
                      borderColor: mood === idx ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Feather name={m.icon as keyof typeof Feather.glyphMap} size={24} color={mood === idx ? theme.primary : theme.textMuted} />
                  <Text style={{ color: mood === idx ? theme.primary : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                    {t(m.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label={t("workouts.notesLabel")}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("workouts.notesPlaceholder")}
            multiline
            numberOfLines={3}
          />

          {error ? (
            <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}

          <Button title={t("workouts.saveChanges")} onPress={handleSave} loading={mutation.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  navBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { flex: 1, fontSize: 17, textAlign: "center" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activityChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  row: { flexDirection: "row", gap: 12 },
  moodRow: { flexDirection: "row", gap: 8 },
  moodChip: {
    flex: 1, alignItems: "center", gap: 4, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
});
