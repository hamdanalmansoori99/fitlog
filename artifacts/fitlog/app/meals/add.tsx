import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  ActivityIndicator, Image, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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

function MacroPill({ label, value, color, theme }: { label: string; value: number; color: string; theme: any }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 14 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>{label}</Text>
    </View>
  );
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

  // Photo scan state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"form" | "confirm">("form");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const mutation = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["mealsToday"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    },
    onError: (err: any) => setError(err.message),
  });

  const totalCalories = foodItems.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0);
  const totalProtein = foodItems.reduce((s, f) => s + (parseFloat(f.proteinG) || 0), 0);
  const totalCarbs = foodItems.reduce((s, f) => s + (parseFloat(f.carbsG) || 0), 0);
  const totalFat = foodItems.reduce((s, f) => s + (parseFloat(f.fatG) || 0), 0);

  async function pickAndScanImage(source: "camera" | "library") {
    try {
      let result;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Camera access needed", "Please allow camera access in settings."); return; }
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: "images" });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Photo library access needed", "Please allow photo access in settings."); return; }
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

      setScanResult(analysisResult);
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
        <Text style={[{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }]}>
          {Math.round(totalCalories)} kcal · {Math.round(totalProtein)}g protein
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Nav */}
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
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                Scan meal with AI
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                Take or upload a photo — AI detects food items and estimates nutrition
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.secondary} />
          </Pressable>
        )}

        {/* ── Scanning Overlay ── */}
        {scanning && (
          <Card style={[styles.scanningCard, { borderColor: theme.secondary + "40" }]}>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.photoThumb} resizeMode="cover" />
            )}
            <View style={styles.scanningBody}>
              <ActivityIndicator size="large" color={theme.secondary} />
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 12 }}>
                Analyzing your meal…
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 }}>
                AI is detecting food items and estimating portions
              </Text>
            </View>
          </Card>
        )}

        {/* ── Photo + Confirm Banner (after scan) ── */}
        {photoUri && !scanning && scanMode === "confirm" && (
          <Card style={[styles.confirmCard, { borderColor: theme.primary + "40" }]}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <View style={styles.confirmBody}>
              <View style={[styles.aiBadge, { backgroundColor: theme.primary + "18" }]}>
                <Feather name="cpu" size={11} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                  AI ANALYSIS COMPLETE
                </Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 6 }}>
                {foodItems.length} food item{foodItems.length !== 1 ? "s" : ""} detected
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                Review and edit below before saving
              </Text>
              <Pressable
                onPress={showPhotoPicker}
                style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="refresh-cw" size={12} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                  Re-scan with different photo
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* ── Macro Summary (when items have values) ── */}
        {totalCalories > 0 && (
          <View style={styles.macroRow}>
            <MacroPill label="kcal" value={Math.round(totalCalories)} color={theme.orange} theme={theme} />
            <MacroPill label="protein" value={Math.round(totalProtein)} color={theme.primary} theme={theme} />
            <MacroPill label="carbs" value={Math.round(totalCarbs)} color={theme.secondary} theme={theme} />
            <MacroPill label="fat" value={Math.round(totalFat)} color={theme.warning} theme={theme} />
          </View>
        )}

        {/* ── Meal Details ── */}
        <Input label="Meal Name" value={mealName} onChangeText={setMealName} placeholder="e.g. Chicken & Rice" />
        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        {/* Category */}
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  { backgroundColor: category === cat ? theme.primaryDim : theme.card, borderColor: category === cat ? theme.primary : theme.border },
                ]}
              >
                <Text style={{ color: category === cat ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Food Items ── */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>
              Food Items
            </Text>
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

          {foodItems.map((item, idx) => (
            <View key={idx} style={[styles.foodCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.foodHeader}>
                <Text style={[styles.foodNum, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                  Item {idx + 1}
                </Text>
                {foodItems.length > 1 && (
                  <Pressable onPress={() => setFoodItems(foodItems.filter((_, i) => i !== idx))}>
                    <Feather name="x" size={18} color={theme.danger} />
                  </Pressable>
                )}
              </View>

              <TextInput
                value={item.name}
                onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, name: t } : f))}
                placeholder="Food name"
                placeholderTextColor={theme.textMuted}
                style={[styles.foodInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              />

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
                          style={[
                            styles.unitChip,
                            { backgroundColor: item.unit === u ? theme.primaryDim : theme.background, borderColor: item.unit === u ? theme.primary : theme.border },
                          ]}
                        >
                          <Text style={{ color: item.unit === u ? theme.primary : theme.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

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
            </View>
          ))}

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
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { padding: 20, gap: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },

  // AI Scan
  scanBanner: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    borderRadius: 16, borderWidth: 1.5,
  },
  scanIconCircle: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  scanningCard: {
    borderRadius: 16, borderWidth: 1.5, overflow: "hidden", padding: 0,
  },
  scanningBody: {
    alignItems: "center", justifyContent: "center", padding: 24, gap: 0,
  },
  photoThumb: { width: "100%", height: 160 },
  photoPreview: { width: "100%", height: 180, borderRadius: 0 },
  confirmCard: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden", padding: 0 },
  confirmBody: { padding: 16 },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start",
  },
  rescanBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  },

  // Macro summary
  macroRow: {
    flexDirection: "row", gap: 8, flexWrap: "wrap",
  },
  macroPill: {
    flex: 1, minWidth: 60,
    alignItems: "center", paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 12, borderWidth: 1,
  },

  // Category
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },

  // Food items
  foodCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  foodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodNum: { fontSize: 13 },
  foodInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  portionRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  miniLabel: { fontSize: 11, marginBottom: 4, fontFamily: "Inter_500Medium" },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, textAlign: "center" },
  unitChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutritionField: { width: "46%" },
  addFoodBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed",
  },
  notesInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: "top", fontSize: 15 },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
});
