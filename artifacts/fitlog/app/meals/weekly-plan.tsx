import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { useWeeklyPlanStore, PlannedDay, PlannedMeal } from "@/store/weeklyPlanStore";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_COLORS: Record<string, string> = {
  Breakfast: "#ffab40",
  Lunch: "#00e676",
  Dinner: "#448aff",
  Snacks: "#e040fb",
};

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return DAY_LABELS[d.getDay()] + " " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface MealRowProps {
  meal: PlannedMeal;
  date: string;
  onLog: (meal: PlannedMeal, date: string) => void;
  loggingId: string | null;
  theme: any;
}

function MealRow({ meal, date, onLog, loggingId, theme }: MealRowProps) {
  const id = `${date}-${meal.category}-${meal.name}`;
  const accent = CATEGORY_COLORS[meal.category] ?? theme.primary;
  const isLogging = loggingId === id;

  return (
    <View style={[styles.mealRow, { borderColor: theme.border }]}>
      <View style={[styles.catDot, { backgroundColor: accent }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
          {meal.description}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          <Text style={{ color: accent, fontFamily: "Inter_500Medium", fontSize: 11 }}>{meal.calories} kcal</Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>P {meal.proteinG}g</Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>C {meal.carbsG}g</Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>F {meal.fatG}g</Text>
        </View>
      </View>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onLog(meal, date); }}
        disabled={isLogging}
        style={({ pressed }) => [
          styles.logBtn,
          { backgroundColor: theme.primaryDim, borderColor: theme.primary + "40", opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {isLogging ? (
          <ActivityIndicator size={12} color={theme.primary} />
        ) : (
          <Feather name="plus" size={14} color={theme.primary} />
        )}
      </Pressable>
    </View>
  );
}

interface DayCardProps {
  day: PlannedDay;
  isLogged: boolean;
  loggedCalories: number;
  loggedMealsCount: number;
  onLog: (meal: PlannedMeal, date: string) => void;
  loggingId: string | null;
  theme: any;
}

function DayCard({ day, isLogged, loggedCalories, loggedMealsCount, onLog, loggingId, theme }: DayCardProps) {
  const [open, setOpen] = useState(
    day.date === new Date().toISOString().split("T")[0] || !isLogged
  );

  const totalCals = day.meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = day.meals.reduce((s, m) => s + m.proteinG, 0);

  return (
    <Card style={{ gap: 0, padding: 0, overflow: "hidden" }}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen((o) => !o); }}
        style={[styles.dayHeader, { borderBottomColor: open ? theme.border : "transparent" }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 15 }}>
            {getDayLabel(day.date)}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {isLogged
              ? `${loggedMealsCount} meal${loggedMealsCount !== 1 ? "s" : ""} logged · ${loggedCalories} kcal actual`
              : `${totalCals} kcal planned · ${totalProtein}g protein`}
          </Text>
        </View>
        {isLogged && (
          <View style={[styles.loggedBadge, { backgroundColor: theme.primaryDim }]}>
            <Feather name="check" size={12} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Logged</Text>
          </View>
        )}
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textMuted}
          style={{ marginLeft: 8 }}
        />
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4, paddingTop: 8 }}>
          {day.meals.map((meal, i) => (
            <MealRow
              key={i}
              meal={meal}
              date={day.date}
              onLog={onLog}
              loggingId={loggingId}
              theme={theme}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Produce: "sun",
  Proteins: "zap",
  Dairy: "droplet",
  Grains: "layers",
  Pantry: "archive",
  Frozen: "thermometer",
  Other: "shopping-bag",
  Beverages: "coffee",
  Oils: "droplet",
  Spices: "wind",
  Condiments: "star",
};

function getCategoryIcon(name: string): keyof typeof Feather.glyphMap {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "shopping-bag";
}

export default function WeeklyPlanScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { showToast } = useToast();
  const { plan, generatedAt, setPlan, clearPlan } = useWeeklyPlanStore();
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [groceryList, setGroceryList] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const generateMutation = useMutation({
    mutationFn: () => api.generateWeekPlan({}),
    onSuccess: (data) => {
      if (data?.days) {
        setPlan(data.days);
        showToast("7-day meal plan generated!", "success");
      } else {
        showToast("Could not parse plan. Please try again.", "error");
      }
    },
    onError: (err: any) => {
      if (err?.message?.includes("Premium")) {
        showToast("Weekly meal plan is a Premium feature", "error");
      } else {
        showToast("Could not generate plan. Please try again.", "error");
      }
    },
  });

  const logMealMutation = useMutation({
    mutationFn: ({ meal, date }: { meal: PlannedMeal; date: string }) =>
      api.createMeal({
        name: meal.name,
        category: meal.category,
        date,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
      }),
    onSuccess: () => {
      showToast("Meal logged!", "success");
      setLoggingId(null);
    },
    onError: () => {
      showToast("Could not log meal. Please try again.", "error");
      setLoggingId(null);
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 300000,
  });

  const today = new Date().toISOString().split("T")[0];
  const sevenDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, []);

  const { data: logsPerDay } = useQuery({
    queryKey: ["weeklyMealLogs", today],
    queryFn: async () => {
      const results: Record<string, { count: number; calories: number }> = {};
      await Promise.all(
        sevenDays.map(async (date) => {
          try {
            const data = await api.getMeals(date);
            const meals: any[] = data?.meals ?? [];
            results[date] = {
              count: meals.length,
              calories: Math.round(data?.dailyTotals?.calories ?? meals.reduce((s: number, m: any) => s + (m.totalCalories ?? 0), 0)),
            };
          } catch {
            results[date] = { count: 0, calories: 0 };
          }
        })
      );
      return results;
    },
    staleTime: 60000,
  });

  const handleLogMeal = (meal: PlannedMeal, date: string) => {
    const id = `${date}-${meal.category}-${meal.name}`;
    setLoggingId(id);
    logMealMutation.mutate({ meal, date });
  };

  const groceryMutation = useMutation({
    mutationFn: () => {
      if (!plan) throw new Error("No plan");
      const allMeals = plan.flatMap(d => d.meals.map(m => ({ name: m.name, description: m.description })));
      return api.generateGroceryList(allMeals);
    },
    onSuccess: (data) => {
      if (data?.categories) {
        setGroceryList(data);
        setCheckedItems(new Set());
        setGroceryOpen(true);
      } else {
        showToast("Could not generate grocery list.", "error");
      }
    },
    onError: (err: any) => {
      if (err?.message?.includes("Premium")) {
        showToast("Grocery list is a Premium feature", "error");
      } else {
        showToast("Could not generate grocery list.", "error");
      }
    },
  });

  const toggleItem = (itemKey: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  const generatedLabel = generatedAt
    ? `Generated ${new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Weekly Meal Plan</Text>
          {generatedLabel && (
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
              {generatedLabel}
            </Text>
          )}
        </View>
        {plan && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (groceryList) {
                  setGroceryOpen(true);
                } else {
                  groceryMutation.mutate();
                }
              }}
              disabled={groceryMutation.isPending}
              hitSlop={12}
              style={{ padding: 6 }}
            >
              {groceryMutation.isPending ? (
                <ActivityIndicator size={16} color={theme.primary} />
              ) : (
                <Feather name="shopping-cart" size={18} color={theme.primary} />
              )}
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearPlan(); }}
              hitSlop={12}
              style={{ padding: 6 }}
            >
              <Feather name="trash-2" size={18} color={theme.textMuted} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 12 }}
      >
        {/* Generate button */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              generateMutation.mutate();
            }}
            disabled={generateMutation.isPending}
            style={({ pressed }) => [
              styles.generateBtn,
              {
                backgroundColor: generateMutation.isPending ? theme.primaryDim : theme.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {generateMutation.isPending ? (
              <>
                <ActivityIndicator size={18} color="#0f0f1a" />
                <Text style={[styles.generateBtnText, { color: "#0f0f1a", fontFamily: "Inter_700Bold" }]}>
                  Generating your week…
                </Text>
              </>
            ) : (
              <>
                <Feather name="cpu" size={18} color="#0f0f1a" />
                <Text style={[styles.generateBtnText, { color: "#0f0f1a", fontFamily: "Inter_700Bold" }]}>
                  {plan ? "Regenerate Full Week" : "Generate Full Week"}
                </Text>
              </>
            )}
          </Pressable>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 6 }}>
            AI-tailored to your calorie and protein goals · Premium
          </Text>
        </Animated.View>

        {!plan && !generateMutation.isPending && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Card style={{ alignItems: "center", gap: 12, paddingVertical: 36 }}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primaryDim }]}>
                <Feather name="calendar" size={28} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>No plan yet</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 240 }}>
                Generate a full 7-day meal plan tailored to your goals — then log any meal with one tap.
              </Text>
            </Card>
          </Animated.View>
        )}

        {plan && plan.map((day, i) => {
          const logs = logsPerDay?.[day.date];
          return (
            <Animated.View key={day.date} entering={FadeInDown.delay(i * 40).duration(300)}>
              <DayCard
                day={day}
                isLogged={!!logs && logs.count > 0}
                loggedCalories={logs?.calories ?? 0}
                loggedMealsCount={logs?.count ?? 0}
                onLog={handleLogMeal}
                loggingId={loggingId}
                theme={theme}
              />
            </Animated.View>
          );
        })}

        {plan && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (groceryList) {
                  setGroceryOpen(true);
                } else {
                  groceryMutation.mutate();
                }
              }}
              disabled={groceryMutation.isPending}
              style={({ pressed }) => [
                styles.groceryBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {groceryMutation.isPending ? (
                <>
                  <ActivityIndicator size={16} color={theme.primary} />
                  <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    Generating grocery list…
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.groceryIconWrap, { backgroundColor: theme.primaryDim }]}>
                    <Feather name="shopping-cart" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {groceryList ? "View Grocery List" : "Generate Grocery List"}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      AI-compiled shopping list from your plan
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textMuted} />
                </>
              )}
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={groceryOpen} transparent animationType="slide" onRequestClose={() => setGroceryOpen(false)}>
        <View style={[styles.groceryModal, { backgroundColor: theme.background }]}>
          <View style={[styles.groceryModalHeader, { paddingTop: topPad + 12, borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setGroceryOpen(false)} hitSlop={12} style={{ padding: 4 }}>
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" }}>
              Grocery List
            </Text>
            <Pressable
              onPress={() => {
                setCheckedItems(new Set());
                showToast("Cleared all checkmarks", "success");
              }}
              hitSlop={12}
              style={{ padding: 4 }}
            >
              <Feather name="rotate-ccw" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
          >
            {groceryList?.categories?.map((cat: any, catIdx: number) => {
              const catIcon = getCategoryIcon(cat.name);
              return (
                <View key={catIdx}>
                  <View style={styles.groceryCatHeader}>
                    <Feather name={catIcon} size={16} color={theme.primary} />
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {cat.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {cat.items?.length || 0}
                    </Text>
                  </View>
                  <Card style={{ gap: 0, padding: 0 }}>
                    {cat.items?.map((item: any, itemIdx: number) => {
                      const key = `${catIdx}-${itemIdx}`;
                      const checked = checkedItems.has(key);
                      return (
                        <Pressable
                          key={itemIdx}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            toggleItem(key);
                          }}
                          style={[
                            styles.groceryItem,
                            { borderBottomColor: theme.border },
                            itemIdx === (cat.items?.length || 1) - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={[
                            styles.groceryCheck,
                            {
                              backgroundColor: checked ? theme.primary : "transparent",
                              borderColor: checked ? theme.primary : theme.border,
                            },
                          ]}>
                            {checked && <Feather name="check" size={12} color="#0f0f1a" />}
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              color: checked ? theme.textMuted : theme.text,
                              fontFamily: "Inter_500Medium",
                              fontSize: 14,
                              textDecorationLine: checked ? "line-through" : "none",
                            }}
                          >
                            {item.name}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                            {item.quantity}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </Card>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20 },
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14, borderRadius: 14, minHeight: 50,
  },
  generateBtnText: { fontSize: 16 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  dayHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  loggedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  mealRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  catDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  logBtn: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  groceryBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  groceryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  groceryModal: { flex: 1 },
  groceryModalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  groceryCatHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8,
  },
  groceryItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1,
  },
  groceryCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
});
