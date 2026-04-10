import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { RANKS, getRankByXp, getXpProgress } from "@/lib/ranks";
import { RankBadge } from "@/components/RankBadge";
import { rtlIcon } from "@/lib/rtl";

export default function RankScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 300_000,
  });

  const xp: number = (profile as any)?.xp ?? 0;
  const currentRank = getRankByXp(xp);
  const progress = getXpProgress(xp);
  const nextRank = RANKS.find((r) => r.tier === currentRank.tier + 1) ?? null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Your Rank
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 }}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <RankBadge xp={xp} size="lg" />
          <Text
            style={[
              styles.rankName,
              { color: currentRank.textColor, fontFamily: "Inter_700Bold" },
            ]}
          >
            {currentRank.name}
          </Text>
          <Text
            style={[
              styles.flavorText,
              { color: theme.textMuted, fontFamily: "Inter_400Regular" },
            ]}
          >
            {currentRank.flavorText}
          </Text>
        </View>

        {/* XP Progress */}
        <View
          style={[
            styles.progressCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: currentRank.borderColor,
                  width: `${Math.round(progress.percent * 100)}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressLabel,
              { color: theme.textMuted, fontFamily: "Inter_500Medium" },
            ]}
          >
            {currentRank.maxXp === null
              ? "MAX RANK"
              : `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP to ${nextRank?.name ?? "next rank"}`}
          </Text>
          <Text
            style={[
              styles.totalXp,
              { color: theme.text, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {xp.toLocaleString()} total XP
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* All Ranks list */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text, fontFamily: "Inter_700Bold" },
          ]}
        >
          All Ranks
        </Text>

        <View style={{ gap: 8 }}>
          {RANKS.map((rank) => {
            const isCurrent = rank.tier === currentRank.tier;
            const isEarned = rank.tier < currentRank.tier;
            const isLocked = rank.tier > currentRank.tier;

            return (
              <View
                key={rank.tier}
                style={[
                  styles.rankRow,
                  {
                    backgroundColor: isCurrent
                      ? rank.bgColor
                      : isEarned
                      ? theme.card
                      : theme.card,
                    borderColor: isCurrent
                      ? rank.borderColor
                      : isEarned
                      ? theme.border
                      : theme.border + "60",
                    opacity: isLocked ? 0.45 : 1,
                  },
                ]}
              >
                <RankBadge xp={rank.minXp} size="sm" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={{
                      color: isCurrent ? rank.textColor : isEarned ? theme.text : theme.textMuted,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {rank.name}
                    {isCurrent ? "  ◀ current" : ""}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontFamily: "Inter_400Regular",
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    {rank.maxXp === null
                      ? `${rank.minXp.toLocaleString()}+ XP`
                      : `${rank.minXp.toLocaleString()} – ${rank.maxXp.toLocaleString()} XP`}
                  </Text>
                </View>
                {isEarned && (
                  <Feather name="check-circle" size={16} color={theme.primary} />
                )}
                {isLocked && (
                  <Feather name="lock" size={14} color={theme.textMuted} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  rankName: {
    fontSize: 28,
    marginTop: 8,
  },
  flavorText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  progressCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 100,
    backgroundColor: "#ffffff18",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 100,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  totalXp: {
    fontSize: 13,
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
});
