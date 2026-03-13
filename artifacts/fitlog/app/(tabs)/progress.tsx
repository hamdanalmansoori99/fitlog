import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const { theme } = useTheme();
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  return (
    <View style={{ height: 60, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {data.map((v, i) => {
        const h = ((v - min) / range) * 50 + 10;
        return (
          <View key={i} style={{ flex: 1, height: h, backgroundColor: color + "80", borderRadius: 4 }} />
        );
      })}
    </View>
  );
}

function SimplePieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View style={styles.pieChart}>
      {data.map((d, i) => (
        <View key={i} style={styles.pieRow}>
          <View style={[styles.pieDot, { backgroundColor: d.color }]} />
          <Text style={{ color: "#9e9e9e", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>{d.label}</Text>
          <Text style={{ color: "#f5f5f5", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            {total > 0 ? Math.round((d.value / total) * 100) : 0}%
          </Text>
        </View>
      ))}
    </View>
  );
}

function StreakCard({ icon, value, label, color }: { icon: keyof typeof Feather.glyphMap; value: number; label: string; color: string }) {
  return (
    <View style={[styles.streakCard, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <Feather name={icon} size={22} color={color} />
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 28 }}>{value}</Text>
      <Text style={{ color: "#9e9e9e", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [measureDays, setMeasureDays] = useState(30);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  const { data: workoutSummary, isLoading: summaryLoading } = useQuery({ queryKey: ["workoutSummary"], queryFn: api.getWorkoutSummary });
  const { data: nutritionStats } = useQuery({ queryKey: ["nutritionStats"], queryFn: api.getNutritionStats });
  const { data: streaks, isLoading: streaksLoading } = useQuery({ queryKey: ["streaks"], queryFn: api.getStreaks });
  const { data: records } = useQuery({ queryKey: ["records"], queryFn: api.getPersonalRecords });
  const { data: measurements } = useQuery({ queryKey: ["measurements", measureDays], queryFn: () => api.getMeasurements(measureDays) });
  
  const weightData = (measurements?.measurements || [])
    .filter((m: any) => m.weightKg)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m: any) => m.weightKg);
  
  const caloriesData = (nutritionStats?.dailyCalories || [])
    .slice(-30)
    .map((d: any) => d.calories);
  
  const activityColors: Record<string, string> = {
    cycling: theme.secondary,
    running: theme.primary,
    walking: theme.cyan,
    gym: theme.purple,
    swimming: "#4fc3f7",
    tennis: theme.warning,
    yoga: theme.pink,
    other: theme.textMuted,
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Progress</Text>
        <Pressable
          onPress={() => router.push("/measurements/add")}
          style={[styles.addBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Feather name="plus" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>Log</Text>
        </Pressable>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + bottomPad, gap: 16 }}
      >
        {/* Streaks */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Streaks</Text>
          {streaksLoading ? (
            <View style={styles.streaksRow}>
              {[0, 1, 2].map(i => (
                <SkeletonCard key={i} style={{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 18 } as any}>
                  <SkeletonBox width={24} height={24} borderRadius={8} />
                  <SkeletonBox width={32} height={28} borderRadius={6} />
                  <SkeletonBox width={52} height={11} borderRadius={4} />
                </SkeletonCard>
              ))}
            </View>
          ) : (
            <View style={styles.streaksRow}>
              <StreakCard icon="zap" value={streaks?.currentWorkoutStreak || 0} label="Workout Streak" color={theme.primary} />
              <StreakCard icon="award" value={streaks?.longestWorkoutStreak || 0} label="Longest Streak" color={theme.warning} />
              <StreakCard icon="coffee" value={streaks?.currentMealStreak || 0} label="Meal Streak" color={theme.pink} />
            </View>
          )}
        </Animated.View>
        
        {/* Workout Stats */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          {summaryLoading ? (
            <SkeletonCard>
              <SkeletonBox width="40%" height={15} borderRadius={6} style={{ marginBottom: 10 } as any} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <SkeletonBox width={52} height={36} borderRadius={8} />
                  <SkeletonBox width={60} height={12} borderRadius={4} />
                </View>
                <View style={{ width: 1, height: 40, backgroundColor: "transparent" }} />
                <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <SkeletonBox width={52} height={36} borderRadius={8} />
                  <SkeletonBox width={60} height={12} borderRadius={4} />
                </View>
              </View>
            </SkeletonCard>
          ) : (
            <Card>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Workout Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {workoutSummary?.totalThisWeek || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>This Week</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {workoutSummary?.totalThisMonth || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>This Month</Text>
                </View>
              </View>
            </Card>
          )}
        </Animated.View>
        
        {/* Weekly Frequency */}
        {workoutSummary?.weeklyFrequency && (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Workouts per Week</Text>
            <WeeklyBarChart
              data={workoutSummary.weeklyFrequency.map((w: any) => ({
                dayLabel: w.weekLabel,
                activeMinutes: w.count * 10,
                isToday: false,
              }))}
            />
          </Card>
        )}
        
        {/* Activity Breakdown */}
        {workoutSummary?.activityBreakdown?.length > 0 && (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Activity Type</Text>
            <SimplePieChart
              data={workoutSummary.activityBreakdown.map((a: any) => ({
                label: `${a.activityType} (${a.count})`,
                value: a.count,
                color: activityColors[a.activityType] || theme.textMuted,
              }))}
            />
          </Card>
        )}
        
        {/* Body Measurements */}
        <View>
          <View style={styles.measureHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Body Measurements</Text>
            <View style={styles.rangeRow}>
              {[30, 90, 365].map(d => (
                <Pressable
                  key={d}
                  onPress={() => setMeasureDays(d)}
                  style={[
                    styles.rangeBtn,
                    { backgroundColor: measureDays === d ? theme.primary : theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{
                    color: measureDays === d ? "#0f0f1a" : theme.textMuted,
                    fontFamily: "Inter_500Medium", fontSize: 11,
                  }}>
                    {d}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          
          {weightData.length > 0 ? (
            <Card>
              <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Weight over time
              </Text>
              <MiniLineChart data={weightData} color={theme.primary} />
              <View style={styles.weightInfo}>
                <Text style={[styles.weightCurrent, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {weightData[weightData.length - 1]?.toFixed(1)} kg
                </Text>
                <Text style={[{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                  Current weight
                </Text>
              </View>
            </Card>
          ) : (
            <Animated.View entering={ZoomIn.duration(350)}>
              <Card>
                <View style={styles.empty}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="trending-up" size={24} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    No measurements yet
                  </Text>
                  <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Log your weight and body measurements to visualise your progress over time.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/measurements/add")}
                    style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
                  >
                    <Feather name="plus" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Log measurement</Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          )}
        </View>
        
        {/* Nutrition Stats */}
        {nutritionStats && (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Nutrition</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg7DayCalories)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>7-day avg kcal</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg30DayCalories)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>30-day avg kcal</Text>
              </View>
            </View>
            <SimplePieChart
              data={[
                { label: "Protein", value: nutritionStats.macroSplit.proteinPercentage, color: theme.secondary },
                { label: "Carbs", value: nutritionStats.macroSplit.carbsPercentage, color: theme.warning },
                { label: "Fat", value: nutritionStats.macroSplit.fatPercentage, color: theme.orange },
              ]}
            />
          </Card>
        )}
        
        {/* Personal Records */}
        {records?.records?.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Personal Records</Text>
            {records.records.map((r: any, i: number) => (
              <Card key={i} style={styles.recordCard}>
                <View style={[styles.recordIcon, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="award" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{r.label}</Text>
                  <Text style={[styles.recordValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{r.value}</Text>
                </View>
                {r.date && (
                  <Text style={[styles.recordDate, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                )}
              </Card>
            ))}
          </View>
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
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  cardTitle: { fontSize: 15, marginBottom: 12 },
  cardSub: { fontSize: 12, marginBottom: 8 },
  streaksRow: { flexDirection: "row", gap: 10 },
  streakCard: {
    flex: 1, alignItems: "center", gap: 4, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 40 },
  pieChart: { gap: 10, marginTop: 8 },
  pieRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  measureHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  rangeRow: { flexDirection: "row", gap: 4 },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  weightInfo: { marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 6 },
  weightCurrent: { fontSize: 22 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 20 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 240 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  recordCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, paddingVertical: 12 },
  recordIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recordLabel: { fontSize: 12 },
  recordValue: { fontSize: 17 },
  recordDate: { fontSize: 12 },
});
