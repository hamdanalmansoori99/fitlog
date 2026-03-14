import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AddMeasurementScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [weightKg, setWeightKg] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [arms, setArms] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  
  const mutation = useMutation({
    mutationFn: api.createMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      setSuccess(true);
      setTimeout(() => router.back(), 1000);
    },
    onError: (err: any) => setError(err.message || "Failed to save measurement. Please try again."),
  });
  
  const handleSave = () => {
    setError("");
    const hasAny = weightKg || bodyFat || chest || waist || hips || arms;
    if (!hasAny) {
      setError("Enter at least one measurement to save.");
      return;
    }
    if (weightKg) {
      const w = parseFloat(weightKg);
      if (isNaN(w) || w < 10 || w > 500) { setError("Weight must be between 10 and 500 kg."); return; }
    }
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 1 || bf > 70) { setError("Body fat must be between 1% and 70%."); return; }
    }
    if (chest) {
      const v = parseFloat(chest);
      if (isNaN(v) || v < 30 || v > 300) { setError("Chest must be between 30 and 300 cm."); return; }
    }
    if (waist) {
      const v = parseFloat(waist);
      if (isNaN(v) || v < 30 || v > 300) { setError("Waist must be between 30 and 300 cm."); return; }
    }
    if (hips) {
      const v = parseFloat(hips);
      if (isNaN(v) || v < 30 || v > 300) { setError("Hips must be between 30 and 300 cm."); return; }
    }
    if (arms) {
      const v = parseFloat(arms);
      if (isNaN(v) || v < 10 || v > 100) { setError("Arms must be between 10 and 100 cm."); return; }
    }
    mutation.mutate({
      date: new Date(date).toISOString(),
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      chestCm: chest ? parseFloat(chest) : undefined,
      waistCm: waist ? parseFloat(waist) : undefined,
      hipsCm: hips ? parseFloat(hips) : undefined,
      armsCm: arms ? parseFloat(arms) : undefined,
    });
  };
  
  if (success) {
    return (
      <View style={[styles.success, { backgroundColor: theme.background }]}>
        <View style={[styles.circle, { backgroundColor: theme.primaryDim }]}>
          <Feather name="check" size={48} color={theme.primary} />
        </View>
        <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Logged!</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Log Measurement</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
        <Input label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} placeholder="75.0" keyboardType="decimal-pad" />
        <Input label="Body Fat %" value={bodyFat} onChangeText={setBodyFat} placeholder="18.5" keyboardType="decimal-pad" />
        
        <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Circumference (cm)</Text>
        
        <View style={styles.grid}>
          <View style={{ flex: 1 }}><Input label="Chest" value={chest} onChangeText={setChest} placeholder="95" keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Input label="Waist" value={waist} onChangeText={setWaist} placeholder="80" keyboardType="decimal-pad" /></View>
        </View>
        <View style={styles.grid}>
          <View style={{ flex: 1 }}><Input label="Hips" value={hips} onChangeText={setHips} placeholder="95" keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Input label="Arms" value={arms} onChangeText={setArms} placeholder="35" keyboardType="decimal-pad" /></View>
        </View>
        
        {error ? (
          <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
            {error}
          </Text>
        ) : null}
        <Button title="Save Measurement" onPress={handleSave} loading={mutation.isPending} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 13, marginTop: 4 },
  grid: { flexDirection: "row", gap: 12 },
  success: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  circle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
});
