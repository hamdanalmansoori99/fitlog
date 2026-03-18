import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "react-i18next";

export default function AddMeasurementScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  const weightFocusMode = focus === "weight";

  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [weightInput, setWeightInput] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [arms, setArms] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showExtra, setShowExtra] = useState(!weightFocusMode);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: 60000,
  });
  const useImperial = settings?.unitSystem === "imperial";

  const mutation = useMutation({
    mutationFn: api.createMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["measurementsToday"] });
      setSuccess(true);
      setTimeout(() => router.back(), 1000);
    },
    onError: (err: any) => setError(err.message || t("measurements.failedToSaveRetry")),
  });

  const handleSave = () => {
    setError("");
    const hasAny = weightInput || bodyFat || chest || waist || hips || arms;
    if (!hasAny) { setError(t("measurements.enterAtLeastOne")); return; }

    let resolvedWeightKg: number | undefined;
    if (weightInput) {
      const v = parseFloat(weightInput);
      if (useImperial) {
        if (isNaN(v) || v < 22 || v > 1100) { setError(t("measurements.weightRangeImperial")); return; }
        resolvedWeightKg = parseFloat((v / 2.20462).toFixed(2));
      } else {
        if (isNaN(v) || v < 10 || v > 500) { setError(t("measurements.weightRangeMetric")); return; }
        resolvedWeightKg = v;
      }
    }
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 1 || bf > 70) { setError(t("measurements.bodyFatRange")); return; }
    }
    if (chest) {
      const v = parseFloat(chest);
      if (isNaN(v) || v < 30 || v > 300) { setError(t("measurements.chestRange")); return; }
    }
    if (waist) {
      const v = parseFloat(waist);
      if (isNaN(v) || v < 30 || v > 300) { setError(t("measurements.waistRange")); return; }
    }
    if (hips) {
      const v = parseFloat(hips);
      if (isNaN(v) || v < 30 || v > 300) { setError(t("measurements.hipsRange")); return; }
    }
    if (arms) {
      const v = parseFloat(arms);
      if (isNaN(v) || v < 10 || v > 100) { setError(t("measurements.armsRange")); return; }
    }
    mutation.mutate({
      date: new Date(date).toISOString(),
      weightKg: resolvedWeightKg,
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
        <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("measurements.logged")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("measurements.logMeasurement")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
        {weightFocusMode && (
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 4 }}>
            {t("measurements.weightQuickHint")}
          </Text>
        )}

        <Input
          label={useImperial ? t("measurements.weightLbs") : t("measurements.weightKg")}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder={useImperial ? "165.0" : "75.0"}
          keyboardType="decimal-pad"
          autoFocus={weightFocusMode}
        />

        {weightFocusMode && (
          <Pressable
            onPress={() => setShowExtra(v => !v)}
            style={[styles.toggleBtn, { borderColor: theme.border }]}
          >
            <Feather
              name={showExtra ? "chevron-up" : "chevron-down"}
              size={14}
              color={theme.textMuted}
            />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
              {showExtra ? t("measurements.hideExtraFields") : t("measurements.addMoreMeasurements")}
            </Text>
          </Pressable>
        )}

        {showExtra && (
          <>
            <Input label={t("measurements.bodyFat")} value={bodyFat} onChangeText={setBodyFat} placeholder="18.5" keyboardType="decimal-pad" />

            <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("measurements.circumference")}</Text>

            <View style={styles.grid}>
              <View style={{ flex: 1 }}><Input label={t("measurements.chest")} value={chest} onChangeText={setChest} placeholder="95" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Input label={t("measurements.waist")} value={waist} onChangeText={setWaist} placeholder="80" keyboardType="decimal-pad" /></View>
            </View>
            <View style={styles.grid}>
              <View style={{ flex: 1 }}><Input label={t("measurements.hips")} value={hips} onChangeText={setHips} placeholder="95" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Input label={t("measurements.arms")} value={arms} onChangeText={setArms} placeholder="35" keyboardType="decimal-pad" /></View>
            </View>
          </>
        )}

        {error ? (
          <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
            {error}
          </Text>
        ) : null}
        <Button title={t("measurements.saveMeasurement")} onPress={handleSave} loading={mutation.isPending} />
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
  toggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
    alignSelf: "flex-start", minHeight: 44,
  },
});
