import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";

function formatDuration(mins?: number | null) {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getActivityIcon(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case "cycling": return "wind";
    case "running": return "activity";
    case "walking": return "navigation";
    case "swimming": return "droplet";
    case "gym": return "zap";
    case "yoga": return "heart";
    case "tennis": return "circle";
    default: return "activity";
  }
}

function getActivityColor(type: string, theme: any) {
  switch (type) {
    case "cycling": return theme.secondary;
    case "running": return theme.primary;
    case "walking": return theme.cyan;
    case "swimming": return theme.secondary;
    case "gym": return theme.purple;
    case "yoga": return theme.pink;
    default: return theme.primary;
  }
}

function WorkoutCard({ workout, onDelete }: { workout: any; onDelete: () => void }) {
  const { theme } = useTheme();
  const color = getActivityColor(workout.activityType, theme);
  const icon = getActivityIcon(workout.activityType);
  
  return (
    <Card style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <View style={[styles.workoutIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.workoutName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {workout.name || workout.activityType}
          </Text>
          <Text style={[styles.workoutDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {new Date(workout.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color={theme.danger} />
        </Pressable>
      </View>
      
      <View style={styles.workoutStats}>
        {workout.durationMinutes && (
          <View style={styles.statPill}>
            <Feather name="clock" size={12} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {formatDuration(workout.durationMinutes)}
            </Text>
          </View>
        )}
        {workout.distanceKm && (
          <View style={styles.statPill}>
            <Feather name="map-pin" size={12} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.distanceKm.toFixed(1)} km
            </Text>
          </View>
        )}
        {workout.caloriesBurned && (
          <View style={styles.statPill}>
            <Feather name="zap" size={12} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.caloriesBurned} kcal
            </Text>
          </View>
        )}
        {workout.mood && (
          <View style={[styles.moodPill, { backgroundColor: theme.primaryDim }]}>
            <Text style={[styles.moodText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
              {workout.mood}
            </Text>
          </View>
        )}
      </View>
      
      {workout.exercises && workout.exercises.length > 0 && (
        <Text style={[styles.exerciseSummary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {workout.exercises.length} exercise{workout.exercises.length > 1 ? "s" : ""}
        </Text>
      )}
    </Card>
  );
}

export default function WorkoutsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: api.getWorkouts,
  });
  
  const deleteMutation = useMutation({
    mutationFn: api.deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
    },
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  const workouts = data?.workouts || [];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Workouts</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/workouts/log"); }}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={22} color="#0f0f1a" />
        </Pressable>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + bottomPad, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {workouts.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="activity" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              No workouts yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Tap + to log your first workout!
            </Text>
          </View>
        ) : (
          workouts.map((w: any, i: number) => (
            <Animated.View key={w.id} entering={FadeInDown.delay(i * 50).duration(300)}>
              <WorkoutCard
                workout={w}
                onDelete={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  deleteMutation.mutate(w.id);
                }}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>
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
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  workoutCard: { gap: 10 },
  workoutHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  workoutName: { fontSize: 15 },
  workoutDate: { fontSize: 12, marginTop: 1 },
  deleteBtn: { padding: 8 },
  workoutStats: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "transparent",
  },
  statText: { fontSize: 12 },
  moodPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  moodText: { fontSize: 12 },
  exerciseSummary: { fontSize: 12 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
