import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const isConnected = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (isConnected) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + 4 }]}
      accessibilityRole="alert"
      accessibilityLabel={t("common.offlineMessage")}
    >
      <Feather name="wifi-off" size={14} color="#fff" />
      <Text style={styles.text}>{t("common.offlineMessage")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#ef5350",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
