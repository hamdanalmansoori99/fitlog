import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { dateLocale } from "@/lib/rtl";

const DAY_LABEL_KEYS = [
  "components.weeklyBarChart.mon",
  "components.weeklyBarChart.tue",
  "components.weeklyBarChart.wed",
  "components.weeklyBarChart.thu",
  "components.weeklyBarChart.fri",
  "components.weeklyBarChart.sat",
  "components.weeklyBarChart.sun",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface WorkoutEntry {
  id: number;
  name: string;
  activityType: string;
  durationMinutes: number;
}

interface DayDetail {
  date: string;
  workouts: WorkoutEntry[];
}

interface AppTheme {
  primary: string;
  secondary: string;
  cyan?: string;
  purple?: string;
  warning?: string;
  pink?: string;
  textMuted: string;
  [key: string]: string | undefined;
}

function activityColor(type: string, theme: AppTheme): string {
  const map: Record<string, string> = {
    running: theme.primary,
    cycling: theme.secondary,
    walking: theme.cyan ?? theme.primary,
    gym: theme.purple ?? theme.primary,
    swimming: "#4fc3f7",
    tennis: theme.warning ?? "#ffab40",
    yoga: theme.pink ?? theme.primary,
    other: theme.textMuted,
  };
  return map[type] ?? theme.primary;
}

export function WorkoutCalendar() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<DayDetail | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workoutCalendar", year, month],
    queryFn: () => api.getWorkoutCalendar(year, month),
    staleTime: 60000,
  });

  const days: Record<string, WorkoutEntry[]> = data?.days ?? {};
  const mealDaySet = new Set<string>(data?.mealDays ?? []);

  const goMonth = useCallback((delta: number) => {
    setSelected(null);
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }, [month, year]);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const isoDay = firstDay.getDay();
  const startOffset = isoDay === 0 ? 6 : isoDay - 1;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = now.toISOString().split("T")[0];

  function handleDayPress(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const workouts = days[dateStr] ?? [];
    if (workouts.length === 0) return;
    setSelected({ date: dateStr, workouts });
    setDetailModal(true);
  }

  const totalWorkouts = Object.values(days).reduce((s, arr) => s + arr.length, 0);

  const dayLabels = DAY_LABEL_KEYS.map((key) => t(key));

  return (
    <View style={[s.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={s.header}>
        <Pressable onPress={() => goMonth(-1)} hitSlop={10} style={s.arrow}>
          <Feather name="chevron-left" size={20} color={theme.textMuted} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          {totalWorkouts > 0 && (
            <Text style={{ color: theme.primary, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>
              {t("components.workoutCalendar.workoutsThisMonth", { count: totalWorkouts, plural: totalWorkouts !== 1 ? "s" : "" })}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => goMonth(1)}
          hitSlop={10}
          style={s.arrow}
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={year === now.getFullYear() && month === now.getMonth() + 1 ? theme.border : theme.textMuted}
          />
        </Pressable>
      </View>

      <View style={s.dayLabelsRow}>
        {dayLabels.map((d) => (
          <Text key={d} style={[s.dayLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{d}</Text>
        ))}
      </View>

      {isLoading ? (
        <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("components.workoutCalendar.loading")}</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={s.cell} />;
            }
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const workouts: WorkoutEntry[] = days[dateStr] ?? [];
            const hasWorkout = workouts.length > 0;
            const hasMeal = mealDaySet.has(dateStr);
            const isToday = dateStr === todayStr;
            const primaryType = workouts[0]?.activityType ?? "other";
            const dotColor = activityColor(primaryType, theme);

            return (
              <Pressable
                key={day}
                onPress={() => handleDayPress(day)}
                style={[
                  s.cell,
                  isToday && { backgroundColor: theme.primary + "22", borderRadius: 8 },
                  hasWorkout && { backgroundColor: dotColor + "18", borderRadius: 8 },
                ]}
              >
                <Text style={[
                  s.dayNum,
                  {
                    color: isToday ? theme.primary : hasWorkout ? theme.text : theme.textMuted,
                    fontFamily: isToday ? "Inter_700Bold" : hasWorkout ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}>
                  {day}
                </Text>
                <View style={{ flexDirection: "row", gap: 2, marginTop: 2, justifyContent: "center", minHeight: 7 }}>
                  {hasWorkout && workouts.slice(0, 3).map((w: WorkoutEntry, i: number) => (
                    <View
                      key={i}
                      style={[s.dot, { backgroundColor: activityColor(w.activityType, theme) }]}
                    />
                  ))}
                  {hasMeal && (
                    <View style={[s.dot, { backgroundColor: theme.warning ?? "#ffab40" }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal
        visible={detailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setDetailModal(false)}>
          <View style={[s.detailCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 10 }}>
              {selected && new Date(selected.date + "T12:00:00").toLocaleDateString(dateLocale(), { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            {selected?.workouts.map((w) => (
              <View key={w.id} style={[s.detailRow, { borderBottomColor: theme.border }]}>
                <View style={[s.detailDot, { backgroundColor: activityColor(w.activityType, theme) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{w.name}</Text>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textTransform: "capitalize" }}>
                    {w.activityType}{w.durationMinutes ? ` · ${w.durationMinutes} min` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  arrow: { width: 32, alignItems: "center" },
  dayLabelsRow: { flexDirection: "row", marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dayNum: { fontSize: 13 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  modalOverlay: { flex: 1, backgroundColor: "#00000080", alignItems: "center", justifyContent: "center", padding: 32 },
  detailCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  detailDot: { width: 10, height: 10, borderRadius: 5 },
});
