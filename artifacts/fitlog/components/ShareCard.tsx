import React, { forwardRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

export type ShareCardType = "workout" | "pr" | "weekly" | "streak";

export interface ShareCardProps {
  type: ShareCardType;
  headline: string;
  subline?: string;
  stats: Array<{ label: string; value: string; accent?: boolean }>;
  date?: string;
}

const BG = "#0f0f1a";
const GREEN = "#00e676";
const BLUE = "#448aff";
const MUTED = "#7a7a8c";
const CARD_BG = "#1a1a2e";

const TYPE_META: Record<ShareCardType, { icon: string; accent: string; label: string }> = {
  workout: { icon: "activity", accent: GREEN, label: "Workout Complete" },
  pr: { icon: "award", accent: GREEN, label: "New Personal Record" },
  weekly: { icon: "bar-chart-2", accent: BLUE, label: "Weekly Report" },
  streak: { icon: "zap", accent: "#ffab40", label: "Streak Milestone" },
};

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { type, headline, subline, stats, date },
  ref
) {
  const meta = TYPE_META[type];

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={[styles.accentBar, { backgroundColor: meta.accent }]} />

      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: meta.accent + "22" }]}>
          <Feather name={meta.icon as any} size={20} color={meta.accent} />
        </View>
        <View>
          <Text style={[styles.typeLabelText, { color: meta.accent }]}>{meta.label}</Text>
          {date && <Text style={styles.dateText}>{date}</Text>}
        </View>
        <View style={styles.brandWrap}>
          <Text style={styles.brandText}>FitLog</Text>
        </View>
      </View>

      <Text style={styles.headline}>{headline}</Text>
      {subline ? <Text style={styles.subline}>{subline}</Text> : null}

      {stats.length > 0 && (
        <View style={styles.statsGrid}>
          {stats.slice(0, 4).map((s, i) => (
            <View key={i} style={[styles.statCell, { backgroundColor: CARD_BG }]}>
              <Text style={[styles.statValue, s.accent && { color: meta.accent }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>fitlog.app</Text>
        <View style={[styles.footerDot, { backgroundColor: meta.accent }]} />
        <Text style={styles.footerText}>Track. Improve. Repeat.</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: BG,
    borderRadius: 20,
    overflow: "hidden",
    padding: 24,
    paddingTop: 20,
    gap: 0,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
    }),
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    marginTop: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabelText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  brandWrap: {
    marginLeft: "auto",
    backgroundColor: "#ffffff12",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  brandText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#ffffff88",
    letterSpacing: 1,
  },
  headline: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#ffffff",
    lineHeight: 34,
    marginBottom: 6,
  },
  subline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  statCell: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#ffffff",
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
