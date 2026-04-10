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
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";

export default function EditMeasurementScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
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
      queryClient.invalidateQueries({ queryKey: ["measurementsToday"] });
      queryClient.invalidateQueries({ queryKey: ["measurement", measureId] });
      showToast(t("measurements.measurementUpdated"), "success");
      router.back();
    },
    onError: () => {
      showToast(t("measurements.failedToUpdate"), "error");
    },
  });

  const handleSave = () => {
    setValidationError("");

    let resolvedWeightKg: number | undefined;
    if (weightInput) {
      const v = parseFloat(weightInput);
      if (useImperial) {
        if (isNaN(v) || v < 22 || v > 1100) { setValidationError(t("measurements.weightRangeImperial")); return; }
        resolvedWeightKg = parseFloat((v / 2.20462).toFixed(2));
      } else {
        if (isNaN(v) || v < 10 || v > 500) { setValidationError(t("measurements.weightRangeMetric")); return; }
        resolvedWeightKg = v;
      }
    }
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 1 || bf > 70) { setValidationError(t("measurements.bodyFatRange")); return; }
    }
    if (chest) {
      const v = parseFloat(chest);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError(t("measurements.chestRange")); return; }
    }
    if (waist) {
      const v = parseFloat(waist);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError(t("measurements.waistRange")); return; }
    }
    if (hips) {
      const v = parseFloat(hips);
      if (isNaN(v) || v < 30 || v > 300) { setValidationError(t("measurements.hipsRange")); return; }
    }
    if (arms) {
      const v = parseFloat(arms);
      if (isNaN(v) || v < 10 || v > 100) { setValidationError(t("measurements.armsRange")); return; }
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
          {t("measurements.notFound")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("measurements.editMeasurement")}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={useImperial ? t("measurements.weightLbs") : t("measurements.weightKg")}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder={useImperial ? "165.0" : "75.0"}
          keyboardType="decimal-pad"
        />
        <Input
          label={t("measurements.bodyFat")}
          value={bodyFat}
          onChangeText={setBodyFat}
          placeholder="18.5"
          keyboardType="decimal-pad"
        />

        <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          {t("measurements.circumference")}
        </Text>

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input label={t("measurements.chest")} value={chest} onChangeText={setChest} placeholder="95" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t("measurements.waist")} value={waist} onChangeText={setWaist} placeholder="80" keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Input label={t("measurements.hips")} value={hips} onChangeText={setHips} placeholder="95" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t("measurements.arms")} value={arms} onChangeText={setArms} placeholder="35" keyboardType="decimal-pad" />
          </View>
        </View>

        {validationError ? (
          <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
            {validationError}
          </Text>
        ) : null}
        <Button title={t("measurements.saveChanges")} onPress={handleSave} loading={mutation.isPending} />
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
