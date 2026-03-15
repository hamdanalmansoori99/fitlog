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

  const editId = params.editId ? Number(params.editId as string) : null;
  const isEditing = !!editId;

  const [mealName, setMealName] = useState("");
  const [category, setCategory] = useState((params.category as string) || "Breakfast");
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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
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
    setCategory(existingMeal.category || "Breakfast");
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
    setFoodItems([{ name, portionSize: "1", unit: "serving", calories: cal, proteinG: prot, carbsG: carb, fatG: fat }]);
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
        Alert.alert("Camera access needed", "Allow camera access in settings to scan barcodes.");
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
      showToast(`Found: ${displayName}`, "success");
    } catch (err: any) {
      setBarcodeOpen(false);
      const msg = err.message || "Product not found";
      showToast(msg.includes("not found") ? "Product not found. Try adding manually or use the photo scanner." : msg, "error");
    } finally {
      setBarcodeLooking(false);
    }
  }, [barcodeLooking, foodItems, mealName]);

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

      if (analysisResult.notFood) {
        setPhotoUri(null);
        setScanning(false);
        showToast("Couldn't identify food — try a clearer photo or scan a barcode.", "error");
        return;
      }

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

  const searchAbort = useRef<AbortController | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (searchAbort.current) searchAbort.current.abort();
    };
  }, []);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchAbort.current) searchAbort.current.abort();
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setShowSearchResults(true);
    const seq = ++searchSeq.current;
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await api.foodSearch(text.trim());
        if (seq !== searchSeq.current) return;
        setSearchResults(data.results || []);
      } catch {
        if (seq !== searchSeq.current) return;
        setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
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
    showToast(`Added: ${displayName}`, "success");
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

  const handleSubmit = () => {
    if (!mealName.trim()) { setError("Meal name required"); return; }
    const valid = foodItems.filter(f => f.name.trim());
    if (valid.length === 0) { setError("Add at least one food item"); return; }

    for (const f of valid) {
      if (f.calories) {
        const c = parseFloat(f.calories);
        if (isNaN(c) || c < 0 || c > 5000) { setError(`Calories for "${f.name}" must be between 0 and 5,000.`); return; }
      }
      if (f.proteinG) {
        const p = parseFloat(f.proteinG);
        if (isNaN(p) || p < 0 || p > 500) { setError(`Protein for "${f.name}" must be between 0 and 500 g.`); return; }
      }
      if (f.carbsG) {
        const c = parseFloat(f.carbsG);
        if (isNaN(c) || c < 0 || c > 500) { setError(`Carbs for "${f.name}" must be between 0 and 500 g.`); return; }
      }
      if (f.fatG) {
        const fa = parseFloat(f.fatG);
        if (isNaN(fa) || fa < 0 || fa > 300) { setError(`Fat for "${f.name}" must be between 0 and 300 g.`); return; }
      }
      if (f.portionSize) {
        const ps = parseFloat(f.portionSize);
        if (isNaN(ps) || ps <= 0 || ps > 5000) { setError(`Portion size for "${f.name}" must be between 1 and 5,000.`); return; }
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
          Loading meal…
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
          {isEditing ? "Meal Updated!" : "Meal Logged!"}
        </Text>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          {Math.round(totalCalories)} kcal · {Math.round(totalProtein)}g protein
        </Text>
        {!isEditing && remaining !== null && (
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
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {isEditing ? "Edit Meal" : "Log Meal"}
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
            >
              <View style={[styles.scanIconCircle, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="maximize" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Scan Barcode</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  Scan a product barcode for exact nutrition info
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.primary} />
            </Pressable>

            <PremiumGate feature="aiPhotoAnalysis" minHeight={72} compact>
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
            </PremiumGate>
          </View>
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

        {/* ── Food Search ── */}
        {!isEditing && (
          <View style={{ zIndex: 10 }}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="search" size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search foods…"
                placeholderTextColor={theme.textMuted}
                style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); }} hitSlop={8}>
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
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6 }}>Searching…</Text>
                  </View>
                )}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <View style={{ padding: 16, alignItems: "center" }}>
                    <Feather name="info" size={18} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6 }}>No results — fill in manually</Text>
                  </View>
                )}
                {searchResults.map((result: any, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => selectSearchResult(result)}
                    style={[styles.searchResultItem, { borderBottomColor: idx < searchResults.length - 1 ? theme.border : "transparent" }]}
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
                      <Text style={{ color: theme.orange, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{result.calories} kcal</Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        P {result.proteinG}g · C {result.carbsG}g · F {result.fatG}g
                      </Text>
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
                    onPress={openBarcodeScanner}
                    style={[styles.barcodeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                    hitSlop={4}
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

        <Button title={isEditing ? "Save Changes" : "Save Meal"} onPress={handleSubmit} loading={mutation.isPending} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Barcode Scanner Modal ── */}
      <Modal visible={barcodeOpen} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.barcodeModal, { backgroundColor: "#000" }]}>
          <View style={[styles.barcodeHeader, { paddingTop: topPad + 8 }]}>
            <Pressable onPress={() => setBarcodeOpen(false)} style={styles.barcodeCloseBtn}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.barcodeTitle}>Scan Barcode</Text>
            <View style={{ width: 44 }} />
          </View>

          {barcodeLooking ? (
            <View style={styles.barcodeLoadingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.barcodeLoadingText}>Looking up product…</Text>
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
                <Text style={styles.barcodeHint}>Point camera at a product barcode</Text>
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
  content: { padding: 20, gap: 16 },
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

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  recentChip: { borderRadius: 12, borderWidth: 1, padding: 10, minWidth: 90, maxWidth: 130 },

  foodCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8, gap: 10 },
  foodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodNum: { fontSize: 13 },
  foodInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 46 },
  barcodeBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  servingChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  portionRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  miniLabel: { fontSize: 11, marginBottom: 4, fontFamily: "Inter_500Medium" },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: "center", minHeight: 44 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, borderWidth: 1 },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutritionField: { width: "46%" },
  foodFooter: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 8, borderTopWidth: 1, marginTop: 2 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 8 },

  addFoodBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", minHeight: 52 },
  notesInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: "top", fontSize: 15 },

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
