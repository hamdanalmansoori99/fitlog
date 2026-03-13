import React, { useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { ActivityItem } from "@/components/ActivityItem";
import { Card } from "@/components/ui/Card";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const { data: todayStats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["todayStats"],
    queryFn: api.getTodayStats,
  });
  
  const { data: weeklyData, refetch: refetchWeekly } = useQuery({
    queryKey: ["weeklyStats"],
    queryFn: api.getWeeklyStats,
  });
  
  const { data: recentData, refetch: refetchRecent } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: api.getRecentActivity,
  });
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchWeekly(), refetchRecent()]);
    setRefreshing(false);
  }, []);
  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 + bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {user?.firstName || "Friend"} {user?.lastName || ""}
            </Text>
            <Text style={[styles.date, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {formatDate()}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={[styles.avatarBtn, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}
          >
            <Text style={[styles.avatarText, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
              {user?.firstName?.[0] || "U"}
            </Text>
          </Pressable>
        </Animated.View>
        
        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Today</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsRow}>
              <StatCard
                icon="zap"
                value={todayStats?.caloriesBurned || 0}
                label="Cal Burned"
                color={theme.orange}
              />
              <StatCard
                icon="clock"
                value={`${todayStats?.activeMinutes || 0}m`}
                label="Active"
                color={theme.secondary}
              />
              <StatCard
                icon="check-circle"
                value={todayStats?.workoutsCompleted || 0}
                label="Workouts"
                color={theme.primary}
              />
              <StatCard
                icon="coffee"
                value={todayStats?.mealsLogged || 0}
                label="Meals"
                color={theme.pink}
              />
            </View>
          </ScrollView>
        </Animated.View>
        
        {/* Weekly Chart */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <Card>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Weekly Activity
            </Text>
            <Text style={[styles.cardSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Active minutes per day
            </Text>
            {weeklyData?.days ? (
              <WeeklyBarChart data={weeklyData.days} />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Log workouts to see your weekly activity
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>
        
        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Recent Activity
          </Text>
          <Card padding={0}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
              {recentData?.activities?.length > 0 ? (
                recentData.activities.map((activity: any, i: number) => (
                  <ActivityItem
                    key={`${activity.type}-${activity.id}`}
                    type={activity.type}
                    name={activity.name}
                    date={activity.date}
                    keyStat={activity.keyStat}
                    activityType={activity.activityType}
                  />
                ))
              ) : (
                <View style={styles.emptyActivity}>
                  <Feather name="activity" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    No activity yet
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Tap + to log your first workout!
                  </Text>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
      
      {/* FAB */}
      <View style={[styles.fabWrap, { bottom: 90 + bottomPad }]}>
        <FABMenu theme={theme} />
      </View>
    </View>
  );
}

function FABMenu({ theme }: { theme: any }) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <View style={styles.fab}>
      {open && (
        <>
          <Pressable
            onPress={() => { setOpen(false); router.push("/meals/add"); }}
            style={[styles.fabOption, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="coffee" size={18} color={theme.pink} />
            <Text style={[styles.fabOptionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Log Meal</Text>
          </Pressable>
          <Pressable
            onPress={() => { setOpen(false); router.push("/workouts/log"); }}
            style={[styles.fabOption, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="activity" size={18} color={theme.primary} />
            <Text style={[styles.fabOptionText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>Log Workout</Text>
          </Pressable>
        </>
      )}
      <Pressable
        onPress={() => setOpen(!open)}
        style={[styles.fabMain, { backgroundColor: theme.primary }]}
      >
        <Feather name={open ? "x" : "plus"} size={26} color="#0f0f1a" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, marginBottom: 20,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  name: { fontSize: 26, lineHeight: 32 },
  date: { fontSize: 13, marginTop: 4 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  statsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", gap: 12, paddingRight: 20 },
  cardTitle: { fontSize: 15, marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 16 },
  emptyChart: { height: 80, justifyContent: "center", alignItems: "center" },
  emptyActivity: { paddingVertical: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15 },
  emptyText: { fontSize: 13, textAlign: "center" },
  fabWrap: { position: "absolute", right: 20 },
  fab: { alignItems: "flex-end", gap: 10 },
  fabMain: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#00e676", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabOptionText: { fontSize: 14 },
});
