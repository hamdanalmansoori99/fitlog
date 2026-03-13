import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import {
  ProgressionTarget,
  StrengthTarget,
  CardioTarget,
  getTrendColor,
  formatPace,
} from "@/lib/progressionEngine";

interface ProgressionCardProps {
  target: ProgressionTarget;
  exerciseName?: string;
  compact?: boolean;
}

function TrendBadge({ trend, theme }: { trend: ProgressionTarget["trend"]; theme: any }) {
  const color = getTrendColor(trend, theme);
  const labels: Record<string, string> = {
    progress: "Level up",
    maintain: "Hold steady",
    deload: "Recovery",
    first: "First session",
  };
  const icons: Record<string, string> = {
    progress: "trending-up",
    maintain: "minus",
    deload: "trending-down",
    first: "star",
  };
  return (
    <View style={[styles.trendBadge, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <Feather name={icons[trend] as any} size={11} color={color} />
      <Text style={[styles.trendText, { color, fontFamily: "Inter_600SemiBold" }]}>{labels[trend]}</Text>
    </View>
  );
}

function StrengthDisplay({ target, compact }: { target: StrengthTarget; compact?: boolean }) {
  const { theme } = useTheme();
  const trendColor = getTrendColor(target.trend, theme);

  if (target.trend === "first") {
    return (
      <Text style={[styles.firstText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        Complete this exercise to start tracking your progression.
      </Text>
    );
  }

  return (
    <View style={styles.displayRow}>
      {target.previousDisplay && (
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Last session
          </Text>
          <Text style={[styles.colValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {target.previousDisplay}
          </Text>
        </View>
      )}
      {target.previousDisplay && (
        <View style={[styles.arrow, { backgroundColor: theme.border }]}>
          <Feather name="arrow-right" size={14} color={trendColor} />
        </View>
      )}
      <View style={styles.col}>
        <Text style={[styles.colLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Target today
        </Text>
        <Text style={[styles.colValue, { color: trendColor, fontFamily: "Inter_700Bold" }]}>
          {target.suggestedSets != null && target.suggestedReps != null
            ? `${target.suggestedSets}×${target.suggestedReps}${target.suggestedWeightKg ? ` @ ${target.suggestedWeightKg}kg` : ""}`
            : target.suggestedWeightKg != null
            ? `@ ${target.suggestedWeightKg}kg`
            : target.suggestedReps != null
            ? `${target.suggestedReps} reps`
            : "Keep current pace"}
        </Text>
      </View>
    </View>
  );
}

function CardioDisplay({ target, compact }: { target: CardioTarget; compact?: boolean }) {
  const { theme } = useTheme();
  const trendColor = getTrendColor(target.trend, theme);

  if (target.trend === "first") {
    return (
      <Text style={[styles.firstText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        Log your first session to start tracking your progression.
      </Text>
    );
  }

  const targetDisplay = [
    target.suggestedDistanceKm != null ? `${target.suggestedDistanceKm.toFixed(1)} km` : null,
    target.suggestedDurationMinutes != null ? `${target.suggestedDurationMinutes} min` : null,
    target.suggestedPaceMinPerKm != null ? `${formatPace(target.suggestedPaceMinPerKm)}/km` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.displayRow}>
      {target.previousDisplay && (
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Last session
          </Text>
          <Text style={[styles.colValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {target.previousDisplay}
          </Text>
        </View>
      )}
      {target.previousDisplay && targetDisplay && (
        <View style={[styles.arrow, { backgroundColor: theme.border }]}>
          <Feather name="arrow-right" size={14} color={trendColor} />
        </View>
      )}
      {targetDisplay ? (
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Target today
          </Text>
          <Text style={[styles.colValue, { color: trendColor, fontFamily: "Inter_700Bold" }]}>
            {targetDisplay}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ProgressionCard({
  target,
  exerciseName,
  compact = false,
}: ProgressionCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="trending-up" size={14} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {exerciseName ? exerciseName : "Suggested next target"}
          </Text>
        </View>
        <TrendBadge trend={target.trend} theme={theme} />
      </View>

      {target.type === "strength" ? (
        <StrengthDisplay target={target as StrengthTarget} compact={compact} />
      ) : (
        <CardioDisplay target={target as CardioTarget} compact={compact} />
      )}

      {target.rationale && target.trend !== "first" && (
        <View style={[styles.rationaleRow, { backgroundColor: theme.background }]}>
          <Feather name="info" size={12} color={theme.textMuted} style={{ marginTop: 1 }} />
          <Text style={[styles.rationale, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {target.rationale}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 11,
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  col: {
    flex: 1,
    gap: 2,
  },
  colLabel: {
    fontSize: 11,
  },
  colValue: {
    fontSize: 16,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rationaleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  rationale: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  firstText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
