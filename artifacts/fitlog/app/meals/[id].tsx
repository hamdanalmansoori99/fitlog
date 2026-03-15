import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "react-i18next";
import { dateLocale } from "@/lib/rtl";

const CAT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Breakfast: "sun", Lunch: "cloud", Dinner: "moon", Snacks: "coffee", snacks: "coffee",
};

function MacroBar({ label, value, total, color, theme }: {
  label: string; value: number; total: number; color: string; theme: any;
}) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={styles.macroBarRow}>
      <Text style={[styles.macroBarLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <View style={[styles.macroBarTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.macroBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroBarVal, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
        {Math.round(value)}g
      </Text>
    </View>
  );
}

function FoodItemRow({ item, theme }: { item: any; theme: any }) {
  return (
    <View style={[styles.foodRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.foodName, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {item.name}
        </Text>
        {(item.portionSize || item.unit) ? (
          <Text style={[styles.foodPortion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {[item.portionSize, item.unit].filter(Boolean).join(" ")}
          </Text>
        ) : null}
      </View>
      <View style={styles.foodMacros}>
        <Text style={[styles.foodCal, { color: theme.orange, fontFamily: "Inter_600SemiBold" }]}>
          {Math.round(item.calories)} kcal
        </Text>
        <Text style={[styles.foodMacroText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          P:{Math.round(item.proteinG || 0)}g · C:{Math.round(item.carbsG || 0)}g · F:{Math.round(item.fatG || 0)}g
        </Text>
      </View>
    </View>
  );
}

export default function MealDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: meal, isLoading, isError } = useQuery({
    queryKey: ["meal", id],
    queryFn: () => api.getMeal(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMeal(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["mealsToday"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["nutritionStats"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      router.back();
    },
    onError: () => Alert.alert(t("common.error"), t("meals.failedToDeleteMeal")),
  });

  const handleDelete = () => {
    Alert.alert(
      t("meals.deleteMealTitle"),
      t("meals.deleteMealMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => deleteMutation.mutate() },
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

  if (isError || !meal) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={40} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("meals.mealNotFound")}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={[{ color: theme.primary, fontFamily: "Inter_500Medium" }]}>{t("common.goBack")}</Text>
        </Pressable>
      </View>
    );
  }

  const foodItems: any[] = meal.foodItems || [];
  const totalCal = foodItems.reduce((s: number, f: any) => s + (f.calories || 0), 0);
  const totalProtein = foodItems.reduce((s: number, f: any) => s + (f.proteinG || 0), 0);
  const totalCarbs = foodItems.reduce((s: number, f: any) => s + (f.carbsG || 0), 0);
  const totalFat = foodItems.reduce((s: number, f: any) => s + (f.fatG || 0), 0);
  const totalMacroG = totalProtein + totalCarbs + totalFat;

  const catKey = (meal.category || "").charAt(0).toUpperCase() + (meal.category || "").slice(1).toLowerCase();
  const catIcon: keyof typeof Feather.glyphMap = CAT_ICONS[catKey] || CAT_ICONS[meal.category] || "coffee";

  const dateStr = new Date(meal.date).toLocaleDateString(dateLocale(), {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {t("meals.mealDetail")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            onPress={() => router.push({ pathname: "/meals/add" as any, params: { editId: id } })}
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
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card>
            <View style={styles.mealHeader}>
              <View style={[styles.iconWrap, { backgroundColor: theme.orange + "20" }]}>
                <Feather name={catIcon} size={26} color={theme.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mealName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {meal.name}
                </Text>
                <Text style={[styles.mealCategory, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {catKey} · {dateStr}
                </Text>
              </View>
            </View>

            <View style={[styles.calBig, { borderColor: theme.border }]}>
              <Text style={[styles.calNum, { color: theme.orange, fontFamily: "Inter_700Bold" }]}>
                {Math.round(totalCal)}
              </Text>
              <Text style={[styles.calUnit, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("common.kcal")}
              </Text>
            </View>

            {totalMacroG > 0 && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <MacroBar label={t("common.protein")} value={totalProtein} total={totalMacroG} color={theme.secondary} theme={theme} />
                <MacroBar label={t("common.carbs")} value={totalCarbs} total={totalMacroG} color={theme.warning} theme={theme} />
                <MacroBar label={t("common.fat")} value={totalFat} total={totalMacroG} color={theme.orange} theme={theme} />
              </View>
            )}

            {meal.notes ? (
              <View style={[styles.notesWrap, { backgroundColor: theme.primaryDim, borderColor: theme.border }]}>
                <Feather name="file-text" size={13} color={theme.textMuted} />
                <Text style={[styles.notesText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {meal.notes}
                </Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {foodItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {t("meals.foodItemsCount", { count: foodItems.length })}
            </Text>
            <Card padding={0}>
              {foodItems.map((item: any, idx: number) => (
                <FoodItemRow key={item.id ?? idx} item={item} theme={theme} />
              ))}
            </Card>
          </Animated.View>
        )}

        {foodItems.length === 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Card>
              <View style={styles.emptyItems}>
                <Feather name="coffee" size={28} color={theme.border} />
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {t("meals.noFoodItems")}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <Pressable
            onPress={() => router.push({
              pathname: "/meals/add" as any,
              params: { category: meal.category },
            })}
            style={[styles.logAgainBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="plus-circle" size={16} color={theme.primary} />
            <Text style={[styles.logAgainText, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
              {t("meals.logAnother", { category: catKey.toLowerCase() })}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

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

  mealHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mealName: { fontSize: 20 },
  mealCategory: { fontSize: 13, marginTop: 3 },

  calBig: {
    flexDirection: "row", alignItems: "baseline", gap: 6,
    paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, marginVertical: 12,
  },
  calNum: { fontSize: 38 },
  calUnit: { fontSize: 16 },

  macroBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  macroBarLabel: { width: 48, fontSize: 12 },
  macroBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  macroBarFill: { height: "100%", borderRadius: 3 },
  macroBarVal: { width: 38, fontSize: 12, textAlign: "right" },

  notesWrap: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  notesText: { flex: 1, fontSize: 13, lineHeight: 18 },

  sectionTitle: { fontSize: 17, marginBottom: 10 },

  foodRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  foodName: { fontSize: 14 },
  foodPortion: { fontSize: 12, marginTop: 2 },
  foodMacros: { alignItems: "flex-end" },
  foodCal: { fontSize: 14 },
  foodMacroText: { fontSize: 11, marginTop: 2 },

  emptyItems: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 24 },
  emptyText: { fontSize: 13, textAlign: "center" },

  logAgainBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  logAgainText: { fontSize: 14 },
});
