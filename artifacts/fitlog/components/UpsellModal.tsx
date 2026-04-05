import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription, type SubscriptionFeatures } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";

const BLUE = "#448aff";

interface FeatureContent {
  icon: keyof typeof Feather.glyphMap;
  titleKey: string;
  benefits: string[];
}

const FEATURE_CONTENT: Partial<Record<keyof SubscriptionFeatures, FeatureContent>> = {
  aiPhotoAnalysis: {
    icon: "camera",
    titleKey: "upsell.titleAiPhoto",
    benefits: ["subscription.premiumAiPhoto", "subscription.premiumAdvancedNutrition", "subscription.premiumAiCoach"],
  },
  advancedAnalytics: {
    icon: "bar-chart-2",
    titleKey: "upsell.titleAnalytics",
    benefits: ["subscription.premiumAdvancedAnalytics", "subscription.premiumSmartProgression", "subscription.premiumDeeperRecovery"],
  },
  smartProgression: {
    icon: "trending-up",
    titleKey: "upsell.titleProgression",
    benefits: ["subscription.premiumSmartProgression", "subscription.premiumAdvancedAnalytics", "subscription.premiumAiCoach"],
  },
  deeperRecovery: {
    icon: "moon",
    titleKey: "upsell.titleRecovery",
    benefits: ["subscription.premiumDeeperRecovery", "subscription.premiumSmartProgression", "subscription.premiumAiCoach"],
  },
  unlimitedTemplates: {
    icon: "bookmark",
    titleKey: "upsell.titleTemplates",
    benefits: ["subscription.premiumUnlimitedTemplates", "subscription.premiumSmartProgression", "subscription.premiumAdvancedAnalytics"],
  },
  exportData: {
    icon: "download",
    titleKey: "upsell.titleExport",
    benefits: ["subscription.premiumExportData", "subscription.premiumAdvancedAnalytics", "subscription.premiumAiCoach"],
  },
  advancedNutrition: {
    icon: "target",
    titleKey: "upsell.titleNutrition",
    benefits: ["subscription.premiumAdvancedNutrition", "subscription.premiumAiPhoto", "subscription.premiumAiCoach"],
  },
};

const DEFAULT_CONTENT: FeatureContent = {
  icon: "zap",
  titleKey: "upsell.titleDefault",
  benefits: ["subscription.premiumAiPhoto", "subscription.premiumSmartProgression", "subscription.premiumAdvancedAnalytics"],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  feature?: keyof SubscriptionFeatures;
}

export function UpsellModal({ visible, onClose, feature }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { availablePlans } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const content = (feature ? FEATURE_CONTENT[feature] : undefined) ?? DEFAULT_CONTENT;

  const premiumPlan = availablePlans?.find((p: any) => p.key === "premium") ?? {
    priceMonthly: 999,
    priceYearly: 7999,
  };
  const priceMonthly = (premiumPlan.priceMonthly / 100).toFixed(2);
  const perMonthIfYearly = (premiumPlan.priceYearly / 100 / 12).toFixed(2);
  const priceYearly = (premiumPlan.priceYearly / 100).toFixed(2);
  const savings = Math.round(100 - (premiumPlan.priceYearly / (premiumPlan.priceMonthly * 12)) * 100);

  function handleCTA() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push("/subscription" as any);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: theme.card }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        {/* Close */}
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Feather name="x" size={20} color={theme.textMuted} />
        </Pressable>

        {/* Icon + headline */}
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: BLUE + "18" }]}>
            <Feather name={content.icon} size={28} color={BLUE} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{t(content.titleKey)}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t("upsell.subtitle")}</Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {content.benefits.map((key) => (
            <View key={key} style={styles.benefitRow}>
              <View style={[styles.benefitCheck, { backgroundColor: BLUE + "18" }]}>
                <Feather name="check" size={12} color={BLUE} />
              </View>
              <Text style={[styles.benefitText, { color: theme.text }]}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Billing toggle */}
        <View style={[styles.billingRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBillingCycle("monthly"); }}
            style={[styles.billingOption, billingCycle === "monthly" && { backgroundColor: theme.primary + "22" }]}
          >
            <Text style={[styles.billingText, { color: billingCycle === "monthly" ? theme.primary : theme.textMuted }]}>
              {t("subscription.monthly")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBillingCycle("yearly"); }}
            style={[styles.billingOption, billingCycle === "yearly" && { backgroundColor: BLUE + "22" }]}
          >
            <Text style={[styles.billingText, { color: billingCycle === "yearly" ? BLUE : theme.textMuted }]}>
              {t("subscription.yearly")}
            </Text>
            {savings > 0 && (
              <View style={[styles.saveBadge, { backgroundColor: BLUE }]}>
                <Text style={styles.saveBadgeText}>{t("subscription.savePct", { pct: savings })}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Price line */}
        <Text style={[styles.priceLine, { color: theme.textMuted }]}>
          {billingCycle === "yearly"
            ? t("upsell.priceYearly", { perMonth: perMonthIfYearly, total: priceYearly })
            : t("upsell.priceMonthly", { price: priceMonthly })}
        </Text>

        {/* CTA */}
        <Pressable
          onPress={handleCTA}
          style={[styles.ctaBtn, { backgroundColor: BLUE }]}
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.ctaText}>{t("upsell.cta")}</Text>
        </Pressable>

        <Text style={[styles.note, { color: theme.textMuted }]}>{t("upsell.note")}</Text>

        {Platform.OS !== "web" && <View style={{ height: 16 }} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000060",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 4,
  },
  closeBtn: {
    position: "absolute", top: 16, right: 20, padding: 4,
  },
  hero: { alignItems: "center", gap: 8, paddingTop: 8 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  benefits: { gap: 10 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  benefitCheck: {
    width: 24, height: 24, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  benefitText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  billingRow: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4,
  },
  billingOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 9,
  },
  billingText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  saveBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  priceLine: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -8 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 14, minHeight: 52,
  },
  ctaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  note: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -8 },
});
