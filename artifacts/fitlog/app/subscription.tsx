import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const FREE_FEATURES = [
  "Unlimited workout & meal logging",
  "AI fitness coach (50 messages/day)",
  "Basic analytics & streaks",
  "25+ workout templates",
  "Water & recovery tracking",
  "Up to 10 saved custom plans",
];

const PREMIUM_FEATURES = [
  { icon: "camera" as const, label: "AI meal photo analysis", key: "aiPhotoAnalysis" },
  { icon: "bar-chart-2" as const, label: "Advanced analytics dashboard", key: "advancedAnalytics" },
  { icon: "trending-up" as const, label: "Smart progression tracking", key: "smartProgression" },
  { icon: "moon" as const, label: "Deeper recovery insights", key: "deeperRecovery" },
  { icon: "bookmark" as const, label: "Unlimited saved workout plans", key: "unlimitedTemplates" },
  { icon: "target" as const, label: "Advanced macro & nutrition goals", key: "advancedNutrition" },
  { icon: "download" as const, label: "Data export (CSV / JSON)", key: "exportData" },
  { icon: "zap" as const, label: "Unlimited AI coach messages", key: "aiCoach" },
  { icon: "headphones" as const, label: "Priority support", key: "prioritySupport" },
];

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { subscription, plan, isPremium, availablePlans } = useSubscription();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [upgrading, setUpgrading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const premiumPlan = availablePlans.find((p: any) => p.key === "premium") ?? {
    priceMonthly: 999,
    priceYearly: 7999,
  };

  const priceMonthly = (premiumPlan.priceMonthly / 100).toFixed(2);
  const priceYearly = (premiumPlan.priceYearly / 100).toFixed(2);
  const perMonthIfYearly = (premiumPlan.priceYearly / 100 / 12).toFixed(2);
  const savings = Math.round(100 - (premiumPlan.priceYearly / (premiumPlan.priceMonthly * 12)) * 100);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await api.requestUpgrade({ plan: "premium", billingCycle });
    } catch (err: any) {
      if (err?.message?.includes("billing_not_configured") || err?.message?.includes("402")) {
        // Expected — billing not yet wired
      }
    } finally {
      setUpgrading(false);
      Alert.alert(
        "Coming Soon",
        "Stripe billing is being set up. Your plan hasn't changed. We'll notify you when Premium is available!",
        [{ text: "Got it", style: "default" }]
      );
    }
  };

  const handleSimulate = async (planKey: "free" | "premium") => {
    setSimulating(true);
    try {
      await api.simulateSubscription(planKey);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      showToast(`Switched to ${planKey} plan (dev only)`, "success");
    } catch {
      showToast("Simulation failed", "error");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20, gap: 20, paddingTop: 24 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: "#448aff18" }]}>
            <Feather name="zap" size={28} color="#448aff" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Unlock your full potential</Text>
          <Text style={[styles.heroSub, { color: theme.textMuted }]}>
            Premium gives you AI-powered insights, unlimited plans, and advanced analytics to take your training to the next level.
          </Text>
        </View>

        {/* Current plan badge */}
        <View style={[styles.currentPlanRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.currentPlanDot, { backgroundColor: isPremium ? "#448aff" : theme.primary }]} />
          <Text style={[styles.currentPlanText, { color: theme.text }]}>
            Current plan:{" "}
            <Text style={{ color: isPremium ? "#448aff" : theme.primary, fontFamily: "Inter_700Bold" }}>
              {plan?.name ?? "Free"}
            </Text>
            {subscription?.status && subscription.status !== "active" && (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {" "}· {subscription.status}
              </Text>
            )}
          </Text>
        </View>

        {/* Billing toggle (only show if not premium) */}
        {!isPremium && (
          <View style={[styles.billingToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable
              onPress={() => setBillingCycle("monthly")}
              style={[
                styles.billingOption,
                billingCycle === "monthly" && { backgroundColor: theme.primary + "22" },
              ]}
            >
              <Text style={[
                styles.billingOptionText,
                { color: billingCycle === "monthly" ? theme.primary : theme.textMuted },
              ]}>Monthly</Text>
            </Pressable>
            <Pressable
              onPress={() => setBillingCycle("yearly")}
              style={[
                styles.billingOption,
                billingCycle === "yearly" && { backgroundColor: "#448aff22" },
              ]}
            >
              <Text style={[
                styles.billingOptionText,
                { color: billingCycle === "yearly" ? "#448aff" : theme.textMuted },
              ]}>Yearly</Text>
              {savings > 0 && (
                <View style={[styles.savingsBadge, { backgroundColor: "#448aff" }]}>
                  <Text style={styles.savingsBadgeText}>Save {savings}%</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Plan cards */}
        <View style={styles.plansRow}>
          {/* Free card */}
          <View style={[styles.planCard, { backgroundColor: theme.card, borderColor: isPremium ? theme.border : theme.primary }]}>
            <View style={styles.planCardHeader}>
              <Text style={[styles.planName, { color: theme.text }]}>Free</Text>
              {!isPremium && (
                <View style={[styles.currentBadge, { backgroundColor: theme.primaryDim }]}>
                  <Text style={[styles.currentBadgeText, { color: theme.primary }]}>Current</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, { color: theme.text }]}>$0</Text>
            <Text style={[styles.planPriceSub, { color: theme.textMuted }]}>Forever free</Text>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Feather name="check" size={13} color={theme.primary} />
                  <Text style={[styles.featureText, { color: theme.textMuted }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Premium card */}
          <View style={[styles.planCard, styles.premiumCard, { backgroundColor: "#448aff0a", borderColor: "#448aff" }]}>
            <View style={[styles.premiumGlow, { backgroundColor: "#448aff" }]} />
            <View style={styles.planCardHeader}>
              <Text style={[styles.planName, { color: theme.text }]}>Premium</Text>
              {isPremium && (
                <View style={[styles.currentBadge, { backgroundColor: "#448aff22" }]}>
                  <Text style={[styles.currentBadgeText, { color: "#448aff" }]}>Active</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, { color: theme.text }]}>
              ${billingCycle === "yearly" ? perMonthIfYearly : priceMonthly}
            </Text>
            <Text style={[styles.planPriceSub, { color: theme.textMuted }]}>
              {billingCycle === "yearly" ? `$${priceYearly}/yr, billed annually` : "per month"}
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Feather name="check" size={13} color="#448aff" />
                <Text style={[styles.featureText, { color: theme.textMuted }]}>Everything in Free</Text>
              </View>
              {PREMIUM_FEATURES.map((f) => (
                <View key={f.key} style={styles.featureRow}>
                  <Feather name={f.icon} size={13} color="#448aff" />
                  <Text style={[styles.featureText, { color: theme.textMuted }]}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA */}
        {!isPremium ? (
          <View style={styles.ctaSection}>
            <Pressable
              onPress={handleUpgrade}
              disabled={upgrading}
              style={[styles.ctaBtn, { backgroundColor: "#448aff", opacity: upgrading ? 0.7 : 1 }]}
            >
              <Feather name="zap" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>
                {upgrading ? "Processing…" : `Subscribe to Premium · ${billingCycle === "yearly" ? `$${perMonthIfYearly}/mo` : `$${priceMonthly}/mo`}`}
              </Text>
            </Pressable>
            <Text style={[styles.ctaNote, { color: theme.textMuted }]}>
              Cancel anytime · Secure payment via Stripe · Coming soon
            </Text>
          </View>
        ) : (
          <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="check-circle" size={18} color="#448aff" />
            <Text style={[styles.manageText, { color: theme.text }]}>
              You're on Premium. Thank you for supporting FitLog!
            </Text>
          </View>
        )}

        {/* Dev tool (non-production only) */}
        {__DEV__ && (
          <View style={[styles.devCard, { backgroundColor: theme.card, borderColor: theme.warning + "44" }]}>
            <Text style={[styles.devTitle, { color: theme.warning }]}>Dev: Simulate Plan</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={() => handleSimulate("free")}
                disabled={simulating}
                style={[styles.devBtn, { borderColor: theme.primary }]}
              >
                <Text style={[styles.devBtnText, { color: theme.primary }]}>→ Free</Text>
              </Pressable>
              <Pressable
                onPress={() => handleSimulate("premium")}
                disabled={simulating}
                style={[styles.devBtn, { borderColor: "#448aff" }]}
              >
                <Text style={[styles.devBtnText, { color: "#448aff" }]}>→ Premium</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  hero: { alignItems: "center", gap: 10, paddingVertical: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  currentPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentPlanDot: { width: 8, height: 8, borderRadius: 4 },
  currentPlanText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  billingToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  billingOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  billingOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  savingsBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  savingsBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  plansRow: { gap: 14 },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    gap: 4,
    overflow: "hidden",
  },
  premiumCard: { borderWidth: 2 },
  premiumGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.06,
  },
  planCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  planName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  currentBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  planPrice: { fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 4 },
  planPriceSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14 },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  ctaSection: { gap: 10 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  ctaBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  ctaNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  manageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  manageText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  devCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  devTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  devBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  devBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
