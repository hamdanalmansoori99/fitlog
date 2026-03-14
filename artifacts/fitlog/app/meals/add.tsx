import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  ActivityIndicator, Image, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const UNITS = ["grams", "oz", "cups", "pieces", "servings", "ml"];

interface FoodItem {
  name: string;
  portionSize: string;
  unit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

function emptyFood(): FoodItem {
  return { name: "", portionSize: "", unit: "grams", calories: "", proteinG: "", carbsG: "", fatG: "" };
}

const COMMON_SERVINGS: Record<string, { size: number; unit: string; label: string }[]> = {
  "chicken": [{ size: 100, unit: "grams", label: "100g" }, { size: 150, unit: "grams", label: "150g" }, { size: 200, unit: "grams", label: "200g" }],
  "egg": [{ size: 1, unit: "pieces", label: "1 egg" }, { size: 2, unit: "pieces", label: "2 eggs" }, { size: 3, unit: "pieces", label: "3 eggs" }],
  "rice": [{ size: 75, unit: "grams", label: "75g dry" }, { size: 100, unit: "grams", label: "100g dry" }, { size: 200, unit: "grams", label: "200g cooked" }],
  "oat": [{ size: 50, unit: "grams", label: "50g" }, { size: 80, unit: "grams", label: "80g" }],
  "salmon": [{ size: 130, unit: "grams", label: "130g" }, { size: 180, unit: "grams", label: "180g" }],
  "tuna": [{ size: 120, unit: "grams", label: "120g (tin)" }, { size: 185, unit: "grams", label: "185g tin" }],
  "banana": [{ size: 1, unit: "pieces", label: "1 small" }, { size: 1, unit: "pieces", label: "1 large" }],
  "apple": [{ size: 1, unit: "pieces", label: "1 medium (~180g)" }],
  "bread": [{ size: 1, unit: "pieces", label: "1 slice" }, { size: 2, unit: "pieces", label: "2 slices" }],
  "pasta": [{ size: 75, unit: "grams", label: "75g dry" }, { size: 180, unit: "grams", label: "180g cooked" }],
  "milk": [{ size: 200, unit: "ml", label: "200ml" }, { size: 250, unit: "ml", label: "250ml" }],
  "yogurt": [{ size: 125, unit: "grams", label: "125g" }, { size: 200, unit: "grams", label: "200g" }],
  "protein": [{ size: 30, unit: "grams", label: "1 scoop (30g)" }, { size: 35, unit: "grams", label: "35g" }],
  "whey": [{ size: 30, unit: "grams", label: "1 scoop (30g)" }],
  "beef": [{ size: 100, unit: "grams", label: "100g" }, { size: 150, unit: "grams", label: "150g" }],
  "steak": [{ size: 180, unit: "grams", label: "180g" }, { size: 250, unit: "grams", label: "250g" }],
  "potato": [{ size: 150, unit: "grams", label: "1 medium (150g)" }, { size: 200, unit: "grams", label: "200g" }],
  "avocado": [{ size: 0.5, unit: "pieces", label: "½ avo" }, { size: 1, unit: "pieces", label: "1 avo" }],
  "peanut": [{ size: 30, unit: "grams", label: "30g" }, { size: 2, unit: "servings", label: "2 tbsp" }],
  "almond": [{ size: 28, unit: "grams", label: "28g (handful)" }],
};

function getServingSuggestions(name: string) {
  if (!name || name.length < 3) return [];
  const lower = name.toLowerCase();
  for (const key of Object.keys(COMMON_SERVINGS)) {
    if (lower.includes(key)) return COMMON_SERVINGS[key];
  }
  return [];
}

export default function AddMealScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  const [mealName, setMealName] = useState("");
  const [category, setCategory] = useState((params.category as string) || "Breakfast");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([emptyFood()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"form" | "confirm">("form");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: recentFoodsData } = useQuery({
    queryKey: ["recentFoods"],
    queryFn: () => api.getRecentFoods(25),
    staleTime: 60000,
  });
  const recentFoods: any[] = recentFoodsData?.foods || [];

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: todayData } = useQuery({
    queryKey: ["meals", todayStr],
    queryFn: () => api.getMeals(todayStr),
    staleTime: 30000,
  });
  const calorieGoal: number | null = todayData?.calorieGoal ?? null;
  const todayCalories: number = todayData?.dailyTotals?.calories ?? 0;

  const mutation = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["mealsToday"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["nutritionStats"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setSuccess(true);
      setTimeout(() => router.back(), 1800);
    },
    onError: (err: any) => setError(err.message),
  });

  const totalCalories = foodItems.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0);
  const totalProtein = foodItems.reduce((s, f) => s + (parseFloat(f.proteinG) || 0), 0);
  const totalCarbs = foodItems.reduce((s, f) => s + (parseFloat(f.carbsG) || 0), 0);
  const totalFat = foodItems.reduce((s, f) => s + (parseFloat(f.fatG) || 0), 0);

  const projectedTotal = todayCalories + totalCalories;
  const remaining = calorieGoal ? calorieGoal - projectedTotal : null;

  async function pickAndScanImage(source: "camera" | "library") {
    try {
      let result;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Camera access needed", "Allow camera access in settings."); return; }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: "images" });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Photo library access needed", "Allow photo access in settings."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: "images" });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError("Could not read image data. Try again."); return; }

      setPhotoUri(asset.uri);
      setScanning(true);
      setError("");

      const mimeType = asset.mimeType || "image/jpeg";
      const analysisResult = await api.analyzeMealPhoto(asset.base64, mimeType);

      setMealName(analysisResult.mealName || "");
      setFoodItems(
        (analysisResult.foods || []).map((f: any) => ({
          name: f.name,
          portionSize: String(f.portionSize),
          unit: f.unit || "grams",
          calories: String(f.calories),
          proteinG: String(f.proteinG),
          carbsG: String(f.carbsG),
          fatG: String(f.fatG),
        }))
      );
      setScanMode("confirm");
    } catch (err: any) {
      setError(err.message || "Failed to analyze photo. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  function showPhotoPicker() {
    Alert.alert("Scan Meal", "Take a photo or choose from your library", [
      { text: "Take Photo", onPress: () => pickAndScanImage("camera") },
      { text: "Choose from Library", onPress: () => pickAndScanImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function addRecentFood(food: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFood: FoodItem = {
      name: food.name,
      portionSize: String(Math.round(food.avgPortion) || 100),
      unit: food.unit || "grams",
      calories: String(Math.round(food.avgCalories) || ""),
      proteinG: String(Number(food.avgProteinG) || ""),
      carbsG: String(Number(food.avgCarbsG) || ""),
      fatG: String(Number(food.avgFatG) || ""),
    };
    const hasEmpty = foodItems.some(f => !f.name);
    if (hasEmpty) {
      setFoodItems(fi => {
        const idx = fi.findIndex(f => !f.name);
        return fi.map((f, i) => i === idx ? newFood : f);
      });
    } else {
      setFoodItems(fi => [...fi, newFood]);
    }
  }

  function duplicateFoodItem(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const copy = { ...foodItems[idx] };
    setFoodItems(fi => [...fi.slice(0, idx + 1), copy, ...fi.slice(idx + 1)]);
  }

  const handleSubmit = () => {
    if (!mealName.trim()) { setError("Meal name required"); return; }
    const valid = foodItems.filter(f => f.name);
    if (valid.length === 0) { setError("Add at least one food item"); return; }

    mutation.mutate({
      name: mealName,
      category,
      date: new Date(date + "T12:00:00").toISOString(),
      notes: notes || undefined,
      foodItems: valid.map(f => ({
        name: f.name,
        portionSize: parseFloat(f.portionSize) || 100,
        unit: f.unit,
        calories: parseFloat(f.calories) || 0,
        proteinG: parseFloat(f.proteinG) || 0,
        carbsG: parseFloat(f.carbsG) || 0,
        fatG: parseFloat(f.fatG) || 0,
      })),
    });
  };

  if (success) {
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <View style={[styles.successCircle, { backgroundColor: theme.primaryDim }]}>
          <Feather name="check" size={48} color={theme.primary} />
        </View>
        <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Meal Logged!</Text>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          {Math.round(totalCalories)} kcal · {Math.round(totalProtein)}g protein
        </Text>
        {remaining !== null && (
          <Text style={{ color: remaining >= 0 ? theme.primary : theme.danger, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            {remaining >= 0
              ? `${Math.round(remaining)} kcal remaining today`
              : `${Math.round(-remaining)} kcal over goal`}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Log Meal</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── AI Scan Banner ── */}
        {!photoUri && !scanning && (
          <Pressable
            onPress={showPhotoPicker}
            style={[styles.scanBanner, { backgroundColor: theme.secondary + "12", borderColor: theme.secondary + "40" }]}
          >
            <View style={[styles.scanIconCircle, { backgroundColor: theme.secondary + "20" }]}>
              <Feather name="camera" size={22} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Scan with AI</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                Photo → instant food detection &amp; nutrition estimates
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.secondary} />
          </Pressable>
        )}

        {/* ── Scanning ── */}
        {scanning && (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.photoThumb} resizeMode="cover" />}
            <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
              <ActivityIndicator size="large" color={theme.secondary} />
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Analysing your meal…</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
                AI is detecting food items and estimating portions
              </Text>
            </View>
          </Card>
        )}

        {/* ── Scan Confirm ── */}
        {photoUri && !scanning && scanMode === "confirm" && (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <View style={{ padding: 14, gap: 6 }}>
              <View style={[styles.aiBadge, { backgroundColor: theme.primary + "18" }]}>
                <Feather name="cpu" size={11} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>AI ANALYSIS COMPLETE</Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {foodItems.length} item{foodItems.length !== 1 ? "s" : ""} detected — review below
              </Text>
              <Pressable onPress={showPhotoPicker} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="refresh-cw" size={12} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>Re-scan</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* ── Smart Macro Bar ── */}
        <View style={[styles.macroBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.macroPills}>
            {[
              { label: "kcal", value: Math.round(totalCalories), color: theme.orange },
              { label: "protein", value: Math.round(totalProtein), color: theme.primary },
              { label: "carbs", value: Math.round(totalCarbs), color: theme.secondary },
              { label: "fat", value: Math.round(totalFat), color: theme.warning },
            ].map(m => (
              <View key={m.label} style={[styles.macroPill, { backgroundColor: m.color + "15", borderColor: m.color + "40" }]}>
                <Text style={{ color: m.color, fontFamily: "Inter_700Bold", fontSize: 14 }}>{m.value}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{m.label}</Text>
              </View>
            ))}
          </View>
          {calorieGoal && totalCalories > 0 && (
            <View style={styles.goalRow}>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                Today: {Math.round(projectedTotal)} / {calorieGoal} kcal
              </Text>
              <Text style={[styles.remainText, { color: remaining !== null && remaining >= 0 ? theme.primary : theme.danger }]}>
                {remaining !== null
                  ? remaining >= 0 ? `${Math.round(remaining)} left` : `${Math.round(-remaining)} over`
                  : ""}
              </Text>
            </View>
          )}
        </View>

        {/* ── Meal Details ── */}
        <Input label="Meal Name" value={mealName} onChangeText={setMealName} placeholder="e.g. Chicken & Rice" />
        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, { backgroundColor: category === cat ? theme.primaryDim : theme.card, borderColor: category === cat ? theme.primary : theme.border }]}
              >
                <Text style={{ color: category === cat ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Quick Add from history ── */}
        {recentFoods.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>Recent Foods</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>Tap to add</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingRight: 28, paddingTop: 6, paddingBottom: 4 }}>
                {recentFoods.map((food: any, idx: number) => {
                  const isFrequent = Number(food.useCount) >= 5;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => addRecentFood(food)}
                      style={[styles.recentChip, {
                        backgroundColor: isFrequent ? theme.primaryDim : theme.card,
                        borderColor: isFrequent ? theme.primary + "60" : theme.border,
                      }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                        {isFrequent && <Feather name="star" size={9} color={theme.warning} />}
                        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 12 }} numberOfLines={1}>
                          {food.name}
                        </Text>
                      </View>
                      <Text style={{ color: theme.orange, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                        {Math.round(food.avgCalories)} kcal
                      </Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        {Math.round(food.avgPortion)}{food.unit === "grams" ? "g" : food.unit === "ml" ? "ml" : ` ${food.unit}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Food Items ── */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>Food Items</Text>
            {photoUri && !scanning && (
              <Pressable
                onPress={showPhotoPicker}
                style={[styles.rescanBtn, { backgroundColor: theme.secondary + "12", borderColor: theme.secondary + "30" }]}
              >
                <Feather name="camera" size={12} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 11 }}>Re-scan</Text>
              </Pressable>
            )}
          </View>

          {foodItems.map((item, idx) => {
            const servingSuggestions = getServingSuggestions(item.name);
            const recentMatch = item.name.length >= 3
              ? recentFoods.find(f => f.name.toLowerCase() === item.name.toLowerCase())
              : null;
            const allSuggestions = [
              ...(recentMatch ? [{ size: Math.round(recentMatch.avgPortion), unit: recentMatch.unit, label: `${Math.round(recentMatch.avgPortion)}${recentMatch.unit === "grams" ? "g" : " " + recentMatch.unit} (usual)` }] : []),
              ...servingSuggestions,
            ];

            return (
              <View key={idx} style={[styles.foodCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.foodHeader}>
                  <Text style={[styles.foodNum, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>Item {idx + 1}</Text>
                  {foodItems.length > 1 && (
                    <Pressable onPress={() => setFoodItems(foodItems.filter((_, i) => i !== idx))} hitSlop={8}>
                      <Feather name="x" size={18} color={theme.danger} />
                    </Pressable>
                  )}
                </View>

                {/* Food name + barcode */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={item.name}
                    onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, name: t } : f))}
                    placeholder="Food name"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.foodInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular", flex: 1 }]}
                  />
                  <Pressable
                    onPress={() => Alert.alert(
                      "Barcode Scanner",
                      "Barcode lookup is coming in a future update — for now, type the food name and nutrition info.",
                      [{ text: "Got it" }]
                    )}
                    style={[styles.barcodeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                    hitSlop={4}
                  >
                    <Feather name="maximize" size={16} color={theme.textMuted} />
                  </Pressable>
                </View>

                {/* Serving size suggestions */}
                {allSuggestions.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {allSuggestions.map((s, si) => (
                        <Pressable
                          key={si}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, portionSize: String(s.size), unit: s.unit } : f));
                          }}
                          style={[styles.servingChip, {
                            backgroundColor: item.portionSize === String(s.size) && item.unit === s.unit
                              ? theme.primaryDim : theme.background,
                            borderColor: item.portionSize === String(s.size) && item.unit === s.unit
                              ? theme.primary : theme.border,
                          }]}
                        >
                          <Text style={{
                            color: item.portionSize === String(s.size) && item.unit === s.unit
                              ? theme.primary : theme.textMuted,
                            fontFamily: "Inter_500Medium", fontSize: 11,
                          }}>{s.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Portion + Unit */}
                <View style={styles.portionRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Portion</Text>
                    <TextInput
                      value={item.portionSize}
                      onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, portionSize: t } : f))}
                      placeholder="100"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.smallInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                    />
                  </View>
                  <View style={{ flex: 3 }}>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>Unit</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        {UNITS.map(u => (
                          <Pressable
                            key={u}
                            onPress={() => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, unit: u } : f))}
                            style={[styles.unitChip, { backgroundColor: item.unit === u ? theme.primaryDim : theme.background, borderColor: item.unit === u ? theme.primary : theme.border }]}
                          >
                            <Text style={{ color: item.unit === u ? theme.primary : theme.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }}>{u}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* Nutrition grid */}
                <View style={styles.nutritionGrid}>
                  {[
                    { key: "calories", label: "Calories", placeholder: "200", color: theme.orange },
                    { key: "proteinG", label: "Protein (g)", placeholder: "20", color: theme.primary },
                    { key: "carbsG", label: "Carbs (g)", placeholder: "25", color: theme.secondary },
                    { key: "fatG", label: "Fat (g)", placeholder: "8", color: theme.warning },
                  ].map(field => (
                    <View key={field.key} style={styles.nutritionField}>
                      <Text style={[styles.miniLabel, { color: field.color }]}>{field.label}</Text>
                      <TextInput
                        value={(item as any)[field.key]}
                        onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, [field.key]: t } : f))}
                        placeholder={field.placeholder}
                        keyboardType="decimal-pad"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.smallInput, { color: theme.text, borderColor: field.color + "40", fontFamily: "Inter_400Regular" }]}
                      />
                    </View>
                  ))}
                </View>

                {/* Food card footer: duplicate */}
                <View style={[styles.foodFooter, { borderTopColor: theme.border }]}>
                  <Pressable
                    onPress={() => duplicateFoodItem(idx)}
                    style={styles.footerBtn}
                  >
                    <Feather name="copy" size={13} color={theme.secondary} />
                    <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>Duplicate</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={() => setFoodItems([...foodItems, emptyFood()])}
            style={[styles.addFoodBtn, { borderColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>Add Food Item</Text>
          </Pressable>
        </View>

        {/* Notes */}
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes…"
            placeholderTextColor={theme.textMuted}
            multiline
            style={[styles.notesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_400Regular" }]}
          />
        </View>

        {error ? <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13 }}>{error}</Text> : null}

        <Button title="Save Meal" onPress={handleSubmit} loading={mutation.isPending} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { padding: 20, gap: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },

  scanBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  scanIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  photoThumb: { width: "100%", height: 160 },
  photoPreview: { width: "100%", height: 180 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },

  macroBar: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  macroPills: { flexDirection: "row", gap: 8 },
  macroPill: { flex: 1, minWidth: 56, alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1 },
  goalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  remainText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  recentChip: { borderRadius: 12, borderWidth: 1, padding: 10, minWidth: 90, maxWidth: 130 },

  foodCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  foodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodNum: { fontSize: 13 },
  foodInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  barcodeBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  servingChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  portionRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  miniLabel: { fontSize: 11, marginBottom: 4, fontFamily: "Inter_500Medium" },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, textAlign: "center" },
  unitChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutritionField: { width: "46%" },
  foodFooter: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 8, borderTopWidth: 1, marginTop: 2 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 8 },

  addFoodBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed" },
  notesInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: "top", fontSize: 15 },

  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
});
