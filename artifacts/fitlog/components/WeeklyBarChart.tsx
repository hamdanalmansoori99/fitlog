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

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const { theme } = useTheme();
  const maxMinutes = Math.max(...data.map(d => d.activeMinutes), 1);
  
  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {data.map((day, i) => {
          const height = Math.max((day.activeMinutes / maxMinutes) * 100, 4);
          const barColor = day.isToday ? theme.primary : theme.secondary + "80";
          
          return (
            <View key={i} style={styles.barWrap}>
              <View style={styles.barContainer}>
                {day.activeMinutes > 0 && (
                  <Text style={[styles.barLabel, { color: day.isToday ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                    {day.activeMinutes}
                  </Text>
                )}
                <View style={[styles.barBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${height}%`,
                        backgroundColor: barColor,
                        borderRadius: 6,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[
                styles.dayLabel,
                {
                  color: day.isToday ? theme.primary : theme.textMuted,
                  fontFamily: day.isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}>
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
  barBg: { width: "100%", height: 100, borderRadius: 6, justifyContent: "flex-end" },
  bar: { width: "100%" },
  barLabel: { fontSize: 9, marginBottom: 2 },
  dayLabel: { fontSize: 11, textAlign: "center" },
});
