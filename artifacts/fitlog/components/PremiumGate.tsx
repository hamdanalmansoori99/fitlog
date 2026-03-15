import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription, type SubscriptionFeatures } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";

interface PremiumGateProps {
  feature: keyof SubscriptionFeatures;
  message?: string;
  children: React.ReactNode;
  compact?: boolean;
  minHeight?: number;
}

export function PremiumGate({ feature, message, children, compact = false, minHeight }: PremiumGateProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { features, isLoading } = useSubscription();

  if (isLoading || features[feature]) {
    return <>{children}</>;
  }

  const defaultMessages: Partial<Record<keyof SubscriptionFeatures, string>> = {
    aiPhotoAnalysis: t("components.premiumGate.aiPhotoAnalysis"),
    advancedAnalytics: t("components.premiumGate.advancedAnalytics"),
    smartProgression: t("components.premiumGate.smartProgression"),
    deeperRecovery: t("components.premiumGate.deeperRecovery"),
    unlimitedTemplates: t("components.premiumGate.unlimitedTemplates"),
    exportData: t("components.premiumGate.exportData"),
    advancedNutrition: t("components.premiumGate.advancedNutrition"),
  };

  const displayMessage = message ?? defaultMessages[feature] ?? t("components.premiumGate.upgradeMessage");

  return (
    <View style={{ position: "relative" }}>
      <View style={{ opacity: 0.25, pointerEvents: "none" }}>
        {children}
      </View>

      <View
        style={[
          styles.overlay,
          compact ? styles.overlayCompact : styles.overlayFull,
          {
            backgroundColor: theme.card + "f0",
            borderColor: "#448aff30",
            minHeight: minHeight ?? (compact ? 64 : 120),
          },
        ]}
      >
        <View style={[styles.lockWrap, { backgroundColor: "#448aff18" }]}>
          <Feather name="lock" size={compact ? 14 : 20} color="#448aff" />
        </View>

        {!compact && (
          <Text style={[styles.lockTitle, { color: theme.text }]}>{t("components.premiumGate.premiumFeature")}</Text>
        )}

        <Text
          style={[
            styles.lockMessage,
            { color: theme.textMuted },
            compact && { fontSize: 11, textAlign: "center" },
          ]}
          numberOfLines={compact ? 2 : 4}
        >
          {displayMessage}
        </Text>

        <Pressable
          onPress={() => router.push("/subscription" as any)}
          style={[styles.upgradeBtn, compact && styles.upgradeBtnCompact]}
        >
          <Feather name="zap" size={compact ? 11 : 13} color="#0f0f1a" />
          <Text style={[styles.upgradeBtnText, compact && { fontSize: 11 }]}>
            {compact ? t("components.premiumGate.upgrade") : t("components.premiumGate.upgradeToPremium")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  overlayFull: { gap: 10 },
  overlayCompact: { gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  lockWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  lockMessage: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#448aff",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  upgradeBtnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 0,
  },
  upgradeBtnText: {
    color: "#0f0f1a",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
