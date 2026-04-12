import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { usePendingMealsStore } from "@/store/pendingMealsStore";
import { usePendingWaterStore } from "@/store/pendingWaterStore";
import { usePendingMeasurementsStore } from "@/store/pendingMeasurementsStore";
import { usePendingRecoveryStore } from "@/store/pendingRecoveryStore";

export function OfflineIndicator() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const pendingMeals = usePendingMealsStore((s) => s.queue.length);
  const pendingWater = usePendingWaterStore((s) => s.queue.length);
  const pendingMeasurements = usePendingMeasurementsStore((s) => s.queue.length);
  const pendingRecovery = usePendingRecoveryStore((s) => s.queue.length);

  const total = pendingMeals + pendingWater + pendingMeasurements + pendingRecovery;

  if (total === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.warning + "20", borderColor: theme.warning }]}>
      <Feather name="wifi-off" size={14} color={theme.warning} />
      <Text style={[styles.text, { color: theme.warning }]}>
        {t("offline.pendingSync", { count: total, defaultValue: `${total} item(s) pending sync` })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
