import React, { useState, useCallback } from "react";
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
import { getRecommendations, getTodaySuggestion } from "@/lib/coachEngine";
import { WORKOUT_TEMPLATES, WorkoutTemplate } from "@/lib/workoutTemplates";

function formatDuration(mins?: number | null) {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

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

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const { theme } = useTheme();
  const color = { Beginner: theme.primary, Intermediate: theme.secondary, Advanced: theme.danger }[difficulty] || theme.primary;
  return <View style={[styles.diffDot, { backgroundColor: color }]} />;
}

function EquipmentMatchBadge({ match }: { match: "full" | "partial" | "none" }) {
  const { theme } = useTheme();
  if (match === "full") {
    return (
      <View style={[styles.matchBadge, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="check-circle" size={10} color={theme.primary} />
        <Text style={[styles.matchBadgeText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
          Full match
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.matchBadge, { backgroundColor: theme.warning + "20" }]}>
      <Feather name="refresh-cw" size={10} color={theme.warning} />
      <Text style={[styles.matchBadgeText, { color: theme.warning, fontFamily: "Inter_500Medium" }]}>
        With substitutions
      </Text>
    </View>
  );
}

function RecommendationCard({ rec, onPress }: { rec: any; onPress: () => void }) {
  const { theme } = useTheme();
  const { template, whyGoodForYou, equipmentMatch, missingEquipment } = rec;
  const color = getActivityColor(template.activityType, theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recCard,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: color + "20" }]}>
          <Feather name={getActivityIcon(template.activityType)} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {template.name}
          </Text>
          <View style={styles.recMeta}>
            <DifficultyDot difficulty={template.difficulty} />
            <Text style={[styles.recMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {template.difficulty}
            </Text>
            <Text style={{ color: theme.border }}> · </Text>
            <Feather name="clock" size={10} color={theme.textMuted} />
            <Text style={[styles.recMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {template.durationMinutes} min
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textMuted} />
      </View>

      {/* Why it's good for you */}
      <Text style={[styles.recWhy, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
        {whyGoodForYou}
      </Text>

      {/* Equipment row */}
      <View style={styles.recEquipRow}>
        <Feather name="tool" size={11} color={theme.textMuted} />
        <Text style={[styles.recEquipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {template.requiredEquipment.length === 0
            ? "No equipment needed"
            : template.requiredEquipment.map((e: string) => e.replace(/_/g, " ")).join(", ")}
        </Text>
      </View>

      {/* Missing equipment note */}
      {missingEquipment && missingEquipment.length > 0 && (
        <View style={[styles.missingRow, { backgroundColor: theme.warning + "14" }]}>
          <Feather name="alert-circle" size={10} color={theme.warning} />
          <Text style={[styles.missingText, { color: theme.warning, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            Missing: {missingEquipment.map((e: string) => e.replace(/_/g, " ")).join(", ")} — alternatives shown inside
          </Text>
        </View>
      )}

      {/* Footer tags */}
      <View style={styles.recFooter}>
        <View style={[styles.goalTag, { backgroundColor: theme.primaryDim }]}>
          <Text style={[styles.goalTagText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
            {template.goals[0]}
          </Text>
        </View>
        <EquipmentMatchBadge match={equipmentMatch ?? "full"} />
      </View>
    </Pressable>
  );
}

function TodaySuggestionCard({ suggestion, onPress }: { suggestion: any; onPress: () => void }) {
  const { theme } = useTheme();
  const { template, whyGoodForYou } = suggestion;
  const color = getActivityColor(template.activityType, theme);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.todayCard, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.todayInner, { backgroundColor: theme.card, borderColor: theme.primary }]}>
        <View style={styles.todayTop}>
          <View style={[styles.todayIcon, { backgroundColor: color + "20" }]}>
            <Feather name={getActivityIcon(template.activityType)} size={24} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayLabel, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>Today's Suggestion</Text>
            <Text style={[styles.todayName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{template.name}</Text>
          </View>
          <View style={[styles.startBtn, { backgroundColor: theme.primary }]}>
            <Feather name="play" size={14} color="#0f0f1a" />
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Start</Text>
          </View>
        </View>
        <Text style={[styles.todayWhy, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {whyGoodForYou}
        </Text>
        <View style={styles.todayStats}>
          <View style={styles.todayStat}>
            <Feather name="clock" size={12} color={theme.textMuted} />
            <Text style={[styles.todayStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {template.durationMinutes} min
            </Text>
          </View>
          <View style={[styles.diffDot, { backgroundColor: (({ Beginner: theme.primary, Intermediate: theme.secondary, Advanced: theme.danger } as Record<string, string>)[template.difficulty]) || theme.primary }]} />
          <Text style={[styles.todayStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {template.difficulty}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function WorkoutHistoryCard({ workout, onDelete }: { workout: any; onDelete: () => void }) {
  const { theme } = useTheme();
  const color = getActivityColor(workout.activityType, theme);
  const icon = getActivityIcon(workout.activityType);

  return (
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={[styles.historyIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.historyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {workout.name || workout.activityType}
          </Text>
          <Text style={[styles.historyDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {new Date(workout.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={15} color={theme.danger} />
        </Pressable>
      </View>
      <View style={styles.historyStats}>
        {workout.durationMinutes && (
          <View style={styles.histStat}>
            <Feather name="clock" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {formatDuration(workout.durationMinutes)}
            </Text>
          </View>
        )}
        {workout.distanceKm && (
          <View style={styles.histStat}>
            <Feather name="map-pin" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.distanceKm.toFixed(1)} km
            </Text>
          </View>
        )}
        {workout.caloriesBurned && (
          <View style={styles.histStat}>
            <Feather name="zap" size={11} color={theme.textMuted} />
            <Text style={[styles.histStatText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {workout.caloriesBurned} kcal
            </Text>
          </View>
        )}
        {workout.mood && (
          <View style={[styles.moodChip, { backgroundColor: theme.primaryDim }]}>
            <Text style={[styles.moodText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>{workout.mood}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function WorkoutsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [refreshing, setRefreshing] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: workoutsData, refetch: refetchWorkouts } = useQuery({ queryKey: ["workouts"], queryFn: () => api.getWorkouts() });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchWorkouts()]);
    setRefreshing(false);
  }, []);

  const profile = profileData;
  const workouts = workoutsData?.workouts || [];
  const hasCompletedOnboarding = profile?.coachOnboardingComplete;

  // Build coach profile for recommendations
  const coachProfile = {
    availableEquipment: profile?.availableEquipment || [],
    workoutLocation: profile?.workoutLocation || "Home",
    trainingPreferences: profile?.trainingPreferences || [],
    experienceLevel: profile?.experienceLevel || "Beginner",
    preferredWorkoutDuration: profile?.preferredWorkoutDuration || "45 minutes",
    weeklyWorkoutDays: profile?.weeklyWorkoutDays || 3,
    fitnessGoals: profile?.fitnessGoals || [],
  };

  const recentWorkouts = workouts.slice(0, 14).map((w: any) => ({
    name: w.name,
    activityType: w.activityType,
    date: w.date,
    durationMinutes: w.durationMinutes,
  }));

  const recommendations = hasCompletedOnboarding
    ? getRecommendations(coachProfile, recentWorkouts, 5)
    : [];
  const todaySuggestion = hasCompletedOnboarding
    ? getTodaySuggestion(coachProfile, recentWorkouts)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Workouts</Text>
          {hasCompletedOnboarding && (
            <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Your personalised coach
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {hasCompletedOnboarding && (
            <Pressable onPress={() => router.push("/workouts/plan" as any)} style={[styles.planBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="calendar" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>Week</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/workouts/log"); }}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus" size={22} color="#0f0f1a" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + bottomPad, gap: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ── COACH ONBOARDING PROMPT ── */}
        {!hasCompletedOnboarding && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
            <Pressable
              onPress={() => router.push("/workouts/onboarding" as any)}
              style={[styles.onboardingCard, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
            >
              <View style={styles.onboardingIcon}>
                <Feather name="zap" size={28} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.onboardingTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  Set up your fitness coach
                </Text>
                <Text style={[styles.onboardingSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Tell us your goals, equipment and preferences — we'll build a personalised plan for you.
                </Text>
              </View>
              <Feather name="arrow-right" size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── TODAY'S SUGGESTION ── */}
        {todaySuggestion && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.section}>
            <TodaySuggestionCard
              suggestion={todaySuggestion}
              onPress={() => router.push({
                pathname: "/workouts/template" as any,
                params: { id: todaySuggestion.template.id, whyGoodForYou: todaySuggestion.whyGoodForYou },
              })}
            />
          </Animated.View>
        )}

        {/* ── RECOMMENDED FOR YOU ── */}
        {recommendations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Recommended for you
              </Text>
              <Pressable onPress={() => router.push("/workouts/onboarding" as any)}>
                <Text style={[styles.editPrefs, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>Edit prefs</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recScroll}>
              <View style={styles.recRow}>
                {recommendations.map((rec, i) => (
                  <View key={rec.template.id} style={styles.recCardWrap}>
                    <RecommendationCard
                      rec={rec}
                      onPress={() => router.push({
                        pathname: "/workouts/template" as any,
                        params: { id: rec.template.id, whyGoodForYou: rec.whyGoodForYou },
                      })}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* ── WEEKLY PLAN BANNER ── */}
        {hasCompletedOnboarding && (
          <Animated.View entering={FadeInDown.delay(130).duration(400)} style={styles.section}>
            <Pressable
              onPress={() => router.push("/workouts/plan" as any)}
              style={({ pressed }) => [
                styles.planBanner,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={[styles.planBannerIcon, { backgroundColor: theme.secondaryDim }]}>
                <Feather name="calendar" size={20} color={theme.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planBannerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Weekly Training Plan
                </Text>
                <Text style={[styles.planBannerSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  View, edit and track your 7-day schedule
                </Text>
              </View>
              <Feather name="arrow-right" size={18} color={theme.secondary} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── QUICK ACTIONS ── */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Quick log</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickRow}>
              {[
                { label: "Run", icon: "activity" as const, type: "running", color: theme.primary },
                { label: "Gym", icon: "zap" as const, type: "gym", color: theme.purple },
                { label: "Walk", icon: "navigation" as const, type: "walking", color: theme.cyan },
                { label: "Cycle", icon: "wind" as const, type: "cycling", color: theme.secondary },
                { label: "Swim", icon: "droplet" as const, type: "swimming", color: "#4fc3f7" },
                { label: "Yoga", icon: "heart" as const, type: "yoga", color: theme.pink },
                { label: "Tennis", icon: "circle" as const, type: "tennis", color: theme.warning },
                { label: "Other", icon: "more-horizontal" as const, type: "other", color: theme.textMuted },
              ].map((act) => (
                <Pressable
                  key={act.type}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/workouts/log" as any, params: { prefillType: act.type } });
                  }}
                  style={[styles.quickChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: act.color + "20" }]}>
                    <Feather name={act.icon} size={18} color={act.color} />
                  </View>
                  <Text style={[styles.quickLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{act.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* ── BROWSE TEMPLATES ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Browse templates</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templateRow}>
              {WORKOUT_TEMPLATES.slice(0, 8).map((tmpl) => (
                <Pressable
                  key={tmpl.id}
                  onPress={() => router.push({ pathname: "/workouts/template" as any, params: { id: tmpl.id } })}
                  style={[styles.templateCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.templateIcon, { backgroundColor: getActivityColor(tmpl.activityType, theme) + "20" }]}>
                    <Feather name={getActivityIcon(tmpl.activityType)} size={20} color={getActivityColor(tmpl.activityType, theme)} />
                  </View>
                  <Text style={[styles.templateName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                    {tmpl.name}
                  </Text>
                  <View style={styles.templateMeta}>
                    <Text style={[styles.templateMetaText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {tmpl.durationMinutes}min · {tmpl.difficulty}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* ── WORKOUT HISTORY ── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>History</Text>

          {workouts.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Card>
                <View style={styles.empty}>
                  <View style={[styles.emptyIconBg, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="zap" size={26} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    Your journey starts here
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Choose a template above or log a custom workout to start building your history.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/workouts/log" as any)}
                    style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
                  >
                    <Feather name="plus" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Log your first workout
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          ) : (
            <View style={{ gap: 10 }}>
              {workouts.map((w: any) => (
                <WorkoutHistoryCard
                  key={w.id}
                  workout={w}
                  onDelete={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    deleteMutation.mutate(w.id);
                  }}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 8,
  },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  planBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  planBannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planBannerTitle: { fontSize: 14 },
  planBannerSub: { fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17 },
  editPrefs: { fontSize: 13 },
  // Onboarding
  onboardingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5,
  },
  onboardingIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  onboardingTitle: { fontSize: 15, marginBottom: 4 },
  onboardingSub: { fontSize: 13, lineHeight: 18 },
  // Today
  todayCard: {},
  todayInner: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  todayTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  todayLabel: { fontSize: 11, marginBottom: 2 },
  todayName: { fontSize: 17 },
  startBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  todayWhy: { fontSize: 13, lineHeight: 18 },
  todayStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  todayStatText: { fontSize: 12 },
  // Recommendations
  recScroll: { marginHorizontal: -20 },
  recRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 },
  recCardWrap: { width: 270 },
  recCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  recName: { fontSize: 14 },
  recMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  recMetaText: { fontSize: 11 },
  recWhy: { fontSize: 12, lineHeight: 17 },
  recEquipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  recEquipText: { fontSize: 11, flex: 1 },
  missingRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  missingText: { fontSize: 10, flex: 1 },
  recFooter: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  goalTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  goalTagText: { fontSize: 11 },
  matchBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  matchBadgeText: { fontSize: 10 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  // Quick actions
  quickRow: { flexDirection: "row", gap: 10, paddingRight: 8 },
  quickChip: {
    alignItems: "center", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, minWidth: 72,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12 },
  // Templates
  templateRow: { flexDirection: "row", gap: 10, paddingRight: 8 },
  templateCard: { width: 150, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  templateIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  templateName: { fontSize: 13, lineHeight: 18 },
  templateMeta: { marginTop: 2 },
  templateMetaText: { fontSize: 11 },
  // History
  historyCard: { gap: 8, paddingVertical: 12 },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyName: { fontSize: 14 },
  historyDate: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 8 },
  historyStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  histStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  histStatText: { fontSize: 12 },
  moodChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  moodText: { fontSize: 11 },
  // Empty
  empty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyIconBg: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 240 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
});
