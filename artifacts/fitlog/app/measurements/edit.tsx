import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function EditMeasurementScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const measureId = parseInt(id || "0");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [weightInput, setWeightInput] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [arms, setArms] = useState("");
  const [validationError, setValidationError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: 60000,
  });
  const useImperial = settings?.unitSystem === "imperial";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["measurement", measureId],
    queryFn: () => api.getMeasurement(measureId),
    enabled: measureId > 0,
  });

  useEffect(() => {
    if (data && !prefilled) {
      if (data.weightKg != null) {
        setWeightInput(useImperial
          ? (data.weightKg * 2.20462).toFixed(1)
          : String(data.weightKg));
      }
      setBodyFat(data.bodyFatPercent != null ? String(data.bodyFatPercent) : "");
      setChest(data.chestCm != null ? String(data.chestCm) : "");
      setWaist(data.waistCm != null ? String(data.waistCm) : "");
      setHips(data.hipsCm != null ? String(data.hipsCm) : "");
      setArms(data.armsCm != null ? String(data.armsCm) : "");
      setPrefilled(true);
    }
  }, [data, useImperial]);

  const mutation = useMutation({
    mutationFn: (body: any) => api.updateMeasurement(measureId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["measurement", measureId] });
      showToast("Measurement updated", "success");
      router.back();
    },
    onError: () => {
      showToast("Failed to update measurement", "error");
    },
  });

  const handleSave = () => {
    setValidationError("");

    let resolvedWeightKg: number | undefined;
    if (weightInput) {
      const v = parseFloat(weightInput);
      if (useImperial) {
        if (isNaN(v) || v < 22 || v > 1100) { setValidationError("Weight must be between 22 and 1,100 lbs."); return; }
        resolvedWeightKg = parseFloat((v / 2.20462).toFixed(2));
      } else {
        if (isNaN(v) || v < 10 || v > 500) { setValidationError("Weight must be between 10 and 500 kg."); return; }
        resolvedWeightKg = v;
      }
    }
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 1 || bf > 70) { setValidationError("Body fat must be between 1% and 70%."); return; }
    }
    if (chest) {
      const v = parseFloat(chest);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError("Chest must be between 30 and 300 cm."); return; }
    }
    if (waist) {
      const v = parseFloat(waist);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError("Waist must be between 30 and 300 cm."); return; }
    }
    if (hips) {
      const v = parseFloat(hips);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError("Hips must be between 30 and 300 cm."); return; }
    }
    if (arms) {
      const v = parseFloat(arms);
      if (isNaN(v) || v < 10 || v > 100) { setValidationError("Arms must be between 10 and 100 cm."); return; }
    }
    mutation.mutate({
      weightKg: resolvedWeightKg,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      chestCm: chest ? parseFloat(chest) : undefined,
      waistCm: waist ? parseFloat(waist) : undefined,
      hipsCm: hips ? parseFloat(hips) : undefined,
      armsCm: arms ? parseFloat(arms) : undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (isError || !measureId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular" }}>
          Measurement not found.
        </Text>
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
          Edit Measurement
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={useImperial ? "Weight (lbs)" : "Weight (kg)"}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder={useImperial ? "165.0" : "75.0"}
          keyboardType="decimal-pad"
        />
        <Input
          label="Body Fat %"
          value={bodyFat}
          onChangeText={setBodyFat}
          placeholder="18.5"
          keyboardType="decimal-pad"
        />

        <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Circumference (cm)
        </Text>

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input label="Chest" value={chest} onChangeText={setChest} placeholder="95" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Waist" value={waist} onChangeText={setWaist} placeholder="80" keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input label="Hips" value={hips} onChangeText={setHips} placeholder="95" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Arms" value={arms} onChangeText={setArms} placeholder="35" keyboardType="decimal-pad" />
          </View>
        </View>

        {validationError ? (
          <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
            {validationError}
          </Text>
        ) : null}
        <Button title="Save Changes" onPress={handleSave} loading={mutation.isPending} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  navTitle: { fontSize: 17 },
  content: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 13, marginTop: 4 },
  grid: { flexDirection: "row", gap: 12 },
});
