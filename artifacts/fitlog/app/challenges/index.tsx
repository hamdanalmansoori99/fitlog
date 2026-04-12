import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";

function ChallengeCard({ challenge, theme, t }: { challenge: any; theme: any; t: any }) {
  const isActive = challenge.status === "active";
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000));
  const typeIcons: Record<string, string> = { streak: "zap", volume: "trending-up", consistency: "target" };

  return (
    <Pressable onPress={() => router.push(`/challenges/${challenge.id}` as any)}>
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.typeIcon, { backgroundColor: isActive ? theme.primaryDim : theme.card }]}>
            <Feather name={(typeIcons[challenge.type] ?? "flag") as any} size={20} color={isActive ? theme.primary : theme.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{challenge.title}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {t(`challenges.type.${challenge.type}`, { defaultValue: challenge.type })}
              </Text>
              <Text style={{ color: theme.border }}>·</Text>
              <Text style={{ color: isActive ? theme.primary : theme.textMuted, fontSize: 12 }}>
                {isActive ? t("challenges.daysLeft", { count: daysLeft, defaultValue: `${daysLeft} days left` }) : t(`challenges.status.${challenge.status}`, { defaultValue: challenge.status })}
              </Text>
            </View>
          </View>
          <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: api.getChallenges,
  });

  const challenges = data?.challenges ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t("challenges.title", { defaultValue: "Challenges" })}</Text>
        <Pressable onPress={() => router.push("/challenges/create" as any)} hitSlop={12}>
          <Feather name="plus" size={22} color={theme.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={({ item }) => <ChallengeCard challenge={item} theme={theme} t={t} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="flag" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {t("challenges.noChallenges", { defaultValue: "No challenges yet. Create one and invite friends!" })}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { marginBottom: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", marginTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
