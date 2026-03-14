import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator,
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
import { useToast } from "@/components/ui/Toast";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const CAT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Breakfast: "sun",
  Lunch: "cloud",
  Dinner: "moon",
  Snacks: "coffee",
};

function MacroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.macroBadge}>
      <Text style={[styles.macroVal, { color, fontFamily: "Inter_600SemiBold" }]}>{Math.round(value)}g</Text>
      <Text style={[styles.macroLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

function ProgressRing({ current, goal, size = 80 }: { current: number; goal: number; size?: number }) {
  const { theme } = useTheme();
  const pct = Math.min(goal > 0 ? current / goal : 0, 1);
  const isOver = current > goal;
  const color = isOver ? theme.danger : theme.primary;
  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <View style={[styles.ringOuter, { width: size, height: size, borderRadius: size / 2, borderColor: theme.border }]}>
        <View style={[styles.ringInner, {
          width: size - 12, height: size - 12, borderRadius: (size - 12) / 2,
          borderColor: color,
          borderLeftColor: pct < 0.25 ? theme.border : color,
          borderBottomColor: pct < 0.5 ? theme.border : color,
          borderRightColor: pct < 0.75 ? theme.border : color,
        }]} />
      </View>
      <View style={styles.ringContent}>
        <Text style={[styles.ringPct, { color: isOver ? theme.danger : theme.text, fontFamily: "Inter_700Bold", fontSize: size * 0.2 }]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
    </View>
  );
}

function CalorieSummary({ data }: { data: any }) {
  const { theme } = useTheme();
  const { dailyTotals, calorieGoal } = data;
  const isOver = calorieGoal && dailyTotals.calories > calorieGoal;
  return (
    <Card style={styles.calCard}>
      <View style={styles.calRow}>
        {calorieGoal && <ProgressRing current={dailyTotals.calories} goal={calorieGoal} />}
        <View style={styles.calInfo}>
          <View style={styles.calMain}>
            <Text style={[styles.calValue, { color: isOver ? theme.danger : theme.primary, fontFamily: "Inter_700Bold" }]}>
              {Math.round(dailyTotals.calories)}
            </Text>
            <Text style={[styles.calUnit, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {calorieGoal ? `/ ${calorieGoal} kcal` : "kcal today"}
            </Text>
          </View>
          {calorieGoal && (
            <Text style={{ color: isOver ? theme.danger : theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
              {isOver
                ? `${Math.round(dailyTotals.calories - calorieGoal)} kcal over goal`
                : `${Math.round(calorieGoal - dailyTotals.calories)} kcal remaining`}
            </Text>
          )}
          <View style={styles.macrosRow}>
            <MacroBadge label="Protein" value={dailyTotals.proteinG} color={theme.secondary} />
            <MacroBadge label="Carbs" value={dailyTotals.carbsG} color={theme.warning} />
            <MacroBadge label="Fat" value={dailyTotals.fatG} color={theme.orange} />
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function MealsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingFavId, setSavingFavId] = useState<number | null>(null);
  const [mealPlan, setMealPlan] = useState<any[] | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const { showToast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === today;

  const { data, isLoading: mealsLoading } = useQuery({
    queryKey: ["meals", selectedDate],
    queryFn: () => api.getMeals(selectedDate),
  });

  const { data: favData } = useQuery({
    queryKey: ["favoriteMeals"],
    queryFn: api.getFavoriteMeals,
  });

  const { data: freqData } = useQuery({
    queryKey: ["frequentMeals"],
    queryFn: () => api.getFrequentMeals(6),
    staleTime: 120000,
  });

  const meals = data?.meals || [];
  const favorites: any[] = favData?.favorites || [];
  const frequentMeals: any[] = freqData?.meals || [];
  const favNames = new Set(favorites.map((f: any) => f.name.toLowerCase()));
  const frequentOnly = frequentMeals.filter(m => !favNames.has(m.name.toLowerCase()));

  function invalidateMealRelated() {
    queryClient.invalidateQueries({ queryKey: ["meals"] });
    queryClient.invalidateQueries({ queryKey: ["mealsToday"] });
    queryClient.invalidateQueries({ queryKey: ["todayStats"] });
    queryClient.invalidateQueries({ queryKey: ["nutritionStats"] });
    queryClient.invalidateQueries({ queryKey: ["streaks"] });
    queryClient.invalidateQueries({ queryKey: ["achievements"] });
  }

  const deleteMutation = useMutation({
    mutationFn: api.deleteMeal,
    onSuccess: () => {
      invalidateMealRelated();
      showToast("Meal deleted", "success");
    },
    onError: () => showToast("Could not delete meal. Please try again.", "error"),
  });

  const saveFavMutation = useMutation({
    mutationFn: (mealId: number) => api.addFavoriteMeal({ sourceMealId: mealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
      setSavingFavId(null);
      showToast("Saved to favourites ⭐", "success");
    },
    onError: () => {
      setSavingFavId(null);
      showToast("Could not save favourite. Please try again.", "error");
    },
  });

  const logFavMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => api.logFavoriteMeal(id),
    onSuccess: () => {
      invalidateMealRelated();
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedDate(today);
      showToast("Meal logged!", "success");
    },
    onError: () => showToast("Could not log meal. Please try again.", "error"),
  });

  const deleteFavMutation = useMutation({
    mutationFn: (id: number) => api.deleteFavoriteMeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
      showToast("Removed from favourites", "success");
    },
    onError: () => showToast("Could not remove favourite", "error"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (fromDate: string) => api.duplicateDayMeals(fromDate),
    onSuccess: (res: any) => {
      invalidateMealRelated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedDate(today);
      showToast(`${res.count} meal${res.count !== 1 ? "s" : ""} copied to today`, "success");
    },
    onError: () => showToast("Could not copy meals. Please try again.", "error"),
  });

  const duplicateMealMutation = useMutation({
    mutationFn: ({ id, targetDate }: { id: number; targetDate?: string }) =>
      api.duplicateMeal(id, targetDate),
    onSuccess: () => {
      invalidateMealRelated();
      queryClient.invalidateQueries({ queryKey: ["frequentMeals"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isToday) setSelectedDate(today);
      showToast("Meal copied to today", "success");
    },
    onError: () => showToast("Could not copy meal. Please try again.", "error"),
  });

  const logFrequentMutation = useMutation({
    mutationFn: (latestMealId: number) => api.duplicateMeal(latestMealId),
    onSuccess: () => {
      invalidateMealRelated();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedDate(today);
      showToast("Meal logged!", "success");
    },
    onError: () => showToast("Could not log meal. Please try again.", "error"),
  });

  const generatePlanMutation = useMutation({
    mutationFn: () => api.generateMealPlan({}),
    onSuccess: (res: any) => {
      setMealPlan(res.meals || []);
      setPlanOpen(true);
    },
    onError: (err: any) => {
      if (err?.message?.includes("Premium")) {
        showToast("AI meal plans are a Premium feature", "error");
      } else {
        showToast("Could not generate meal plan. Please try again.", "error");
      }
    },
  });

  function handleSaveAsFavorite(meal: any) {
    setSavingFavId(meal.id);
    saveFavMutation.mutate(meal.id);
  }

  function handleDuplicateDay() {
    Alert.alert(
      "Copy to Today?",
      `Copy all meals from ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} to today?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Copy", onPress: () => duplicateMutation.mutate(selectedDate) },
      ]
    );
  }

  function handleDuplicateMeal(meal: any) {
    if (isToday) {
      Alert.alert(
        "Duplicate Meal",
        `Add another "${meal.name}" to today?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add", onPress: () => duplicateMealMutation.mutate({ id: meal.id }) },
        ]
      );
    } else {
      Alert.alert(
        "Copy to Today",
        `Copy "${meal.name}" to today's log?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Copy", onPress: () => duplicateMealMutation.mutate({ id: meal.id }) },
        ]
      );
    }
  }

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const showQuickLog = favorites.length > 0 || frequentOnly.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Meals</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/meals/add"); }}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={22} color="#0f0f1a" />
        </Pressable>
      </View>

      {/* Date picker */}
      <View style={[styles.datePicker, { borderColor: theme.border }]}>
        <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Feather name="chevron-left" size={22} color={theme.textMuted} />
        </Pressable>
        <Text style={[styles.dateText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {isToday ? "Today" : new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
        <Pressable onPress={() => changeDate(1)} style={styles.dateArrow} disabled={isToday}>
          <Feather name="chevron-right" size={22} color={isToday ? theme.border : theme.textMuted} />
        </Pressable>
        {!isToday && (
          <Pressable
            onPress={handleDuplicateDay}
            disabled={duplicateMutation.isPending}
            style={[styles.copyBtn, { backgroundColor: theme.secondaryDim, borderColor: theme.secondary + "40" }]}
          >
            <Feather name="copy" size={13} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              {duplicateMutation.isPending ? "Copying…" : "Copy to Today"}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + bottomPad, gap: 16 }}
      >
        {/* ── Quick Log (Favourites + Frequent) ── */}
        {showQuickLog && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
            <View style={styles.quickLogHeader}>
              <Text style={[styles.quickLogTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Quick Log</Text>
              <Text style={[styles.quickLogSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Tap to log instantly</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingRight: 28 }}>
                {/* Favourites */}
                {favorites.map((fav: any) => (
                  <View key={`fav-${fav.id}`} style={[styles.favCard, { backgroundColor: theme.card, borderColor: theme.primary + "30" }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <View style={[styles.favIcon, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="star" size={13} color={theme.primary} />
                      </View>
                      <Pressable
                        onPress={() => Alert.alert("Remove Favourite?", `Remove "${fav.name}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: () => deleteFavMutation.mutate(fav.id) },
                        ])}
                        hitSlop={6}
                      >
                        <Feather name="x" size={13} color={theme.textMuted} />
                      </Pressable>
                    </View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={2}>{fav.name}</Text>
                    <Text style={{ color: theme.orange, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>{Math.round(fav.totalCalories)} kcal</Text>
                    {fav.totalProteinG > 0 && (
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>{Math.round(fav.totalProteinG)}g protein</Text>
                    )}
                    {fav.usageCount > 1 && (
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>Used {fav.usageCount}×</Text>
                    )}
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logFavMutation.mutate({ id: fav.id }); }}
                      disabled={logFavMutation.isPending}
                      style={[styles.logNowBtn, { backgroundColor: theme.primary }]}
                    >
                      <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 12 }}>Log Now</Text>
                    </Pressable>
                  </View>
                ))}

                {/* Frequent (non-starred) */}
                {frequentOnly.map((meal: any, idx: number) => (
                  <View key={`freq-${idx}`} style={[styles.favCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <View style={[styles.favIcon, { backgroundColor: theme.secondaryDim }]}>
                        <Feather name="repeat" size={13} color={theme.secondary} />
                      </View>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{meal.use_count}× logged</Text>
                    </View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={2}>{meal.name}</Text>
                    <Text style={{ color: theme.orange, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>{Math.round(meal.avg_calories)} kcal</Text>
                    {meal.avg_protein_g > 0 && (
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>{Math.round(meal.avg_protein_g)}g protein</Text>
                    )}
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logFrequentMutation.mutate(meal.latest_meal_id); }}
                      disabled={logFrequentMutation.isPending}
                      style={[styles.logNowBtn, { backgroundColor: theme.secondary }]}
                    >
                      <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 12 }}>Log Again</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Calorie summary */}
        {mealsLoading ? (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <SkeletonCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <SkeletonBox width={80} height={80} borderRadius={40} />
                <View style={{ flex: 1, gap: 10 }}>
                  <SkeletonBox width="55%" height={34} borderRadius={8} />
                  <SkeletonBox width="70%" height={13} borderRadius={6} />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 12 }}>
                <SkeletonBox width={56} height={38} borderRadius={8} />
                <SkeletonBox width={56} height={38} borderRadius={8} />
                <SkeletonBox width={56} height={38} borderRadius={8} />
              </View>
            </SkeletonCard>
          </Animated.View>
        ) : data ? (
          <CalorieSummary data={data} />
        ) : null}

        {/* AI Meal Plan Generator */}
        {isToday && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            {!planOpen ? (
              <Pressable
                onPress={() => { if (!generatePlanMutation.isPending) generatePlanMutation.mutate(); }}
                style={[styles.planBanner, { backgroundColor: theme.secondaryDim, borderColor: theme.secondary + "40" }]}
              >
                {generatePlanMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.secondary} />
                ) : (
                  <View style={[styles.planBannerIcon, { backgroundColor: theme.secondary + "25" }]}>
                    <Feather name="cpu" size={15} color={theme.secondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {generatePlanMutation.isPending ? "Generating your plan…" : "Generate today's meal plan"}
                  </Text>
                  <Text style={{ color: theme.secondary + "aa", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                    AI-tailored to your calorie & macro goals · Premium
                  </Text>
                </View>
                {!generatePlanMutation.isPending && (
                  <Feather name="chevron-right" size={18} color={theme.secondary} />
                )}
              </Pressable>
            ) : (
              <View style={[styles.planCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.planBannerIcon, { backgroundColor: theme.secondaryDim }]}>
                      <Feather name="cpu" size={15} color={theme.secondary} />
                    </View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>AI Meal Plan</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable onPress={() => generatePlanMutation.mutate()} hitSlop={8}>
                      <Feather name="refresh-cw" size={16} color={theme.textMuted} />
                    </Pressable>
                    <Pressable onPress={() => setPlanOpen(false)} hitSlop={8}>
                      <Feather name="x" size={16} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>
                {(mealPlan ?? []).map((meal: any, i: number) => (
                  <View key={i} style={[styles.planMealRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{meal.name}</Text>
                      {meal.description ? (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, lineHeight: 16 }} numberOfLines={2}>{meal.description}</Text>
                      ) : null}
                      <Text style={{ color: theme.warning, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 }}>
                        {meal.calories} kcal · {meal.proteinG}g P · {meal.carbsG}g C · {meal.fatG}g F
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push({
                        pathname: "/meals/add",
                        params: {
                          prefillName: meal.name,
                          prefillCalories: meal.calories,
                          prefillProtein: meal.proteinG,
                          prefillCarbs: meal.carbsG,
                          prefillFat: meal.fatG,
                          category: meal.category ?? "Lunch",
                        }
                      })}
                      style={[styles.planAddBtn, { backgroundColor: theme.primary }]}
                    >
                      <Feather name="plus" size={14} color="#0f0f1a" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* First meal empty state */}
        {!mealsLoading && data && meals.length === 0 && isToday && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={[styles.firstMealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.firstMealIcon, { backgroundColor: theme.orange + "20" }]}>
                <Feather name="sun" size={28} color={theme.orange} />
              </View>
              <Text style={[styles.firstMealTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {new Date().getHours() < 11 ? "Start your day right!" : new Date().getHours() < 15 ? "Time for lunch?" : "How's your nutrition today?"}
              </Text>
              <Text style={[styles.firstMealSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Log your meals to track calories and macros. Save favourites for even faster logging next time.
              </Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/meals/add"); }}
                style={[styles.firstMealBtn, { backgroundColor: theme.orange + "20", borderColor: theme.orange + "50" }]}
              >
                <Feather name="plus" size={14} color={theme.orange} />
                <Text style={{ color: theme.orange, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Log first meal</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Past-day empty state */}
        {!mealsLoading && data && meals.length === 0 && !isToday && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={[styles.firstMealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.firstMealIcon, { backgroundColor: theme.secondary + "20" }]}>
                <Feather name="calendar" size={28} color={theme.secondary} />
              </View>
              <Text style={[styles.firstMealTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Nothing logged
              </Text>
              <Text style={[styles.firstMealSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No meals were recorded for this day.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Meal categories */}
        {CATEGORIES.map((cat) => {
          const catMeals = meals.filter((m: any) => m.category.toLowerCase() === cat.toLowerCase());
          const catCals = catMeals.reduce((s: number, m: any) => s + m.totalCalories, 0);
          const catIcon = CAT_ICONS[cat] || "coffee";

          return (
            <Animated.View key={cat} entering={FadeInDown.duration(300)}>
              <View style={styles.catHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name={catIcon} size={14} color={theme.textMuted} />
                  <Text style={[styles.catTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{cat}</Text>
                </View>
                <Text style={[styles.catCals, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {Math.round(catCals)} kcal
                </Text>
              </View>

              {catMeals.map((meal: any) => {
                const isSavingThis = savingFavId === meal.id && saveFavMutation.isPending;
                const isDuplicating = duplicateMealMutation.isPending;

                return (
                  <Pressable
                    key={meal.id}
                    onPress={() => router.push({ pathname: "/meals/[id]" as any, params: { id: meal.id } })}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                  <Card style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <View style={[styles.mealIcon, { backgroundColor: theme.orange + "20" }]}>
                        <Feather name={catIcon} size={18} color={theme.orange} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.mealName, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{meal.name}</Text>
                        <Text style={[styles.mealCals, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                          {Math.round(meal.totalCalories)} kcal
                        </Text>
                      </View>
                      {/* Star / Save as favourite */}
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); handleSaveAsFavorite(meal); }}
                        disabled={isSavingThis}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="star" size={17} color={isSavingThis ? theme.warning : theme.textMuted} />
                      </Pressable>
                      {/* Duplicate to today */}
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); handleDuplicateMeal(meal); }}
                        disabled={isDuplicating}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="copy" size={16} color={theme.secondary} />
                      </Pressable>
                      {/* Delete */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert("Delete meal?", "This cannot be undone.", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(meal.id) },
                          ]);
                        }}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="trash-2" size={16} color={theme.danger} />
                      </Pressable>
                    </View>

                    <View style={styles.mealMacros}>
                      <Text style={[styles.mealMacro, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>P: {Math.round(meal.totalProteinG)}g</Text>
                      <Text style={[styles.mealMacro, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>C: {Math.round(meal.totalCarbsG)}g</Text>
                      <Text style={[styles.mealMacro, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>F: {Math.round(meal.totalFatG)}g</Text>
                      <Text style={[styles.mealMacro, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{meal.foodItems.length} item{meal.foodItems.length !== 1 ? "s" : ""}</Text>
                    </View>
                  </Card>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => router.push({ pathname: "/meals/add", params: { category: cat } })}
                style={[styles.addMealBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus" size={16} color={theme.textMuted} />
                <Text style={[styles.addMealText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Add {cat}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  datePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 20, marginBottom: 8, borderWidth: 1, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12, gap: 10, flexWrap: "wrap",
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 16, minWidth: 100, textAlign: "center" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  quickLogHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quickLogTitle: { fontSize: 16 },
  quickLogSub: { fontSize: 12 },
  favCard: { width: 155, borderRadius: 16, borderWidth: 1, padding: 12 },
  favIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logNowBtn: { marginTop: 10, paddingVertical: 7, borderRadius: 8, alignItems: "center" },

  calCard: { gap: 0 },
  calRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringContainer: { position: "relative", alignItems: "center", justifyContent: "center" },
  ringOuter: { borderWidth: 6, position: "absolute" },
  ringInner: { borderWidth: 6, position: "absolute" },
  ringContent: { alignItems: "center", justifyContent: "center" },
  ringPct: {},
  calInfo: { flex: 1, gap: 6 },
  calMain: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  calValue: { fontSize: 32 },
  calUnit: { fontSize: 14 },
  macrosRow: { flexDirection: "row", gap: 12 },
  macroBadge: { alignItems: "center" },
  macroVal: { fontSize: 15 },
  macroLabel: { fontSize: 11 },

  catHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  catTitle: { fontSize: 15 },
  catCals: { fontSize: 13 },
  mealCard: { marginBottom: 8, gap: 8 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealName: { fontSize: 14 },
  mealCals: { fontSize: 13, marginTop: 1 },
  mealMacros: { flexDirection: "row", gap: 12 },
  mealMacro: { fontSize: 12 },
  addMealBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", marginBottom: 4 },
  addMealText: { fontSize: 14 },

  firstMealCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 10 },
  firstMealIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  firstMealTitle: { fontSize: 17, textAlign: "center" },
  firstMealSub: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 280 },
  firstMealBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },

  planBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  planBannerIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  planCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  planMealRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  planAddBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
