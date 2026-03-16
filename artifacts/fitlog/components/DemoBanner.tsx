import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useDemoStore } from "@/store/demoStore";
import { useTranslation } from "react-i18next";

export function DemoBanner() {
  const isDemo = useDemoStore((s) => s.isDemo);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!isDemo) return null;

  return (
    <View
      style={[
        styles.banner,
        { paddingTop: Platform.OS === "web" ? 8 : insets.top + 4 },
      ]}
      pointerEvents="none"
    >
      <Feather name="eye" size={13} color="#fff" />
      <Text style={styles.text}>{t("demo.bannerText")}</Text>
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
    backgroundColor: "#448aff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
