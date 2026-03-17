import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";

export interface DayStat {
  dayLabel: string;
  activeMinutes: number;
  isToday: boolean;
  valueLabel?: string;
}

interface WeeklyBarChartProps {
  data: DayStat[];
  emptyMessage?: string;
}

const BAR_TRACK_H = 150;

export function WeeklyBarChart({ data, emptyMessage }: WeeklyBarChartProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const allEmpty = data.length === 0 || data.every(d => d.activeMinutes === 0);
  const maxMinutes = Math.max(...data.map(d => d.activeMinutes), 1);
  const displayEmptyMessage = emptyMessage ?? t("components.weeklyBarChart.noActivityYet");

  if (allEmpty) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
          {displayEmptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {data.map((day, i) => {
          const fillH = Math.max((day.activeMinutes / maxMinutes) * BAR_TRACK_H, day.activeMinutes > 0 ? 6 : 0);
          const barColor = day.isToday ? theme.primary : theme.secondary + "80";
          const displayLabel =
            day.valueLabel !== undefined
              ? day.valueLabel
              : day.activeMinutes > 0
              ? String(day.activeMinutes)
              : "";

          return (
            <View key={i} style={styles.barWrap}>
              <View style={styles.barContainer}>
                {displayLabel ? (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.barLabel,
                      { color: day.isToday ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {displayLabel}
                  </Text>
                ) : null}
                <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                  <View style={{ flex: 1 }} />
                  <View
                    style={{
                      width: "100%",
                      height: fillH,
                      backgroundColor: barColor,
                      borderRadius: 5,
                    }}
                  />
                </View>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.dayLabel,
                  {
                    color: day.isToday ? theme.primary : theme.textMuted,
                    fontFamily: day.isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {day.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 185, gap: 6 },
  barWrap: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barContainer: { flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" },
  barTrack: {
    width: "100%",
    height: BAR_TRACK_H,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  barLabel: { fontSize: 10, marginBottom: 2 },
  dayLabel: { fontSize: 11, textAlign: "center" },
  emptyWrap: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
});
