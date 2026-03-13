import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { generateWeeklyPlan } from "@/lib/coachEngine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function WeeklyPlanScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: workoutsData } = useQuery({ queryKey: ["workouts"], queryFn: api.getWorkouts });

  const recentWorkouts = (workoutsData?.workouts || []).slice(0, 14).map((w: any) => ({
    activityType: w.activityType,
    date: w.date,
    durationMinutes: w.durationMinutes,
  }));

  const userProfile = {
    availableEquipment: profile?.availableEquipment || [],
    workoutLocation: profile?.workoutLocation || "Home",
    trainingPreferences: profile?.trainingPreferences || [],
    experienceLevel: profile?.experienceLevel || "Beginner",
    preferredWorkoutDuration: profile?.preferredWorkoutDuration || "45 minutes",
    weeklyWorkoutDays: profile?.weeklyWorkoutDays || 3,
    fitnessGoals: profile?.fitnessGoals || [],
  };

  const [plan, setPlan] = useState(() => generateWeeklyPlan(userProfile, recentWorkouts));
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => api.updateProfile({ savedWeeklyPlan: plan.map(p => ({ day: p.day, templateId: p.template?.id, rest: p.rest, note: p.note })) }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const regenerate = () => {
    setPlan(generateWeeklyPlan(userProfile, recentWorkouts));
    setSaved(false);
    setCompletedDays(new Set());
  };

  const today = new Date().toLocaleString("en-US", { weekday: "long" });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Weekly Plan</Text>
        <Pressable onPress={regenerate} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={18} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Plan summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.primaryDim }]}>
              <Feather name="calendar" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {plan.filter(p => !p.rest).length} workouts this week
              </Text>
              <Text style={[styles.summarySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {userProfile.experienceLevel} level · {userProfile.preferredWorkoutDuration}
              </Text>
            </View>
            {saved ? (
              <View style={[styles.savedBadge, { backgroundColor: theme.primaryDim }]}>
                <Feather name="check" size={12} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>Saved</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Day cards */}
        {plan.map((day, idx) => {
          const isToday = day.day === today;
          const isDone = completedDays.has(idx);

          return (
            <Animated.View key={day.day} entering={FadeInDown.delay(idx * 60).duration(300)}>
              <Pressable
                onPress={() => {
                  if (day.template) {
                    router.push({
                      pathname: "/workouts/template" as any,
                      params: { id: day.template.id, whyGoodForYou: day.note },
                    });
                  }
                }}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isToday ? theme.primaryDim : theme.card,
                    borderColor: isToday ? theme.primary : isDone ? theme.border : theme.border,
                    opacity: isDone ? 0.6 : 1,
                  },
                ]}
              >
                {/* Day label */}
                <View style={styles.dayHeader}>
                  <View style={styles.dayLeft}>
                    <Text style={[styles.dayName, { color: isToday ? theme.primary : theme.textMuted, fontFamily: isToday ? "Inter_700Bold" : "Inter_500Medium" }]}>
                      {day.day}
                      {isToday ? " — Today" : ""}
                    </Text>
                  </View>
                  {isDone && (
                    <View style={[styles.doneBadge, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="check" size={12} color={theme.primary} />
                      <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 11 }}>Done</Text>
                    </View>
                  )}
                </View>

                {day.rest ? (
                  <View style={styles.restContent}>
                    <Feather name="moon" size={16} color={theme.textMuted} />
                    <Text style={[styles.restText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{day.note}</Text>
                  </View>
                ) : (
                  <View style={styles.workoutContent}>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {day.template?.name}
                      </Text>
                      <View style={styles.workoutMeta}>
                        <View style={styles.metaItem}>
                          <Feather name="clock" size={11} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                            {day.template?.durationMinutes} min
                          </Text>
                        </View>
                        <View style={[styles.diffBadge, {
                          backgroundColor: day.template?.difficulty === "Beginner" ? theme.primary + "20" :
                            day.template?.difficulty === "Intermediate" ? theme.secondary + "20" : theme.danger + "20",
                        }]}>
                          <Text style={{
                            color: day.template?.difficulty === "Beginner" ? theme.primary :
                              day.template?.difficulty === "Intermediate" ? theme.secondary : theme.danger,
                            fontFamily: "Inter_400Regular", fontSize: 10,
                          }}>
                            {day.template?.difficulty}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.dayNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {day.note}
                      </Text>
                    </View>
                    <View style={styles.dayActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setCompletedDays(s => {
                            const next = new Set(s);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            return next;
                          });
                        }}
                        style={[styles.checkBtn, {
                          backgroundColor: isDone ? theme.primary : "transparent",
                          borderColor: isDone ? theme.primary : theme.border,
                        }]}
                      >
                        <Feather name="check" size={14} color={isDone ? "#0f0f1a" : theme.border} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <Button title={saved ? "Plan Saved" : "Save This Plan"} onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={saved} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  refreshBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  content: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  summaryCard: { marginBottom: 4 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 15 },
  summarySub: { fontSize: 12, marginTop: 2 },
  savedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dayCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayLeft: {},
  dayName: { fontSize: 13 },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  restContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  restText: { fontSize: 13, flex: 1 },
  workoutContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutInfo: { flex: 1, gap: 4 },
  workoutName: { fontSize: 15 },
  workoutMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11 },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dayNote: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  dayActions: { alignItems: "center" },
  checkBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
