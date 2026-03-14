import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
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
import { GoalInsightsPanel } from "@/components/GoalInsightsPanel";
import { computeGoalInsights } from "@/lib/goalInsights";

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const { theme } = useTheme();

  if (data.length === 0) return null;

  if (data.length === 1) {
    return (
      <View style={{ height: 60, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
          Log more entries to see your trend
        </Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padMin = min - range * 0.15;
  const padMax = max + range * 0.05;
  const padRange = padMax - padMin || 1;
  const delta = data[data.length - 1] - data[0];

  return (
    <View>
      <View style={{ height: 60, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {data.map((v, i) => {
          const h = Math.max(((v - padMin) / padRange) * 50 + 8, 4);
          const isLast = i === data.length - 1;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: isLast ? color : color + "55",
                borderRadius: 3,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
        <Feather
          name={delta < -0.05 ? "trending-down" : delta > 0.05 ? "trending-up" : "minus"}
          size={13}
          color={delta < -0.05 ? theme.primary : delta > 0.05 ? theme.danger : theme.textMuted}
        />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg over {data.length} entries
        </Text>
      </View>
    </View>
  );
}

const DONUT_SIZE = 100;
const DONUT_R = 36;
const DONUT_SW = 14;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { theme } = useTheme();
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);

  if (total === 0) {
    return (
      <View style={styles.pieChart}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
          No macro data yet
        </Text>
      </View>
    );
  }

  let offset = 0;
  const segments = data.map(d => {
    const pct = Math.max(d.value, 0) / total;
    const dash = pct * DONUT_CIRC;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <View style={[styles.pieChart, { flexDirection: "row", alignItems: "center", gap: 16 }]}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <G rotation="-90" origin={`${DONUT_CX},${DONUT_CY}`}>
          <Circle
            cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
            stroke={theme.border} strokeWidth={DONUT_SW} fill="none"
          />
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
              stroke={seg.color}
              strokeWidth={DONUT_SW}
              fill="none"
              strokeDasharray={`${seg.dash} ${DONUT_CIRC - seg.dash}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={{ flex: 1, gap: 7 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
              {d.label}
            </Text>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {total > 0 ? Math.round((Math.max(d.value, 0) / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StreakCard({ icon, value, label, color }: { icon: keyof typeof Feather.glyphMap; value: number; label: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.streakCard, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <Feather name={icon} size={22} color={color} />
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 28 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" }}>{label}</Text>
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
  const { data: nutritionStats, isLoading: nutritionLoading } = useQuery({ queryKey: ["nutritionStats"], queryFn: api.getNutritionStats });
  const { data: streaks, isLoading: streaksLoading } = useQuery({ queryKey: ["streaks"], queryFn: api.getStreaks });
  const { data: records, isLoading: recordsLoading } = useQuery({ queryKey: ["records"], queryFn: api.getPersonalRecords });
  const { data: measurements, isLoading: measurementsLoading } = useQuery({ queryKey: ["measurements", measureDays], queryFn: () => api.getMeasurements(measureDays) });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: workoutsData } = useQuery({ queryKey: ["workouts"], queryFn: () => api.getWorkouts({ limit: 60 }), staleTime: 120000 });
  const { data: recoveryTodayData } = useQuery({ queryKey: ["recoveryToday"], queryFn: api.getRecoveryToday, staleTime: 60000 });
  
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

  const goalInsights = useMemo(() => {
    if (!profile) return [];
    const workoutList: any[] = workoutsData?.workouts || [];
    const recoveryLog = recoveryTodayData?.log ?? undefined;
    return computeGoalInsights({
      goals: profile.fitnessGoals || [],
      profile: {
        calorieGoal: profile.dailyCalorieGoal ?? null,
        proteinGoalG: profile.dailyProteinGoal ?? null,
        weeklyWorkoutDays: profile.weeklyWorkoutDays ?? 3,
      },
      workouts: workoutList.map((w: any) => ({
        activityType: w.activityType,
        durationMinutes: w.durationMinutes,
        date: w.date,
        name: w.name,
      })),
      nutritionStats: nutritionStats ?? undefined,
      streaks: streaks ?? undefined,
      records: records?.records ?? undefined,
      recovery: recoveryLog
        ? {
            sleepQuality: recoveryLog.sleepQuality ?? undefined,
            energyLevel: recoveryLog.energyLevel ?? undefined,
            soreness: recoveryLog.soreness ?? {},
          }
        : undefined,
      workoutSummary: workoutSummary ?? undefined,
    });
  }, [profile, workoutsData, nutritionStats, streaks, records, recoveryTodayData, workoutSummary]);

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
        {/* Goal-based insights */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Goal Insights</Text>
          <GoalInsightsPanel
            insights={goalInsights}
            goals={profile?.fitnessGoals || []}
            theme={theme}
          />
        </Animated.View>

        {/* Streaks */}
        <Animated.View entering={FadeInDown.delay(40).duration(350)}>
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
        {summaryLoading ? (
          <SkeletonCard>
            <SkeletonBox width="50%" height={15} borderRadius={6} style={{ marginBottom: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 6 }}>
              {[55, 80, 40, 100, 65, 45, 90].map((h, i) => (
                <SkeletonBox key={i} style={{ flex: 1 } as any} height={h} borderRadius={6} />
              ))}
            </View>
          </SkeletonCard>
        ) : workoutSummary?.weeklyFrequency ? (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Workouts per Week</Text>
            <WeeklyBarChart
              data={workoutSummary.weeklyFrequency.map((w: any, idx: number, arr: any[]) => {
                const weeksAgo = arr.length - 1 - idx;
                const dayLabel = weeksAgo === 0 ? "This wk" : `${weeksAgo}w`;
                return {
                  dayLabel,
                  activeMinutes: w.count,
                  isToday: weeksAgo === 0,
                  valueLabel: w.count === 0 ? "" : String(w.count),
                };
              })}
              emptyMessage="No workouts logged yet"
            />
          </Card>
        ) : null}
        
        {/* Activity Breakdown */}
        {summaryLoading ? null : workoutSummary?.activityBreakdown?.length > 0 ? (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Activity Breakdown</Text>
            <DonutChart
              data={workoutSummary.activityBreakdown.map((a: any) => ({
                label: `${a.activityType.charAt(0).toUpperCase() + a.activityType.slice(1)} (${a.count})`,
                value: a.count,
                color: activityColors[a.activityType] || theme.textMuted,
              }))}
            />
          </Card>
        ) : null}
        
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
          
          {measurementsLoading ? (
            <SkeletonCard>
              <SkeletonBox width="50%" height={13} borderRadius={5} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 }}>
                {[40, 60, 35, 70, 50, 65, 45].map((h, i) => (
                  <SkeletonBox key={i} style={{ flex: 1 } as any} height={h} borderRadius={4} />
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 }}>
                <SkeletonBox width={60} height={24} borderRadius={6} />
                <SkeletonBox width={80} height={13} borderRadius={5} />
              </View>
            </SkeletonCard>
          ) : weightData.length > 0 ? (
            <>
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
              <Card style={{ marginTop: 10 }}>
                <View style={styles.measureListHeader}>
                  <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                    Recent entries
                  </Text>
                </View>
                {(measurements?.measurements || []).slice(0, 5).map((m: any) => (
                  <Pressable
                    key={m.id}
                    onPress={() => router.push(`/measurements/edit?id=${m.id}` as any)}
                    style={[styles.measureRow, { borderBottomColor: theme.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }]}>
                        {m.weightKg != null ? `${m.weightKg} kg` : "—"}
                        {m.bodyFatPercent != null ? `  ·  ${m.bodyFatPercent}% BF` : ""}
                      </Text>
                      <Text style={[{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }]}>
                        {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    <Feather name="edit-2" size={15} color={theme.textMuted} />
                  </Pressable>
                ))}
              </Card>
            </>
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
        {nutritionLoading ? (
          <SkeletonCard>
            <SkeletonBox width="35%" height={15} borderRadius={6} style={{ marginBottom: 14 }} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <SkeletonBox width={52} height={32} borderRadius={8} />
                <SkeletonBox width={70} height={12} borderRadius={4} />
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: "transparent" }} />
              <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <SkeletonBox width={52} height={32} borderRadius={8} />
                <SkeletonBox width={70} height={12} borderRadius={4} />
              </View>
            </View>
          </SkeletonCard>
        ) : nutritionStats ? (
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Nutrition</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg7DayCalories || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>7-day avg kcal</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(nutritionStats.avg30DayCalories || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>30-day avg kcal</Text>
              </View>
            </View>
            {caloriesData.length >= 2 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 4 }]}>
                  Calorie trend (last {caloriesData.length} days)
                </Text>
                <View style={{ height: 44, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
                  {caloriesData.map((v, i) => {
                    const max = Math.max(...caloriesData, 1);
                    const isLast = i === caloriesData.length - 1;
                    const h = Math.max((v / max) * 38 + 4, 4);
                    return (
                      <View
                        key={i}
                        style={{
                          flex: 1,
                          height: h,
                          backgroundColor: isLast ? theme.orange : theme.orange + "50",
                          borderRadius: 3,
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            )}
            <DonutChart
              data={[
                { label: "Protein", value: nutritionStats.macroSplit?.proteinPercentage || 0, color: theme.secondary },
                { label: "Carbs", value: nutritionStats.macroSplit?.carbsPercentage || 0, color: theme.warning },
                { label: "Fat", value: nutritionStats.macroSplit?.fatPercentage || 0, color: theme.orange },
              ]}
            />
          </Card>
        ) : (
          <Card>
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.cardAlt }]}>
                <Feather name="coffee" size={22} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>No nutrition data yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Log meals to see your calorie and macro breakdown here.
              </Text>
              <Pressable
                onPress={() => router.push("/meals/add" as any)}
                style={[styles.emptyBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "50" }]}
              >
                <Feather name="plus" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Log first meal</Text>
              </Pressable>
            </View>
          </Card>
        )}
        
        {/* Personal Records */}
        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Personal Records</Text>
          {recordsLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map(i => (
                <SkeletonCard key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 } as any}>
                  <SkeletonBox width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBox width="40%" height={12} borderRadius={4} />
                    <SkeletonBox width="60%" height={18} borderRadius={5} />
                  </View>
                  <SkeletonBox width={38} height={12} borderRadius={4} />
                </SkeletonCard>
              ))}
            </View>
          ) : records?.records?.length > 0 ? (
            <>
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
            </>
          ) : (
            <Card>
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.cardAlt }]}>
                  <Feather name="award" size={22} color={theme.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>No PRs yet</Text>
                <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Log gym workouts to automatically track your personal bests.
                </Text>
              </View>
            </Card>
          )}
        </View>
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
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, marginBottom: 12 },
  cardSub: { fontSize: 12, marginBottom: 8 },
  streaksRow: { flexDirection: "row", gap: 10 },
  streakCard: {
    flex: 1, alignItems: "center", gap: 4, padding: 14, borderRadius: 16, borderWidth: 1,
  },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 40 },
  pieChart: { gap: 10, marginTop: 8 },
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
  measureListHeader: { marginBottom: 10 },
  measureRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
