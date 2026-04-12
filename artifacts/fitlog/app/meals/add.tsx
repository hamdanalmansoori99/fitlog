import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  ActivityIndicator, Image, Alert, KeyboardAvoidingView, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PremiumGate } from "@/components/PremiumGate";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";

const BASE_CATEGORY_OPTIONS = [
  { value: "Breakfast", labelKey: "meals.breakfast" },
  { value: "Lunch",     labelKey: "meals.lunch" },
  { value: "Dinner",    labelKey: "meals.dinner" },
  { value: "Snacks",    labelKey: "meals.snacks" },
] as const;

const RAMADAN_CATEGORY_OPTIONS = [
  { value: "Suhoor",    labelKey: "ramadan.suhoor" },
  { value: "Iftar",     labelKey: "ramadan.iftar" },
  { value: "Snacks",    labelKey: "meals.snacks" },
] as const;

// Approximate Ramadan dates for category switching
const RAMADAN_RANGES = [
  { start: "2025-02-28", end: "2025-03-30" },
  { start: "2026-02-17", end: "2026-03-19" },
  { start: "2027-02-07", end: "2027-03-08" },
  { start: "2028-01-27", end: "2028-02-25" },
];

function isRamadanNow(): boolean {
  const iso = new Date().toISOString().slice(0, 10);
  return RAMADAN_RANGES.some((r) => iso >= r.start && iso <= r.end);
}

const CATEGORY_OPTIONS = isRamadanNow() ? RAMADAN_CATEGORY_OPTIONS : BASE_CATEGORY_OPTIONS;

const UNIT_OPTIONS = [
  { value: "grams",    labelKey: "meals.units.grams" },
  { value: "servings", labelKey: "meals.units.servings" },
] as const;

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

function getCategoryByTime(): string {
  const hour = new Date().getHours();
  if (isRamadanNow()) {
    if (hour < 6) return "Suhoor";
    if (hour < 17) return "Snacks";
    return "Iftar";
  }
  if (hour < 10) return "Breakfast";
  if (hour < 14) return "Lunch";
  if (hour < 17) return "Snacks";
  return "Dinner";
}

export default function AddMealScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  const editId = params.editId ? Number(params.editId as string) : null;
  const isEditing = !!editId;

  const [mealName, setMealName] = useState("");
  const [category, setCategory] = useState((params.category as string) || getCategoryByTime());
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([emptyFood()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"form" | "confirm">("form");
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeLooking, setBarcodeLooking] = useState(false);
  const barcodeProcessed = useRef(false);
  const baseScanItems = useRef<FoodItem[]>([]);
  const [scanMultipliers, setScanMultipliers] = useState<number[]>([]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Load existing meal when editing
  const { data: existingMeal, isLoading: existingLoading } = useQuery({
    queryKey: ["meal", editId],
    queryFn: () => api.getMeal(editId!),
    enabled: isEditing && !prefilled,
  });

  useEffect(() => {
    if (!existingMeal || prefilled) return;
    setMealName(existingMeal.name || "");
    setCategory(existingMeal.category || getCategoryByTime());
    setNotes(existingMeal.notes || "");
    const d = existingMeal.date ? new Date(existingMeal.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    setDate(d);
    const items: FoodItem[] = (existingMeal.foodItems || []).map((f: any) => ({
      name: f.name || "",
      portionSize: f.portionSize != null ? String(f.portionSize) : "",
      unit: f.unit || "grams",
      calories: f.calories != null ? String(f.calories) : "",
      proteinG: f.proteinG != null ? String(f.proteinG) : "",
      carbsG: f.carbsG != null ? String(f.carbsG) : "",
      fatG: f.fatG != null ? String(f.fatG) : "",
    }));
    setFoodItems(items.length > 0 ? items : [emptyFood()]);
    setPrefilled(true);
  }, [existingMeal, prefilled]);

  useEffect(() => {
    if (isEditing) return;
    const name = params.prefillName as string | undefined;
    if (!name) return;
    setMealName(name);
    const cal = params.prefillCalories ? String(params.prefillCalories) : "";
    const prot = params.prefillProtein ? String(params.prefillProtein) : "";
    const carb = params.prefillCarbs ? String(params.prefillCarbs) : "";
    const fat = params.prefillFat ? String(params.prefillFat) : "";
    setFoodItems([{ name, portionSize: "1", unit: "servings", calories: cal, proteinG: prot, carbsG: carb, fatG: fat }]);
  }, []);

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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["meals"] });
    queryClient.invalidateQueries({ queryKey: ["mealsToday"] });
    queryClient.invalidateQueries({ queryKey: ["todayStats"] });
    queryClient.invalidateQueries({ queryKey: ["nutritionStats"] });
    queryClient.invalidateQueries({ queryKey: ["streaks"] });
    queryClient.invalidateQueries({ queryKey: ["achievements"] });
    if (editId) queryClient.invalidateQueries({ queryKey: ["meal", editId] });
  };

  const createMutation = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => { invalidateAll(); setSuccess(true); setTimeout(() => router.back(), 1800); },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateMeal(editId!, body),
    onSuccess: () => { invalidateAll(); setSuccess(true); setTimeout(() => router.back(), 1800); },
    onError: (err: any) => setError(err.message),
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const totalCalories = foodItems.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0);
  const totalProtein = foodItems.reduce((s, f) => s + (parseFloat(f.proteinG) || 0), 0);
  const totalCarbs = foodItems.reduce((s, f) => s + (parseFloat(f.carbsG) || 0), 0);
  const totalFat = foodItems.reduce((s, f) => s + (parseFloat(f.fatG) || 0), 0);

  const projectedTotal = todayCalories + totalCalories;
  const remaining = calorieGoal ? calorieGoal - projectedTotal : null;

  async function openBarcodeScanner() {
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        Alert.alert(t("meals.cameraAccessNeeded"), t("meals.allowCameraBarcode"));
        return;
      }
    }
    barcodeProcessed.current = false;
    setBarcodeOpen(true);
  }

  const onBarcodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (barcodeProcessed.current || barcodeLooking) return;
    const code = result.data;
    if (!code || !/^\d{4,14}$/.test(code)) return;
    barcodeProcessed.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBarcodeLooking(true);

    try {
      const { food } = await api.barcodeLookup(code);
      setBarcodeOpen(false);
      const displayName = food.brand ? `${food.name} (${food.brand})` : food.name;
      const newFood: FoodItem = {
        name: displayName,
        portionSize: String(food.servingG || 100),
        unit: "grams",
        calories: String(food.calories || 0),
        proteinG: String(food.proteinG || 0),
        carbsG: String(food.carbsG || 0),
        fatG: String(food.fatG || 0),
      };
      setFoodItems(fi => {
        const emptyIdx = fi.findIndex(f => !f.name);
        return emptyIdx >= 0 ? fi.map((f, i) => i === emptyIdx ? newFood : f) : [...fi, newFood];
      });
      setMealName(prev => prev || displayName);
      showToast(t("meals.foundFood", { name: displayName }), "success");
    } catch (err: any) {
      setBarcodeOpen(false);
      const msg = err.message || t("meals.productNotFound");
      showToast(msg.includes("not found") ? t("meals.productNotFound") : msg, "error");
    } finally {
      setBarcodeLooking(false);
    }
  }, [barcodeLooking]);

  async function pickAndScanImage(source: "camera" | "library") {
    try {
      let result;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert(t("meals.cameraAccessNeeded"), t("meals.allowCameraSettings")); return; }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: "images" });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert(t("meals.photoLibraryAccessNeeded"), t("meals.allowPhotoAccess")); return; }
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: "images" });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError(t("meals.couldNotReadImage")); return; }

      setPhotoUri(asset.uri);
      setScanning(true);
      setError("");

      const mimeType = asset.mimeType || "image/jpeg";
      const analysisResult = await api.analyzeMealPhoto(asset.base64, mimeType);

      if (analysisResult.notFood) {
        setPhotoUri(null);
        setScanning(false);
        showToast(t("meals.couldNotIdentifyFood"), "error");
        return;
      }

      setMealName(analysisResult.mealName || "");
      const scannedItems = (analysisResult.foods || []).map((f: any) => ({
        name: f.name,
        portionSize: String(f.portionSize),
        unit: f.unit || "grams",
        calories: String(f.calories),
        proteinG: String(f.proteinG),
        carbsG: String(f.carbsG),
        fatG: String(f.fatG),
      }));
      baseScanItems.current = scannedItems;
      setScanMultipliers(scannedItems.map(() => 1));
      setFoodItems(scannedItems);
      setScanMode("confirm");
    } catch (err: any) {
      setError(err.message || t("meals.failedToAnalyzePhoto"));
    } finally {
      setScanning(false);
    }
  }

  function showPhotoPicker() {
    Alert.alert(t("meals.scanMeal"), t("meals.takePhotoOrChoose"), [
      { text: t("meals.takePhoto"), onPress: () => pickAndScanImage("camera") },
      { text: t("meals.chooseFromLibrary"), onPress: () => pickAndScanImage("library") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  const searchSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length < 2) {
      setSearchResults([]);
      setSearchError(false);
      setShowSearchResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(false);
    setShowSearchResults(true);
    const seq = ++searchSeq.current;
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await api.foodSearch(text.trim(), i18n.language);
        if (seq !== searchSeq.current) return;
        setSearchResults(data.results || []);
        setSearchError(false);
      } catch {
        if (seq !== searchSeq.current) return;
        setSearchResults([]);
        setSearchError(true);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
  }

  function retrySearch() {
    if (searchQuery.trim().length >= 2) {
      handleSearchChange(searchQuery);
    }
  }

  function selectSearchResult(result: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const displayName = result.brand ? `${result.name} (${result.brand})` : result.name;
    const newFood: FoodItem = {
      name: displayName,
      portionSize: "100",
      unit: "grams",
      calories: String(result.calories || 0),
      proteinG: String(result.proteinG || 0),
      carbsG: String(result.carbsG || 0),
      fatG: String(result.fatG || 0),
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
    if (!mealName) setMealName(displayName);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    showToast(t("meals.addedFood", { name: displayName }), "success");
  }

  function addRecentFood(food: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFood: FoodItem = {
      name: food.name,
      portionSize: String(Math.round(food.avgPortion) || 100),
      unit: food.unit || "grams",
      calories: String(Math.round(food.avgCalories) || 0),
      proteinG: String(Number(food.avgProteinG) || 0),
      carbsG: String(Number(food.avgCarbsG) || 0),
      fatG: String(Number(food.avgFatG) || 0),
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

  function applyMultiplier(idx: number, multiplier: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const base = baseScanItems.current[idx];
    if (!base) return;
    setScanMultipliers(prev => prev.map((m, i) => i === idx ? multiplier : m));
    setFoodItems(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const scale = (val: string) => String(Math.round(parseFloat(val) * multiplier * 10) / 10);
      return {
        ...f,
        portionSize: String(Math.round(parseFloat(base.portionSize) * multiplier)),
        calories: String(Math.round(parseFloat(base.calories) * multiplier)),
        proteinG: scale(base.proteinG),
        carbsG: scale(base.carbsG),
        fatG: scale(base.fatG),
      };
    }));
  }

  function handlePortionChange(idx: number, newPortionText: string) {
    setFoodItems(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const oldPortion = parseFloat(f.portionSize) || 0;
      const newPortion = parseFloat(newPortionText) || 0;
      if (oldPortion <= 0 || newPortion <= 0) return { ...f, portionSize: newPortionText };
      const ratio = newPortion / oldPortion;
      return {
        ...f,
        portionSize: newPortionText,
        calories: String(Math.round(parseFloat(f.calories) * ratio)),
        proteinG: String(Math.round(parseFloat(f.proteinG) * ratio * 10) / 10),
        carbsG: String(Math.round(parseFloat(f.carbsG) * ratio * 10) / 10),
        fatG: String(Math.round(parseFloat(f.fatG) * ratio * 10) / 10),
      };
    }));
  }

  const handleSubmit = () => {
    if (!mealName.trim()) { setError(t("meals.mealNameRequired")); return; }
    const valid = foodItems.filter(f => f.name.trim());
    if (valid.length === 0) { setError(t("meals.addAtLeastOneFood")); return; }

    for (const f of valid) {
      if (f.calories) {
        const c = parseFloat(f.calories);
        if (isNaN(c) || c < 0 || c > 5000) { setError(t("meals.caloriesRange", { name: f.name })); return; }
      }
      if (f.proteinG) {
        const p = parseFloat(f.proteinG);
        if (isNaN(p) || p < 0 || p > 500) { setError(t("meals.proteinRange", { name: f.name })); return; }
      }
      if (f.carbsG) {
        const c = parseFloat(f.carbsG);
        if (isNaN(c) || c < 0 || c > 500) { setError(t("meals.carbsRange", { name: f.name })); return; }
      }
      if (f.fatG) {
        const fa = parseFloat(f.fatG);
        if (isNaN(fa) || fa < 0 || fa > 300) { setError(t("meals.fatRange", { name: f.name })); return; }
      }
      if (f.portionSize) {
        const ps = parseFloat(f.portionSize);
        if (isNaN(ps) || ps <= 0 || ps > 5000) { setError(t("meals.portionRange", { name: f.name })); return; }
      }
    }

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

  if (isEditing && existingLoading && !prefilled) {
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 12 }}>
          {t("meals.loadingMeal")}
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.successScreen, { backgroundColor: theme.background }]}>
        <View style={[styles.successCircle, { backgroundColor: theme.primaryDim }]}>
          <Feather name="check" size={48} color={theme.primary} />
        </View>
        <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {isEditing ? t("meals.mealUpdated") : t("meals.mealLogged")}
        </Text>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          {t("meals.kcalProteinSummary", { calories: Math.round(totalCalories), protein: Math.round(totalProtein) })}
        </Text>
        {!isEditing && remaining !== null && (
          <Text style={{ color: remaining >= 0 ? theme.primary : theme.danger, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            {remaining >= 0
              ? t("meals.kcalRemainingToday", { amount: Math.round(remaining) })
              : t("meals.kcalOverGoalToday", { amount: Math.round(-remaining) })}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t("common.back") || "Go back"}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {isEditing ? t("meals.editMeal") : t("meals.logMealTitle")}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Scan Banners ── */}
        {!isEditing && !photoUri && !scanning && (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={openBarcodeScanner}
              style={[styles.scanBanner, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "40" }]}
              accessibilityRole="button"
              accessibilityLabel={t("meals.scanBarcode")}
            >
              <View style={[styles.scanIconCircle, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="maximize" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("meals.scanBarcode")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  {t("meals.scanBarcodeDesc")}
                </Text>
              </View>
              <Feather name={rtlIcon("chevron-right")} size={18} color={theme.primary} />
            </Pressable>

            <PremiumGate feature="aiPhotoAnalysis" minHeight={72} compact>
              <Pressable
                onPress={showPhotoPicker}
                style={[styles.scanBanner, { backgroundColor: theme.secondary + "12", borderColor: theme.secondary + "40" }]}
                accessibilityRole="button"
                accessibilityLabel={t("meals.scanWithAI")}
              >
                <View style={[styles.scanIconCircle, { backgroundColor: theme.secondary + "20" }]}>
                  <Feather name="camera" size={22} color={theme.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("meals.scanWithAI")}</Text>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                    {t("meals.scanWithAIDesc")}
                  </Text>
                </View>
                <Feather name={rtlIcon("chevron-right")} size={18} color={theme.secondary} />
              </Pressable>
            </PremiumGate>
          </View>
        )}

        {/* ── Scanning ── */}
        {scanning && (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.photoThumb} resizeMode="cover" />}
            <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
              <ActivityIndicator size="large" color={theme.secondary} />
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("meals.analysingMeal")}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
                {t("meals.aiDetecting")}
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
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{t("meals.aiAnalysisComplete")}</Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {t("meals.itemsDetected", { count: foodItems.length })}
              </Text>
              <Pressable onPress={showPhotoPicker} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }} accessibilityRole="button" accessibilityLabel={t("meals.reScan")}>
                <Feather name="refresh-cw" size={12} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("meals.reScan")}</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* ── Food Search ── */}
        {!isEditing && (
          <View style={{ zIndex: 10 }}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="search" size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder={t("meals.searchFoods")}
                placeholderTextColor={theme.textMuted}
                style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(""); setSearchResults([]); setSearchError(false); setShowSearchResults(false); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("common.clear") || "Clear search"} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="x" size={16} color={theme.textMuted} />
                </Pressable>
              )}
              {searching && <ActivityIndicator size="small" color={theme.primary} />}
            </View>
            {showSearchResults && (
              <View style={[styles.searchDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {searching && searchResults.length === 0 && (
                  <View style={{ padding: 16, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6 }}>{t("meals.searchingEllipsis")}</Text>
                  </View>
                )}
                {!searching && searchError && (
                  <Pressable onPress={retrySearch} style={{ padding: 16, alignItems: "center", gap: 6 }}>
                    <Feather name="wifi-off" size={18} color={theme.danger} />
                    <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t("common.error")}</Text>
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.retry")}</Text>
                  </Pressable>
                )}
                {!searching && !searchError && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <View style={{ padding: 16, alignItems: "center" }}>
                    <Feather name="search" size={18} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6 }}>{t("meals.noResultsManual")}</Text>
                  </View>
                )}
                {searchResults.map((result: any, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => selectSearchResult(result)}
                    style={[styles.searchResultItem, { borderBottomColor: idx < searchResults.length - 1 ? theme.border : "transparent", minHeight: 44 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${result.name}${result.brand ? ` (${result.brand})` : ""}, ${result.calories} ${t("common.kcal")}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
                        {result.name}
                      </Text>
                      {result.brand && (
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }} numberOfLines={1}>
                          {result.brand}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.orange, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{result.calories} {t("common.kcal")}</Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        {t("meals.macroShort", { protein: result.proteinG, carbs: result.carbsG, fat: result.fatG })}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 9 }}>{t("meals.per100g")}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Smart Macro Bar ── */}
        <View style={[styles.macroBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.macroPills}>
            {[
              { label: t("common.kcal"), value: Math.round(totalCalories), color: theme.orange },
              { label: t("common.protein"), value: Math.round(totalProtein), color: theme.primary },
              { label: t("common.carbs"), value: Math.round(totalCarbs), color: theme.secondary },
              { label: t("common.fat"), value: Math.round(totalFat), color: theme.warning },
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
                {t("meals.todayCalorieProgress", { consumed: Math.round(projectedTotal), goal: calorieGoal })}
              </Text>
              <Text style={[styles.remainText, { color: remaining !== null && remaining >= 0 ? theme.primary : theme.danger }]}>
                {remaining !== null
                  ? remaining >= 0 ? t("meals.leftAmount", { amount: Math.round(remaining) }) : t("meals.overAmount", { amount: Math.round(-remaining) })
                  : ""}
              </Text>
            </View>
          )}
        </View>

        {/* ── Meal Details ── */}
        <Input label={t("meals.mealName")} value={mealName} onChangeText={setMealName} placeholder={t("meals.mealNamePlaceholder")} />
        <Input label={t("workouts.date")} value={date} onChangeText={setDate} placeholder={t("workouts.datePlaceholder")} />

        <Pressable
          onPress={() => {
            const opts = CATEGORY_OPTIONS.map(o => o.value) as string[];
            const curIdx = opts.indexOf(category);
            setCategory(opts[(curIdx + 1) % opts.length]);
          }}
          style={[styles.autoCategoryRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`${t("meals.category")}: ${t(CATEGORY_OPTIONS.find(o => o.value === category)?.labelKey || "meals.breakfast")}. ${t("common.change") || "Tap to change"}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name="clock" size={14} color={theme.primary} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              {t("meals.category")}:
            </Text>
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {t(CATEGORY_OPTIONS.find(o => o.value === category)?.labelKey || "meals.breakfast")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
              {t("common.change") || "Tap to change"}
            </Text>
            <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
          </View>
        </Pressable>

        {/* ── Quick Add from history ── */}
        {recentFoods.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>{t("meals.recentFoods")}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("meals.tapToAdd")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingEnd: 28, paddingTop: 6, paddingBottom: 4 }}>
                {recentFoods.map((food: any, idx: number) => {
                  const isFrequent = Number(food.useCount) >= 5;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => addRecentFood(food)}
                      style={[styles.recentChip, {
                        backgroundColor: isFrequent ? theme.primaryDim : theme.card,
                        borderColor: isFrequent ? theme.primary + "60" : theme.border,
                        minHeight: 44,
                      }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("meals.tapToAdd")}: ${food.name}, ${Math.round(food.avgCalories)} kcal`}
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
            <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>{t("meals.foodItems")}</Text>
            {photoUri && !scanning && (
              <Pressable
                onPress={showPhotoPicker}
                style={[styles.rescanBtn, { backgroundColor: theme.secondary + "12", borderColor: theme.secondary + "30", minHeight: 44 }]}
                accessibilityRole="button"
                accessibilityLabel={t("meals.reScan")}
              >
                <Feather name="camera" size={12} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 11 }}>{t("meals.reScan")}</Text>
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
                  <Text style={[styles.foodNum, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>{t("meals.itemNumber", { number: idx + 1 })}</Text>
                  {foodItems.length > 1 && (
                    <Pressable onPress={() => {
                      setFoodItems(foodItems.filter((_, i) => i !== idx));
                      if (scanMode === "confirm") {
                        baseScanItems.current = baseScanItems.current.filter((_, i) => i !== idx);
                        setScanMultipliers(prev => prev.filter((_, i) => i !== idx));
                      }
                    }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t("common.delete") || "Delete"} ${item.name || t("meals.foodItems")}`} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="x" size={18} color={theme.danger} />
                    </Pressable>
                  )}
                </View>

                {/* Food name + barcode */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={item.name}
                    onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, name: t } : f))}
                    placeholder={t("meals.foodNamePlaceholder")}
                    placeholderTextColor={theme.textMuted}
                    style={[styles.foodInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular", flex: 1 }]}
                  />
                  <Pressable
                    onPress={openBarcodeScanner}
                    style={[styles.barcodeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={t("meals.scanBarcode")}
                  >
                    <Feather name="maximize" size={16} color={theme.primary} />
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
                            minHeight: 44,
                          }]}
                          accessibilityRole="button"
                          accessibilityLabel={s.label}
                          accessibilityState={{ selected: item.portionSize === String(s.size) && item.unit === s.unit }}
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

                {/* Portion multiplier — only shown after AI scan */}
                {scanMode === "confirm" && baseScanItems.current[idx] && (
                  <View style={styles.multiplierRow}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                      {t("meals.portionScale")}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {([0.5, 1, 1.5, 2] as const).map(m => (
                        <Pressable
                          key={m}
                          onPress={() => applyMultiplier(idx, m)}
                          style={[
                            styles.multiplierChip,
                            {
                              backgroundColor: scanMultipliers[idx] === m ? theme.primary : theme.card,
                              borderColor: scanMultipliers[idx] === m ? theme.primary : theme.border,
                              minHeight: 44,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${t("meals.portionScale")} ${m === 0.5 ? "0.5" : m === 1.5 ? "1.5" : m}x`}
                          accessibilityState={{ selected: scanMultipliers[idx] === m }}
                        >
                          <Text style={{
                            color: scanMultipliers[idx] === m ? "#0f0f1a" : theme.textMuted,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                          }}>
                            {m === 0.5 ? "½x" : m === 1.5 ? "1½x" : `${m}x`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Portion + Unit */}
                <View style={styles.portionRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>{t("meals.portion")}</Text>
                    <TextInput
                      value={item.portionSize}
                      onChangeText={t => handlePortionChange(idx, t)}
                      placeholder="100"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.smallInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>{t("meals.unit")}</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {UNIT_OPTIONS.map(opt => (
                        <Pressable
                          key={opt.value}
                          onPress={() => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, unit: opt.value } : f))}
                          style={[styles.unitChip, { flex: 1, backgroundColor: item.unit === opt.value ? theme.primaryDim : theme.background, borderColor: item.unit === opt.value ? theme.primary : theme.border }]}
                          accessibilityRole="button"
                          accessibilityLabel={t(opt.labelKey)}
                          accessibilityState={{ selected: item.unit === opt.value }}
                        >
                          <Text style={{ color: item.unit === opt.value ? theme.primary : theme.textMuted, fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" }}>{t(opt.labelKey)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Nutrition grid */}
                <View style={styles.nutritionGrid}>
                  {[
                    { key: "calories", label: t("meals.caloriesLabel"), placeholder: "200", color: theme.orange },
                    { key: "proteinG", label: t("meals.proteinGLabel"), placeholder: "20", color: theme.primary },
                    { key: "carbsG", label: t("meals.carbsGLabel"), placeholder: "25", color: theme.secondary },
                    { key: "fatG", label: t("meals.fatGLabel"), placeholder: "8", color: theme.warning },
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
                    style={[styles.footerBtn, { minHeight: 44 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t("meals.duplicateItem")}
                  >
                    <Feather name="copy" size={13} color={theme.secondary} />
                    <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{t("meals.duplicateItem")}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={() => setFoodItems([...foodItems, emptyFood()])}
            style={[styles.addFoodBtn, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={t("meals.addFoodItem")}
          >
            <Feather name="plus" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t("meals.addFoodItem")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background }}>
        {error ? <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 6 }}>{error}</Text> : null}
        <Button title={isEditing ? t("meals.saveChanges") : t("meals.saveMeal")} onPress={handleSubmit} loading={mutation.isPending} />
      </View>
      </KeyboardAvoidingView>

      {/* ── Barcode Scanner Modal ── */}
      <Modal visible={barcodeOpen} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.barcodeModal, { backgroundColor: "#000" }]}>
          <View style={[styles.barcodeHeader, { paddingTop: topPad + 8 }]}>
            <Pressable onPress={() => setBarcodeOpen(false)} style={styles.barcodeCloseBtn} accessibilityRole="button" accessibilityLabel={t("common.close") || "Close scanner"}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.barcodeTitle}>{t("meals.scanBarcode")}</Text>
            <View style={{ width: 44 }} />
          </View>

          {barcodeLooking ? (
            <View style={styles.barcodeLoadingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.barcodeLoadingText}>{t("meals.lookingUpProduct")}</Text>
            </View>
          ) : (
            <CameraView
              style={styles.barcodeCamera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              onBarcodeScanned={onBarcodeScanned}
            >
              <View style={styles.barcodeOverlay}>
                <View style={styles.barcodeFrame}>
                  <View style={[styles.barcodeCorner, styles.cornerTL, { borderColor: theme.primary }]} />
                  <View style={[styles.barcodeCorner, styles.cornerTR, { borderColor: theme.primary }]} />
                  <View style={[styles.barcodeCorner, styles.cornerBL, { borderColor: theme.primary }]} />
                  <View style={[styles.barcodeCorner, styles.cornerBR, { borderColor: theme.primary }]} />
                </View>
                <Text style={styles.barcodeHint}>{t("meals.pointCameraBarcode")}</Text>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, minHeight: 48 },
  searchDropdown: { borderRadius: 14, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  searchResultItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },

  scanBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  scanIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  photoThumb: { width: "100%", height: 160 },
  photoPreview: { width: "100%", height: 180 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },

  macroBar: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  macroPills: { flexDirection: "row", gap: 8 },
  macroPill: { flex: 1, minWidth: 56, alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1 },
  goalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  remainText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, minHeight: 44, justifyContent: "center" },
  autoCategoryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  recentChip: { borderRadius: 12, borderWidth: 1, padding: 10, minWidth: 90, maxWidth: 130 },

  foodCard: { borderRadius: 16, borderWidth: 1, padding: 10, marginBottom: 6, gap: 6 },
  foodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodNum: { fontSize: 13 },
  foodInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 46 },
  barcodeBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  servingChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  multiplierRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  multiplierChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  portionRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  miniLabel: { fontSize: 11, marginBottom: 4, fontFamily: "Inter_500Medium" },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: "center", minHeight: 44 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" as const, justifyContent: "center" as const, minHeight: 44 },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  nutritionField: { width: "47%" },
  foodFooter: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 6, borderTopWidth: 1, marginTop: 0 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 8 },

  addFoodBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", minHeight: 52 },

  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },

  barcodeModal: { flex: 1 },
  barcodeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 },
  barcodeCloseBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  barcodeTitle: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 17 },
  barcodeCamera: { flex: 1 },
  barcodeOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  barcodeFrame: { width: 260, height: 160, position: "relative" },
  barcodeCorner: { position: "absolute", width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  barcodeHint: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 24, textAlign: "center", textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  barcodeLoadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  barcodeLoadingText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 15 },
});
