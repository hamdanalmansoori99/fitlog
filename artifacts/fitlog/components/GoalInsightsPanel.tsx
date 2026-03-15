import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GoalInsight, getGoalLabel, GOAL_ICONS, GOAL_COLORS, detectGoalKeys, GoalKey } from "../lib/goalInsights";
import { useTranslation } from "react-i18next";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  insights: GoalInsight[];
  goals: string[];
  theme: any;
  compact?: boolean;
}

function TrendIcon({ trend, positive, color }: { trend: "up" | "down" | "flat" | null; positive: boolean; color: string }) {
  if (!trend || trend === "flat") return null;
  const good = (trend === "up") === positive;
  const name: "trending-up" | "trending-down" = trend === "up" ? "trending-up" : "trending-down";
  return <Feather name={name} size={12} color={good ? "#00e676" : "#ef5350"} />;
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function InsightCard({ insight, theme }: { insight: GoalInsight; theme: any }) {
  return (
    <View style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.insightTop}>
        <View style={[styles.insightIconWrap, { backgroundColor: insight.accentColor + "22" }]}>
          <Feather name={insight.icon as any} size={14} color={insight.accentColor} />
        </View>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightHeadline, { color: theme.textMuted }]} numberOfLines={1}>
            {insight.headline}
          </Text>
          <View style={styles.insightValueRow}>
            <Text style={[styles.insightValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {insight.value}
            </Text>
            <TrendIcon trend={insight.trend} positive={insight.trendPositive} color={insight.accentColor} />
          </View>
        </View>
      </View>

      <ProgressBar progress={insight.progress} color={insight.accentColor} />

      {insight.progressLabel && (
        <Text style={[styles.progressLabel, { color: theme.textMuted }]}>{insight.progressLabel}</Text>
      )}

      <Text style={[styles.insightDetail, { color: theme.textMuted }]} numberOfLines={3}>
        {insight.detail}
      </Text>
    </View>
  );
}

function GoalSection({ goalKey, insights, theme, compact }: {
  goalKey: GoalKey;
  insights: GoalInsight[];
  theme: any;
  compact: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const displayed = compact ? insights.slice(0, 2) : insights;
  const color = GOAL_COLORS[goalKey];
  const icon = GOAL_ICONS[goalKey] as any;
  const label = getGoalLabel(goalKey);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.goalSection}>
      <TouchableOpacity style={styles.goalHeader} onPress={toggle} activeOpacity={0.8}>
        <View style={[styles.goalIconBadge, { backgroundColor: color + "22" }]}>
          <Feather name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.goalLabel, { color: theme.text }]}>{label}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.insightGrid}>
          {displayed.map((insight) => (
            <InsightCard key={insight.id} insight={insight} theme={theme} />
          ))}
        </View>
      )}
    </View>
  );
}

export function GoalInsightsPanel({ insights, goals, theme, compact = false }: Props) {
  const { t } = useTranslation();

  if (insights.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "22" }]}>
          <Feather name="target" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{t("components.goalInsights.setYourGoals")}</Text>
        <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
          {t("components.goalInsights.addGoalsMessage")}
        </Text>
      </View>
    );
  }

  const goalKeys = detectGoalKeys(goals);

  return (
    <View style={styles.container}>
      {goalKeys.map((key) => {
        const keyInsights = insights.filter((i) => i.goalKey === key);
        if (keyInsights.length === 0) return null;
        return (
          <GoalSection
            key={key}
            goalKey={key}
            insights={keyInsights}
            theme={theme}
            compact={compact}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  goalSection: { marginBottom: 8 },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  goalIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  goalLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  insightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  insightCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  insightTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 2,
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  insightMeta: {
    flex: 1,
    minWidth: 0,
  },
  insightHeadline: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  insightValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  insightValue: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  insightDetail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
});
