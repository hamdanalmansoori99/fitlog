import React, { useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";

// ─── Progress ring config ─────────────────────────────────────────────────────

const RING = 110;
const STROKE = 11;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function ProgressRing({ pct, totalMl, goalMl, color, successColor }: { pct: number; totalMl: number; goalMl: number; color: string; successColor: string }) {
  const dash = Math.max(0, Math.min(1, pct / 100)) * CIRC;
  const gap = CIRC - dash;
  return (
    <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
      <Svg width={RING} height={RING} style={{ position: "absolute" }}>
        <G rotation="-90" origin={`${RING / 2},${RING / 2}`}>
          {/* Track */}
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={color + "22"} strokeWidth={STROKE} fill="none" />
          {/* Progress */}
          <Circle
            cx={RING / 2} cy={RING / 2} r={R}
            stroke={pct >= 100 ? successColor : color}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: pct >= 100 ? 18 : 20 }}>
          {pct >= 100 ? "✓" : `${pct}%`}
        </Text>
        <Text style={{ color, fontFamily: "Inter_400Regular", fontSize: 10, opacity: 0.8, marginTop: 1 }}>
          {totalMl >= 1000 ? `${(totalMl / 1000).toFixed(1)}L` : `${totalMl}ml`}
        </Text>
      </View>
    </View>
  );
}

// ─── Insight text ─────────────────────────────────────────────────────────────

function waterInsight(pct: number, totalMl: number, goalMl: number, workedOutToday: boolean): { text: string; icon: string } {
  const remaining = Math.max(0, goalMl - totalMl);
  const glasses = Math.ceil(remaining / 250);

  if (pct >= 100) return { text: "Hydration goal reached — great job staying on top of it! 💧", icon: "award" };
  if (pct === 0 && workedOutToday) return { text: "Hydration is especially important after today's workout — start sipping!", icon: "alert-circle" };
  if (pct === 0) return { text: "You haven't logged any water today — aim for 2–3 litres.", icon: "droplet" };
  if (pct < 25) return { text: `You're only at ${pct}% of your water goal — ${glasses} more glass${glasses > 1 ? "es" : ""} would make a big difference.`, icon: "alert-circle" };
  if (pct < 50) return { text: `Drink ${glasses} more glass${glasses > 1 ? "es" : ""} to hit your target — you're getting there.`, icon: "droplet" };
  if (pct < 80) return { text: `Good progress — ${remaining}ml left to reach your goal today.`, icon: "check-circle" };
  if (pct < 100) return { text: `Almost there! Just ${remaining}ml away from today's water goal.`, icon: "check-circle" };
  return { text: "Keep it up — staying hydrated supports your performance and recovery.", icon: "droplet" };
}

function fmtTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Quick-add amounts ────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [150, 250, 500, 750];

// ─── Component ────────────────────────────────────────────────────────────────

export function WaterTracker({ workedOutToday = false }: { workedOutToday?: boolean }) {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [customMl, setCustomMl] = useState("");
  const [showLog, setShowLog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["waterToday"],
    queryFn: api.getWaterToday,
    staleTime: 30000,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["waterToday"] });
    qc.invalidateQueries({ queryKey: ["todayStats"] });
  }, [qc]);

  const logMutation = useMutation({
    mutationFn: api.logWater,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWaterLog,
    onSuccess: invalidate,
  });

  const handleQuickAdd = (ml: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logMutation.mutate(ml);
  };

  const handleCustomAdd = () => {
    const ml = parseInt(customMl);
    if (!ml || ml <= 0 || ml > 5000) {
      Alert.alert("Invalid amount", "Enter a value between 1 and 5000ml.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logMutation.mutate(ml);
    setCustomMl("");
  };

  const handleDelete = (id: number) => {
    Alert.alert("Remove entry?", "This water log will be deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const totalMl: number = data?.totalMl ?? 0;
  const goalMl: number = data?.goalMl ?? 2000;
  const pct: number = data?.percentage ?? 0;
  const logs: any[] = data?.logs ?? [];
  const insight = waterInsight(pct, totalMl, goalMl, workedOutToday);

  const WATER_BLUE = "#448aff";

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: WATER_BLUE + "18" }]}>
              <Feather name="droplet" size={18} color={WATER_BLUE} />
            </View>
            <View>
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>Hydration</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                Goal: {goalMl >= 1000 ? `${(goalMl / 1000).toFixed(1)}L` : `${goalMl}ml`}
              </Text>
            </View>
          </View>
          {logs.length > 0 && (
            <Pressable onPress={() => setShowLog((v) => !v)} hitSlop={8}>
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                {showLog ? "Hide log" : `${logs.length} entr${logs.length > 1 ? "ies" : "y"}`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Ring + insight row */}
        <View style={styles.ringRow}>
          {isLoading ? (
            <View style={[styles.ringPlaceholder, { backgroundColor: theme.border }]} />
          ) : (
            <Animated.View entering={ZoomIn.duration(500)}>
              <ProgressRing pct={pct} totalMl={totalMl} goalMl={goalMl} color={WATER_BLUE} successColor={theme.primary} />
            </Animated.View>
          )}

          <View style={styles.insightBox}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
              <Feather name={insight.icon as any} size={13} color={pct >= 100 ? theme.primary : pct < 30 ? theme.orange : WATER_BLUE} style={{ marginTop: 1 }} />
              <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, flex: 1 }}>
                {insight.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick-add buttons */}
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((ml) => (
            <Pressable
              key={ml}
              onPress={() => handleQuickAdd(ml)}
              disabled={logMutation.isPending}
              style={({ pressed }) => [
                styles.quickBtn,
                { backgroundColor: pressed ? WATER_BLUE + "25" : WATER_BLUE + "14", borderColor: WATER_BLUE + "40" },
              ]}
            >
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_700Bold", fontSize: 13 }}>+{ml}</Text>
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_400Regular", fontSize: 10, opacity: 0.8 }}>ml</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom amount */}
        <View style={styles.customRow}>
          <TextInput
            value={customMl}
            onChangeText={setCustomMl}
            keyboardType="numeric"
            placeholder="Custom ml…"
            placeholderTextColor={theme.textMuted}
            style={[styles.customInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            returnKeyType="done"
            onSubmitEditing={handleCustomAdd}
          />
          <Pressable
            onPress={handleCustomAdd}
            disabled={!customMl || logMutation.isPending}
            style={[
              styles.addBtn,
              { backgroundColor: customMl ? WATER_BLUE : theme.border },
            ]}
          >
            <Feather name="plus" size={18} color={customMl ? "#fff" : theme.textMuted} />
          </Pressable>
        </View>

        {/* Today's log */}
        {showLog && logs.length > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.logSection, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 8 }}>
              TODAY'S LOG
            </Text>
            {logs.map((log: any) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: WATER_BLUE + "30" }]}>
                  <Feather name="droplet" size={11} color={WATER_BLUE} />
                </View>
                <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                  {log.amountMl}ml
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginRight: 10 }}>
                  {fmtTime(log.loggedAt)}
                </Text>
                <Pressable onPress={() => handleDelete(log.id)} hitSlop={8}>
                  <Feather name="x" size={14} color={theme.textMuted} />
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 16, padding: 16, gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringPlaceholder: { width: RING, height: RING, borderRadius: RING / 2 },
  insightBox: { flex: 1 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 1,
  },
  customRow: { flexDirection: "row", gap: 8 },
  customInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 14,
  },
  addBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logSection: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logDot: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
});
