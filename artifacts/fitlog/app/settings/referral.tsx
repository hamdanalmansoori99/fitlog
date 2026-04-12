import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ReferralScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["referralStats"],
    queryFn: api.getReferralStats,
  });

  const inviteCode = data?.inviteCode ?? "---";
  const totalReferrals = data?.totalReferrals ?? 0;
  const rewardedReferrals = data?.rewardedReferrals ?? 0;
  const rewardsRemaining = data?.rewardsRemaining ?? 5;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert(t("referral.copied", { defaultValue: "Copied!" }), t("referral.codeCopied", { defaultValue: "Invite code copied to clipboard" }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("referral.shareMessage", {
          defaultValue: `Join me on Ordeal! Use my invite code: ${inviteCode} to get 7 days of Premium free!`,
          code: inviteCode,
        }),
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>{t("referral.title", { defaultValue: "Invite Friends" })}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Hero */}
        <Card style={styles.heroCard}>
          <View style={[styles.heroIcon, { backgroundColor: theme.primaryDim }]}>
            <Feather name="gift" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            {t("referral.heroTitle", { defaultValue: "Give 7 Days, Get 7 Days" })}
          </Text>
          <Text style={[styles.heroDesc, { color: theme.textMuted }]}>
            {t("referral.heroDesc", { defaultValue: "Share your invite code with friends. You both get 7 days of Premium when they sign up!" })}
          </Text>
        </Card>

        {/* Invite Code */}
        <Text style={[styles.label, { color: theme.text }]}>{t("referral.yourCode", { defaultValue: "Your Invite Code" })}</Text>
        <Card style={styles.codeCard}>
          <Text style={[styles.codeText, { color: theme.primary }]}>{inviteCode}</Text>
          <Pressable onPress={handleCopy} hitSlop={8} style={[styles.copyBtn, { backgroundColor: theme.primaryDim }]}>
            <Feather name="copy" size={18} color={theme.primary} />
          </Pressable>
        </Card>

        <Button
          title={t("referral.shareCode", { defaultValue: "Share Invite Code" })}
          onPress={handleShare}
          style={{ marginTop: 12 }}
        />

        {/* Stats */}
        <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>{t("referral.stats", { defaultValue: "Referral Stats" })}</Text>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Feather name="users" size={20} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{totalReferrals}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t("referral.totalReferred", { defaultValue: "Referred" })}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Feather name="award" size={20} color={theme.secondary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{rewardedReferrals}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t("referral.rewardsEarned", { defaultValue: "Rewards Earned" })}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Feather name="star" size={20} color={theme.warning || "#ffab40"} />
            <Text style={[styles.statValue, { color: theme.text }]}>{rewardsRemaining}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t("referral.remaining", { defaultValue: "Remaining" })}</Text>
          </Card>
        </View>

        {/* How it works */}
        <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>{t("referral.howItWorks", { defaultValue: "How It Works" })}</Text>
        <Card style={{ padding: 16 }}>
          {[
            { icon: "send", text: t("referral.step1", { defaultValue: "Share your invite code with a friend" }) },
            { icon: "user-plus", text: t("referral.step2", { defaultValue: "They sign up with your code" }) },
            { icon: "gift", text: t("referral.step3", { defaultValue: "You both get 7 days of Premium!" }) },
          ].map((step, i) => (
            <View key={i} style={[styles.stepRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.stepIcon, { backgroundColor: theme.primaryDim }]}>
                <Feather name={step.icon as any} size={16} color={theme.primary} />
              </View>
              <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>{step.text}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { alignItems: "center", padding: 24, marginBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 20 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  codeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  codeText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  copyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, alignItems: "center", padding: 16, gap: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
