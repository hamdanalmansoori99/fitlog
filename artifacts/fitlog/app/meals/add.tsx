import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

export default function AddMealScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  
  const [mealName, setMealName] = useState("");
  const [category, setCategory] = useState((params.category as string) || "Breakfast");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([
    { name: "", portionSize: "", unit: "grams", calories: "", proteinG: "", carbsG: "", fatG: "" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  
  const mutation = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      setSuccess(true);
      setTimeout(() => router.back(), 1000);
    },
    onError: (err: any) => setError(err.message),
  });
  
  const handleSubmit = () => {
    if (!mealName.trim()) { setError("Meal name required"); return; }
    if (foodItems.length === 0 || !foodItems[0].name) { setError("Add at least one food item"); return; }
    
    mutation.mutate({
      name: mealName,
      category,
      date: new Date(date + "T12:00:00").toISOString(),
      notes: notes || undefined,
      foodItems: foodItems.filter(f => f.name).map(f => ({
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
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
                  {
                    backgroundColor: category === cat ? theme.primaryDim : theme.card,
                    borderColor: category === cat ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={{ color: category === cat ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        
        {/* Food items */}
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Food Items</Text>
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
                  { key: "calories", label: "Calories", placeholder: "200" },
                  { key: "proteinG", label: "Protein (g)", placeholder: "20" },
                  { key: "carbsG", label: "Carbs (g)", placeholder: "25" },
                  { key: "fatG", label: "Fat (g)", placeholder: "8" },
                ].map(field => (
                  <View key={field.key} style={styles.nutritionField}>
                    <Text style={[styles.miniLabel, { color: theme.textMuted }]}>{field.label}</Text>
                    <TextInput
                      value={(item as any)[field.key]}
                      onChangeText={t => setFoodItems(fi => fi.map((f, i) => i === idx ? { ...f, [field.key]: t } : f))}
                      placeholder={field.placeholder}
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.smallInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          
          <Pressable
            onPress={() => setFoodItems([...foodItems, { name: "", portionSize: "", unit: "grams", calories: "", proteinG: "", carbsG: "", fatG: "" }])}
            style={[styles.addFoodBtn, { borderColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>Add Food Item</Text>
          </Pressable>
        </View>
        
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes..."
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
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  foodCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  foodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodNum: { fontSize: 13 },
  foodInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  portionRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  miniLabel: { fontSize: 11, marginBottom: 4 },
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
