import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { documentDirectory, downloadAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ExportDataScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = useAuthStore.getState().token;
      const fileUri = documentDirectory + "ordeal-export.zip";
      const result = await downloadAsync(`${BASE_URL}/export`, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        throw new Error(t("export.failed", { defaultValue: "Export failed. Please try again later." }));
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, { mimeType: "application/zip", dialogTitle: "Ordeal Export" });
      } else {
        Alert.alert(t("export.saved", { defaultValue: "Saved!" }), t("export.savedTo", { defaultValue: "File saved to your device" }));
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    } finally {
      setExporting(false);
    }
  };

  const DATA_TYPES = [
    { icon: "activity", label: t("export.workouts", { defaultValue: "Workouts & exercises" }), color: theme.primary },
    { icon: "coffee", label: t("export.meals", { defaultValue: "Meals & nutrition" }), color: theme.secondary },
    { icon: "droplet", label: t("export.water", { defaultValue: "Water intake" }), color: "#4fc3f7" },
    { icon: "bar-chart-2", label: t("export.measurements", { defaultValue: "Body measurements" }), color: theme.warning || "#ffab40" },
    { icon: "heart", label: t("export.recovery", { defaultValue: "Recovery logs" }), color: "#ef5350" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>{t("export.title", { defaultValue: "Export Data" })}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <Card style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: theme.primaryDim }]}>
            <Feather name="download-cloud" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {t("export.infoTitle", { defaultValue: "Your Data, Your Way" })}
          </Text>
          <Text style={[styles.infoDesc, { color: theme.textMuted }]}>
            {t("export.infoDesc", { defaultValue: "Download all your fitness data as CSV files in a ZIP archive. Compatible with Excel, Google Sheets, and other apps." })}
          </Text>
        </Card>

        <Text style={[styles.label, { color: theme.text }]}>{t("export.includes", { defaultValue: "Export Includes" })}</Text>
        <Card style={{ padding: 4 }}>
          {DATA_TYPES.map((dt, i) => (
            <View key={i} style={[styles.dataRow, i < DATA_TYPES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.dataIcon, { backgroundColor: dt.color + "18" }]}>
                <Feather name={dt.icon as any} size={16} color={dt.color} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 }}>{dt.label}</Text>
              <Feather name="check" size={16} color={theme.primary} />
            </View>
          ))}
        </Card>

        <Button
          title={exporting ? t("export.exporting", { defaultValue: "Exporting..." }) : t("export.downloadBtn", { defaultValue: "Download ZIP" })}
          onPress={handleExport}
          loading={exporting}
          disabled={exporting}
          style={{ marginTop: 24 }}
        />

        <Text style={[styles.note, { color: theme.textMuted }]}>
          {t("export.rateLimit", { defaultValue: "You can export once per hour." })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { alignItems: "center", padding: 24, marginBottom: 20 },
  infoIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  infoTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 20 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  dataRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 12 },
  dataIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 12 },
});
