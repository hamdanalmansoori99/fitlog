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
import { useTranslation } from "react-i18next";

const RING = 110;
const STROKE = 11;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const ML_PER_OZ = 29.5735;

function ProgressRing({ pct, totalMl, goalMl, color, successColor, useImperial }: { pct: number; totalMl: number; goalMl: number; color: string; successColor: string; useImperial: boolean }) {
  const dash = Math.max(0, Math.min(1, pct / 100)) * CIRC;
  const gap = CIRC - dash;
  const centerLabel = useImperial
    ? `${(totalMl / ML_PER_OZ).toFixed(1)} oz`
    : totalMl >= 1000 ? `${(totalMl / 1000).toFixed(1)}L` : `${totalMl}ml`;
  return (
    <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
      <Svg width={RING} height={RING} style={{ position: "absolute" }}>
        <G rotation="-90" origin={`${RING / 2},${RING / 2}`}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={color + "22"} strokeWidth={STROKE} fill="none" />
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
          {centerLabel}
        </Text>
      </View>
    </View>
  );
}

function waterInsight(pct: number, totalMl: number, goalMl: number, workedOutToday: boolean, useImperial: boolean, t: any): { text: string; icon: string } {
  const remaining = Math.max(0, goalMl - totalMl);
  const glasses = Math.ceil(remaining / 250);
  const remainingDisplay = useImperial ? `${(remaining / ML_PER_OZ).toFixed(0)} oz` : `${remaining}ml`;
  const plural = glasses > 1 ? "es" : "";

  if (pct >= 100) return { text: t("components.waterTracker.insightGoalReached"), icon: "award" };
  if (pct === 0 && workedOutToday) return { text: t("components.waterTracker.insightPostWorkout"), icon: "alert-circle" };
  if (pct === 0) return { text: useImperial ? t("components.waterTracker.insightNoWaterImperial") : t("components.waterTracker.insightNoWaterMetric"), icon: "droplet" };
  if (pct < 25) return { text: t("components.waterTracker.insightLow", { pct, glasses, plural }), icon: "alert-circle" };
  if (pct < 50) return { text: t("components.waterTracker.insightMedium", { glasses, plural }), icon: "droplet" };
  if (pct < 80) return { text: t("components.waterTracker.insightGood", { remaining: remainingDisplay }), icon: "check-circle" };
  if (pct < 100) return { text: t("components.waterTracker.insightAlmost", { remaining: remainingDisplay }), icon: "check-circle" };
  return { text: t("components.waterTracker.insightKeepUp"), icon: "droplet" };
}

function fmtTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WaterTracker({ workedOutToday = false }: { workedOutToday?: boolean }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [customVal, setCustomVal] = useState("");
  const [showLog, setShowLog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["waterToday"],
    queryFn: api.getWaterToday,
    staleTime: 30000,
  });

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings, staleTime: 60000 });
  const useImperial = settings?.unitSystem === "imperial";
  const QUICK_OZ = [5, 8, 17, 25];
  const QUICK_AMOUNTS_ML = [150, 250, 500, 750];
  const quickAmounts = useImperial ? QUICK_OZ : QUICK_AMOUNTS_ML;

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["waterToday"] });
    qc.invalidateQueries({ queryKey: ["todayStats"] });
  }, [qc]);

  const logMutation = useMutation({
    mutationFn: api.logWater,
    onSuccess: invalidate,
    onError: () => Alert.alert(t("components.waterTracker.error"), t("components.waterTracker.failedToLog")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWaterLog,
    onSuccess: invalidate,
    onError: () => Alert.alert(t("components.waterTracker.error"), t("components.waterTracker.failedToRemove")),
  });

  const handleQuickAdd = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ml = useImperial ? Math.round(amount * ML_PER_OZ) : amount;
    logMutation.mutate(ml);
  };

  const handleCustomAdd = () => {
    const val = parseFloat(customVal);
    if (!val || val <= 0) {
      Alert.alert(t("components.waterTracker.invalidAmount"), useImperial ? t("components.waterTracker.enterValueOz") : t("components.waterTracker.enterValueMl"));
      return;
    }
    const ml = useImperial ? Math.round(val * ML_PER_OZ) : Math.round(val);
    if (ml <= 0 || ml > 5000) {
      Alert.alert(t("components.waterTracker.invalidAmount"), useImperial ? t("components.waterTracker.enterValueOz") : t("components.waterTracker.enterValueMl"));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logMutation.mutate(ml);
    setCustomVal("");
  };

  const handleDelete = (id: number) => {
    Alert.alert(t("components.waterTracker.removeEntry"), t("components.waterTracker.removeEntryMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.remove"), style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const totalMl: number = data?.totalMl ?? 0;
  const goalMl: number = data?.goalMl ?? 2000;
  const pct: number = data?.percentage ?? 0;
  const logs: any[] = data?.logs ?? [];
  const insight = waterInsight(pct, totalMl, goalMl, workedOutToday, useImperial, t);
  const goalDisplay = useImperial
    ? `${(goalMl / ML_PER_OZ).toFixed(0)} oz`
    : goalMl >= 1000 ? `${(goalMl / 1000).toFixed(1)}L` : `${goalMl}ml`;

  const WATER_BLUE = "#448aff";

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: WATER_BLUE + "18" }]}>
              <Feather name="droplet" size={18} color={WATER_BLUE} />
            </View>
            <View>
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 16 }}>{t("components.waterTracker.hydration")}</Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                {t("components.waterTracker.goal", { goal: goalDisplay })}
              </Text>
            </View>
          </View>
          {logs.length > 0 && (
            <Pressable onPress={() => setShowLog((v) => !v)} hitSlop={8}>
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                {showLog ? t("components.waterTracker.hideLog") : (logs.length > 1 ? t("components.waterTracker.entries", { count: logs.length }) : t("components.waterTracker.entry", { count: logs.length }))}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.ringRow}>
          {isLoading ? (
            <View style={[styles.ringPlaceholder, { backgroundColor: theme.border }]} />
          ) : (
            <Animated.View entering={ZoomIn.duration(500)}>
              <ProgressRing pct={pct} totalMl={totalMl} goalMl={goalMl} color={WATER_BLUE} successColor={theme.primary} useImperial={useImperial} />
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

        <View style={styles.quickRow}>
          {quickAmounts.map((amount) => (
            <Pressable
              key={amount}
              onPress={() => handleQuickAdd(amount)}
              disabled={logMutation.isPending}
              style={({ pressed }) => [
                styles.quickBtn,
                { backgroundColor: pressed ? WATER_BLUE + "25" : WATER_BLUE + "14", borderColor: WATER_BLUE + "40" },
              ]}
            >
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_700Bold", fontSize: 13 }}>+{amount}</Text>
              <Text style={{ color: WATER_BLUE, fontFamily: "Inter_400Regular", fontSize: 10, opacity: 0.8 }}>{useImperial ? "oz" : "ml"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.customRow}>
          <TextInput
            value={customVal}
            onChangeText={setCustomVal}
            keyboardType="numeric"
            placeholder={useImperial ? t("components.waterTracker.customOz") : t("components.waterTracker.customMl")}
            placeholderTextColor={theme.textMuted}
            style={[styles.customInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            returnKeyType="done"
            onSubmitEditing={handleCustomAdd}
          />
          <Pressable
            onPress={handleCustomAdd}
            disabled={!customVal || logMutation.isPending}
            style={[
              styles.addBtn,
              { backgroundColor: customVal ? WATER_BLUE : theme.border },
            ]}
          >
            <Feather name="plus" size={18} color={customVal ? "#fff" : theme.textMuted} />
          </Pressable>
        </View>

        {showLog && logs.length > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.logSection, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 8 }}>
              {t("components.waterTracker.todaysLog")}
            </Text>
            {logs.map((log: any) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: WATER_BLUE + "30" }]}>
                  <Feather name="droplet" size={11} color={WATER_BLUE} />
                </View>
                <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                  {useImperial ? `${(log.amountMl / ML_PER_OZ).toFixed(1)} oz` : `${log.amountMl}ml`}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginEnd: 10 }}>
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
