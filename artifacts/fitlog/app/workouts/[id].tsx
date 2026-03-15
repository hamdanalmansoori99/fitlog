import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Alert, ActivityIndicator, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

function getActivityColor(type: string, theme: any) {
  const map: Record<string, string> = {
    cycling: theme.secondary, running: theme.primary, walking: theme.cyan,
    gym: theme.purple, swimming: "#4fc3f7", tennis: theme.warning,
    yoga: theme.pink, other: theme.textMuted,
  };
  return map[type] || theme.primary;
}

function getActivityIcon(type: string): keyof typeof Feather.glyphMap {
  const map: Record<string, keyof typeof Feather.glyphMap> = {
    cycling: "wind", running: "activity", walking: "navigation",
    gym: "zap", swimming: "droplet", tennis: "circle", yoga: "heart",
  };
  return map[type] || "activity";
}

function StatPill({ icon, label, value, color, theme }: {
  icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string; theme: any;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Feather name={icon} size={13} color={color} />
      <View>
        <Text style={[styles.statVal, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      </View>
    </View>
  );
}

function SetRow({ set, idx, theme, useImperial }: { set: any; idx: number; theme: any; useImperial: boolean }) {
  const weightDisplay = set.weightKg != null
    ? useImperial
      ? `${(set.weightKg * 2.20462).toFixed(1)} lbs`
      : `${set.weightKg} kg`
    : null;
  const distDisplay = set.distanceM != null
    ? useImperial
      ? `${(set.distanceM / 1609.34).toFixed(2)} mi`
      : `${(set.distanceM / 1000).toFixed(2)} km`
    : null;
  return (
    <View style={[styles.setRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.setNum, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        {idx + 1}
      </Text>
      {weightDisplay != null && (
        <Text style={[styles.setValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {weightDisplay}
        </Text>
      )}
      {set.reps != null && (
        <Text style={[styles.setValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          × {set.reps}
        </Text>
      )}
      {set.durationSeconds != null && (
        <Text style={[styles.setValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {Math.floor(set.durationSeconds / 60)}:{String(set.durationSeconds % 60).padStart(2, "0")}
        </Text>
      )}
      {distDisplay != null && (
        <Text style={[styles.setValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {distDisplay}
        </Text>
      )}
      {set.rpe != null && (
        <View style={[styles.rpeBadge, { backgroundColor: theme.secondary + "20" }]}>
          <Text style={[{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 11 }]}>
            RPE {set.rpe}
          </Text>
        </View>
      )}
      {set.completed != null && (
        <Feather
          name={set.completed ? "check-circle" : "circle"}
          size={14}
          color={set.completed ? theme.primary : theme.border}
        />
      )}
    </View>
  );
}

function ShareCard({ workout, theme, useImperial }: { workout: any; theme: any; useImperial: boolean }) {
  const color = getActivityColor(workout.activityType, theme);
  const icon = getActivityIcon(workout.activityType);
  const exercises: any[] = workout.exercises || [];
  const dateStr = new Date(workout.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  const stats: { icon: keyof typeof Feather.glyphMap; value: string; label: string }[] = [];
  if (workout.durationMinutes != null) stats.push({ icon: "clock", value: `${workout.durationMinutes}`, label: "min" });
  if (workout.distanceKm != null) {
    const d = useImperial ? (workout.distanceKm * 0.621371).toFixed(1) : workout.distanceKm.toFixed(1);
    stats.push({ icon: "map-pin", value: d, label: useImperial ? "mi" : "km" });
  }
  if (workout.caloriesBurned != null) stats.push({ icon: "zap", value: `${workout.caloriesBurned}`, label: "kcal" });
  if (exercises.length > 0) stats.push({ icon: "layers", value: `${exercises.length}`, label: "exercises" });

  const totalSets = exercises.reduce((sum: number, ex: any) => sum + (ex.sets?.length || 0), 0);
  if (totalSets > 0) stats.push({ icon: "repeat", value: `${totalSets}`, label: "sets" });

  return (
    <View style={[shareStyles.card, { backgroundColor: "#0f0f1a" }]}>
      <View style={[shareStyles.gradientTop, { backgroundColor: color + "12" }]} />
      <View style={shareStyles.cardInner}>
        <View style={shareStyles.headerRow}>
          <View style={[shareStyles.iconCircle, { backgroundColor: color + "25" }]}>
            <Feather name={icon} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[shareStyles.name, { color: "#ffffff" }]}>
              {workout.name || (workout.activityType.charAt(0).toUpperCase() + workout.activityType.slice(1))}
            </Text>
            <Text style={[shareStyles.date, { color: "#9e9eb8" }]}>{dateStr}</Text>
          </View>
        </View>

        <View style={shareStyles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[shareStyles.statBox, { backgroundColor: "#1a1a2e", borderColor: "#2a2a3e" }]}>
              <Feather name={s.icon} size={14} color={color} style={{ marginBottom: 4 }} />
              <Text style={[shareStyles.statValue, { color: "#ffffff" }]}>{s.value}</Text>
              <Text style={[shareStyles.statUnit, { color: "#9e9eb8" }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {exercises.length > 0 && (
          <View style={[shareStyles.exerciseList, { borderColor: "#2a2a3e" }]}>
            {exercises.slice(0, 6).map((ex: any, i: number) => {
              const setsCount = ex.sets?.length || 0;
              const bestSet = ex.sets?.reduce((best: any, s: any) => {
                const w = s.weightKg || 0;
                return w > (best?.weightKg || 0) ? s : best;
              }, null);
              const bestStr = bestSet?.weightKg
                ? useImperial
                  ? `${(bestSet.weightKg * 2.20462).toFixed(0)} lbs × ${bestSet.reps || "?"}`
                  : `${bestSet.weightKg} kg × ${bestSet.reps || "?"}`
                : setsCount > 0 ? `${setsCount} sets` : "";

              return (
                <View key={i} style={shareStyles.exRow}>
                  <View style={[shareStyles.exDot, { backgroundColor: color }]} />
                  <Text style={[shareStyles.exName, { color: "#e0e0f0" }]} numberOfLines={1}>{ex.name}</Text>
                  {bestStr ? (
                    <Text style={[shareStyles.exBest, { color: "#9e9eb8" }]}>{bestStr}</Text>
                  ) : null}
                </View>
              );
            })}
            {exercises.length > 6 && (
              <Text style={[shareStyles.moreExercises, { color: "#9e9eb8" }]}>+{exercises.length - 6} more</Text>
            )}
          </View>
        )}

        {workout.mood && (
          <View style={shareStyles.moodRow}>
            <Text style={[shareStyles.moodLabel, { color: "#9e9eb8" }]}>Feeling</Text>
            <Text style={[shareStyles.moodValue, { color }]}>{workout.mood}</Text>
          </View>
        )}

        <View style={shareStyles.brandRow}>
          <View style={[shareStyles.brandDot, { backgroundColor: color }]} />
          <Text style={[shareStyles.brandText, { color: "#5a5a7a" }]}>FitLog</Text>
        </View>
      </View>
    </View>
  );
}

export default function WorkoutDetailScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings, staleTime: 60000 });
  const useImperial = settings?.unitSystem === "imperial";

  const { data: workout, isLoading, isError } = useQuery({
    queryKey: ["workout", id],
    queryFn: () => api.getWorkout(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteWorkout(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to delete workout."),
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Workout",
      "This will permanently remove this workout and all its sets. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isError || !workout) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={40} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Workout not found
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={[{ color: theme.primary, fontFamily: "Inter_500Medium" }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const color = getActivityColor(workout.activityType, theme);
  const icon = getActivityIcon(workout.activityType);
  const dateStr = new Date(workout.date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const exercises: any[] = workout.exercises || [];
  const isGym = workout.activityType === "gym";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          Workout Detail
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable onPress={() => setShareOpen(true)} style={styles.editBtn} hitSlop={8}>
            <Feather name="share" size={18} color={theme.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: "/workouts/edit" as any, params: { id } })}
            style={styles.editBtn}
            hitSlop={8}
          >
            <Feather name="edit-2" size={18} color={theme.primary} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8} disabled={deleteMutation.isPending}>
            <Feather name="trash-2" size={20} color={theme.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + bottomPad, gap: 16 }}
      >
        {/* Header card */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card>
            <View style={styles.workoutHeader}>
              <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
                <Feather name={icon} size={28} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workoutName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {workout.name || (workout.activityType.charAt(0).toUpperCase() + workout.activityType.slice(1))}
                </Text>
                <Text style={[styles.workoutDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {dateStr}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {workout.durationMinutes != null && (
                <StatPill icon="clock" label="Duration" value={`${workout.durationMinutes} min`} color={color} theme={theme} />
              )}
              {workout.distanceKm != null && (
                <StatPill
                  icon="map-pin"
                  label="Distance"
                  value={useImperial ? `${(workout.distanceKm * 0.621371).toFixed(1)} mi` : `${workout.distanceKm.toFixed(1)} km`}
                  color={theme.secondary}
                  theme={theme}
                />
              )}
              {workout.caloriesBurned != null && (
                <StatPill icon="zap" label="Calories" value={`${workout.caloriesBurned} kcal`} color={theme.warning} theme={theme} />
              )}
              {workout.mood && (
                <StatPill icon="smile" label="Mood" value={workout.mood} color={theme.primary} theme={theme} />
              )}
            </View>

            {workout.notes ? (
              <View style={[styles.notesWrap, { backgroundColor: theme.primaryDim, borderColor: theme.border }]}>
                <Feather name="file-text" size={13} color={theme.textMuted} />
                <Text style={[styles.notesText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {workout.notes}
                </Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {/* Exercises */}
        {exercises.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Exercises · {exercises.length}
            </Text>
            <View style={{ gap: 10 }}>
              {exercises.map((ex: any, exIdx: number) => (
                <Card key={ex.id ?? exIdx}>
                  <View style={styles.exHeader}>
                    <View style={[styles.exNum, { backgroundColor: color + "20" }]}>
                      <Text style={[{ color, fontFamily: "Inter_700Bold", fontSize: 13 }]}>{exIdx + 1}</Text>
                    </View>
                    <Text style={[styles.exName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {ex.name}
                    </Text>
                    {ex.muscleGroup ? (
                      <View style={[styles.muscleBadge, { backgroundColor: theme.secondary + "20" }]}>
                        <Text style={[{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 11 }]}>
                          {ex.muscleGroup}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {ex.notes ? (
                    <Text style={[styles.exNotes, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {ex.notes}
                    </Text>
                  ) : null}

                  {(ex.sets ?? []).length > 0 && (
                    <View style={[styles.setsTable, { borderColor: theme.border }]}>
                      <View style={[styles.setsHeader, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.setsHeaderText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Set</Text>
                        <Text style={[styles.setsHeaderText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Weight / Reps / Time</Text>
                        <Text style={[styles.setsHeaderText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>✓</Text>
                      </View>
                      {(ex.sets ?? []).map((s: any, sIdx: number) => (
                        <SetRow key={s.id ?? sIdx} set={s} idx={sIdx} theme={theme} useImperial={useImperial} />
                      ))}
                    </View>
                  )}
                </Card>
              ))}
            </View>
          </Animated.View>
        )}

        {exercises.length === 0 && !isGym && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Card>
              <View style={[styles.noExWrap, { borderColor: theme.border }]}>
                <Feather name={icon} size={32} color={color} />
                <Text style={[styles.noExText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {workout.activityType.charAt(0).toUpperCase() + workout.activityType.slice(1)} session logged
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={shareStyles.overlay} onPress={() => setShareOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View ref={cardRef} collapsable={false}>
              <ShareCard workout={workout} theme={theme} useImperial={useImperial} />
            </View>
            <View style={shareStyles.actions}>
              <Pressable
                onPress={async () => {
                  if (sharing) return;
                  setSharing(true);
                  try {
                    if (Platform.OS === "web") {
                      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "data-uri" });
                      const link = document.createElement("a");
                      link.href = uri;
                      link.download = `fitlog-workout-${id}.png`;
                      link.click();
                      showToast("Image downloaded!", "success");
                    } else {
                      const uri = await captureRef(cardRef, { format: "jpg", quality: 0.95 });
                      const available = await Sharing.isAvailableAsync();
                      if (available) {
                        await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: "Share your workout" });
                      } else {
                        showToast("Sharing is not available on this device", "error");
                      }
                    }
                  } catch (err) {
                    console.error("Share error:", err);
                    showToast("Could not share. Try taking a screenshot instead.", "error");
                  } finally {
                    setSharing(false);
                  }
                }}
                disabled={sharing}
                style={[shareStyles.actionBtn, { backgroundColor: theme.primary, opacity: sharing ? 0.7 : 1 }]}
              >
                {sharing ? (
                  <ActivityIndicator size={16} color="#0f0f1a" />
                ) : (
                  <Feather name={Platform.OS === "web" ? "download" : "share"} size={16} color="#0f0f1a" />
                )}
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {sharing ? "Preparing…" : Platform.OS === "web" ? "Download Image" : "Share Workout"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShareOpen(false)}
                style={[shareStyles.actionBtn, { backgroundColor: "#1a1a2e", borderColor: "#2a2a3e", borderWidth: 1 }]}
              >
                <Text style={{ color: "#9e9eb8", fontFamily: "Inter_500Medium", fontSize: 14 }}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const shareStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  card: {
    width: 320, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#2a2a3e",
  },
  gradientTop: { height: 6 },
  cardInner: { padding: 20, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Inter_700Bold", fontSize: 18 },
  date: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: 80, alignItems: "center",
    paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statUnit: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  exerciseList: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  exRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  exBest: { fontFamily: "Inter_400Regular", fontSize: 12 },
  moreExercises: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 4 },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moodLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  moodValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  actions: { gap: 8, marginTop: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, marginTop: 8 },
  backLink: { marginTop: 4, paddingVertical: 8 },
  navBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { flex: 1, fontSize: 17, textAlign: "center" },
  editBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  workoutHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  workoutName: { fontSize: 20 },
  workoutDate: { fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  statVal: { fontSize: 13 },
  statLabel: { fontSize: 10 },

  notesWrap: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  notesText: { flex: 1, fontSize: 13, lineHeight: 18 },

  sectionTitle: { fontSize: 17, marginBottom: 10 },

  exHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  exNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exName: { flex: 1, fontSize: 15 },
  muscleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  exNotes: { fontSize: 12, marginBottom: 8, lineHeight: 17 },

  setsTable: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 4 },
  setsHeader: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1,
  },
  setsHeaderText: { fontSize: 11 },

  setRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  setNum: { width: 20, fontSize: 12, color: "#888", fontFamily: "Inter_400Regular" },
  setValue: { fontSize: 13 },
  rpeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  noExWrap: {
    alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 24,
  },
  noExText: { fontSize: 14 },
});
