import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useTranslation } from "react-i18next";

export function InstallBanner() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { installState, triggerInstall, dismiss } = useInstallPrompt();
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (installState === "available") {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }).start();
    } else if (installState !== "idle") {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [installState]);

  if (Platform.OS !== "web" || installState !== "available") return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: theme.card,
          borderColor: theme.primary,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primary + "22" }]}>
          <Feather name="download" size={18} color={theme.primary} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{t("components.installBanner.installFitLog")}</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            {t("components.installBanner.installMessage")}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={triggerInstall}
          style={[styles.installBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.installText, { color: "#0f0f1a" }]}>{t("components.installBanner.install")}</Text>
        </Pressable>
        <Pressable onPress={dismiss} style={styles.dismissBtn} hitSlop={12}>
          <Feather name="x" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textBlock: { flex: 1 },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  installBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  installText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  dismissBtn: { padding: 4 },
});
