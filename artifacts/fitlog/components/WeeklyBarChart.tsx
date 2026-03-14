import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface DayStat {
  dayLabel: string;
  activeMinutes: number;
  isToday: boolean;
}

interface WeeklyBarChartProps {
  data: DayStat[];
}

const BAR_TRACK_H = 100;

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const { theme } = useTheme();
  const maxMinutes = Math.max(...data.map(d => d.activeMinutes), 1);

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {data.map((day, i) => {
          const fillH = Math.max((day.activeMinutes / maxMinutes) * BAR_TRACK_H, day.activeMinutes > 0 ? 6 : 0);
          const barColor = day.isToday ? theme.primary : theme.secondary + "80";

          return (
            <View key={i} style={styles.barWrap}>
              <View style={styles.barContainer}>
                {day.activeMinutes > 0 && (
                  <Text style={[styles.barLabel, { color: day.isToday ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    {day.activeMinutes}
                  </Text>
                )}
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
  bars: { flexDirection: "row", alignItems: "flex-end", height: 130, gap: 6 },
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
  barLabel: { fontSize: 9, marginBottom: 2 },
  dayLabel: { fontSize: 11, textAlign: "center" },
});
