import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

interface RecoveryLog {
  id: number;
  sleepHours?: number;
  sleepQuality?: number;
  energyLevel?: number;
  stressLevel?: number;
  soreness?: Record<string, number>;
  notes?: string;
}

interface Props {
  todayLog: RecoveryLog | null;
  theme: any;
}

const SLEEP_HOURS = [5, 6, 7, 8, 9];

const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: "😴", desc: "Terrible" },
  { value: 2, label: "😕", desc: "Poor" },
  { value: 3, label: "😐", desc: "Okay" },
  { value: 4, label: "😊", desc: "Good" },
  { value: 5, label: "✨", desc: "Great" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "🥱", desc: "Drained" },
  { value: 2, label: "😕", desc: "Low" },
  { value: 3, label: "😐", desc: "Okay" },
  { value: 4, label: "⚡", desc: "High" },
  { value: 5, label: "🔥", desc: "Peak" },
];

const STRESS_OPTIONS = [
  { value: 1, label: "😌", desc: "Chill" },
  { value: 2, label: "🙂", desc: "Low" },
  { value: 3, label: "😐", desc: "Some" },
  { value: 4, label: "😤", desc: "High" },
  { value: 5, label: "🤯", desc: "Max" },
];

const SORENESS_PARTS = [
  { key: "legs", label: "Legs" },
  { key: "glutes", label: "Glutes" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "core", label: "Core" },
];

const SORENESS_LEVELS = [
  { value: 0, label: "None", color: null },
  { value: 1, label: "Mild", color: "#ffab40" },
  { value: 2, label: "Moderate", color: "#ff7043" },
  { value: 3, label: "Severe", color: "#ef5350" },
];

function sorenessColor(level: number): string | null {
  return SORENESS_LEVELS[level]?.color ?? null;
}

function sorenessLabel(level: number): string {
  return SORENESS_LEVELS[level]?.label ?? "None";
}

function recoverySummary(log: RecoveryLog): string {
  const parts: string[] = [];
  if (log.sleepHours) parts.push(`${log.sleepHours}h sleep`);
  if (log.energyLevel) {
    const e = ENERGY_OPTIONS.find((o) => o.value === log.energyLevel);
    if (e) parts.push(`${e.label} Energy ${log.energyLevel}/5`);
  }
  const soreEntries = Object.entries(log.soreness ?? {}).filter(([, v]) => v > 0);
  if (soreEntries.length > 0) {
    const worst = soreEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const part = SORENESS_PARTS.find((p) => p.key === worst[0]);
    parts.push(`${part?.label ?? worst[0]}: ${sorenessLabel(worst[1])}`);
  }
  return parts.join("  ·  ") || "Logged";
}

export function RecoveryCheckIn({ todayLog, theme }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const [sleepHours, setSleepHours] = useState<number>(todayLog?.sleepHours ?? 8);
  const [sleepCustom, setSleepCustom] = useState(false);
  const [sleepCustomVal, setSleepCustomVal] = useState("");
  const [sleepQuality, setSleepQuality] = useState<number>(todayLog?.sleepQuality ?? 3);
  const [energyLevel, setEnergyLevel] = useState<number>(todayLog?.energyLevel ?? 3);
  const [stressLevel, setStressLevel] = useState<number>(todayLog?.stressLevel ?? 3);
  const [soreness, setSoreness] = useState<Record<string, number>>(todayLog?.soreness ?? {});

  const cycleSoreness = useCallback((key: string) => {
    setSoreness((prev) => {
      const cur = prev[key] ?? 0;
      const next = (cur + 1) % 4;
      if (next === 0) {
        const n = { ...prev };
        delete n[key];
        return n;
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      const hrs = sleepCustom
        ? parseFloat(sleepCustomVal) || sleepHours
        : sleepHours;
      return api.logRecovery({
        sleepHours: hrs,
        sleepQuality,
        energyLevel,
        stressLevel,
        soreness,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recoveryToday"] });
      setExpanded(false);
    },
  });

  const s = styles(theme);

  // ── Checked-in summary view ─────────────────────────────────────────────────
  if (todayLog && !expanded) {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <View style={s.iconBadge}>
              <Feather name="activity" size={14} color={theme.primary} />
            </View>
            <Text style={s.cardTitle}>Recovery</Text>
            <View style={s.doneBadge}>
              <Text style={s.doneBadgeText}>✓ Logged</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={8}>
            <Text style={s.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          {todayLog.sleepHours != null && (
            <View style={s.summaryChip}>
              <Feather name="moon" size={12} color={theme.primary} />
              <Text style={s.summaryChipText}>{todayLog.sleepHours}h</Text>
            </View>
          )}
          {todayLog.sleepQuality != null && (
            <View style={s.summaryChip}>
              <Text style={s.summaryChipEmoji}>
                {SLEEP_QUALITY_OPTIONS.find((o) => o.value === todayLog.sleepQuality)?.label}
              </Text>
              <Text style={s.summaryChipText}>Sleep {todayLog.sleepQuality}/5</Text>
            </View>
          )}
          {todayLog.energyLevel != null && (
            <View style={s.summaryChip}>
              <Text style={s.summaryChipEmoji}>
                {ENERGY_OPTIONS.find((o) => o.value === todayLog.energyLevel)?.label}
              </Text>
              <Text style={s.summaryChipText}>Energy {todayLog.energyLevel}/5</Text>
            </View>
          )}
          {todayLog.stressLevel != null && todayLog.stressLevel >= 4 && (
            <View style={[s.summaryChip, { borderColor: "#ff7043" }]}>
              <Text style={s.summaryChipEmoji}>
                {STRESS_OPTIONS.find((o) => o.value === todayLog.stressLevel)?.label}
              </Text>
              <Text style={[s.summaryChipText, { color: "#ff7043" }]}>High stress</Text>
            </View>
          )}
        </View>

        {Object.entries(todayLog.soreness ?? {}).some(([, v]) => v > 0) && (
          <View style={s.soreSummaryRow}>
            {Object.entries(todayLog.soreness ?? {})
              .filter(([, v]) => v > 0)
              .map(([key, val]) => {
                const part = SORENESS_PARTS.find((p) => p.key === key);
                const col = sorenessColor(val);
                return (
                  <View
                    key={key}
                    style={[s.soreChip, col ? { borderColor: col, backgroundColor: col + "22" } : {}]}
                  >
                    <Text style={[s.soreChipText, col ? { color: col } : {}]}>
                      {part?.label ?? key}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Recovery influence badge */}
        {getRecoveryInfluence(todayLog) && (
          <View style={s.influenceBanner}>
            <Feather name="zap" size={11} color={theme.primary} />
            <Text style={s.influenceText}>{getRecoveryInfluence(todayLog)}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Check-in prompt (not yet logged) ───────────────────────────────────────
  if (!todayLog && !expanded) {
    return (
      <TouchableOpacity style={s.promptCard} onPress={() => setExpanded(true)} activeOpacity={0.85}>
        <View style={s.promptLeft}>
          <View style={s.iconBadge}>
            <Feather name="activity" size={14} color={theme.primary} />
          </View>
          <View>
            <Text style={s.cardTitle}>Recovery Check-In</Text>
            <Text style={s.promptSub}>Log sleep, energy & soreness to personalise today's workout</Text>
          </View>
        </View>
        <View style={s.promptCta}>
          <Text style={s.promptCtaText}>Check In</Text>
          <Feather name="chevron-right" size={14} color={theme.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Expanded form ───────────────────────────────────────────────────────────
  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.titleRow}>
          <View style={s.iconBadge}>
            <Feather name="activity" size={14} color={theme.primary} />
          </View>
          <Text style={s.cardTitle}>Recovery Check-In</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8}>
          <Feather name="x" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Sleep hours */}
      <Text style={s.sectionLabel}>How long did you sleep?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={s.chipRow}>
          {SLEEP_HOURS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[s.valueChip, !sleepCustom && sleepHours === h && s.valueChipActive]}
              onPress={() => { setSleepHours(h); setSleepCustom(false); }}
            >
              <Text style={[s.valueChipText, !sleepCustom && sleepHours === h && s.valueChipTextActive]}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.valueChip, sleepCustom && s.valueChipActive]}
            onPress={() => setSleepCustom(true)}
          >
            <Text style={[s.valueChipText, sleepCustom && s.valueChipTextActive]}>Other</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {sleepCustom && (
        <TextInput
          style={s.customInput}
          placeholder="e.g. 6.5"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={sleepCustomVal}
          onChangeText={setSleepCustomVal}
        />
      )}

      {/* Sleep quality */}
      <Text style={s.sectionLabel}>Sleep quality</Text>
      <View style={s.emojiRow}>
        {SLEEP_QUALITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.emojiChip, sleepQuality === opt.value && s.emojiChipActive]}
            onPress={() => setSleepQuality(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, sleepQuality === opt.value && s.emojiDescActive]}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Energy */}
      <Text style={s.sectionLabel}>Energy level</Text>
      <View style={s.emojiRow}>
        {ENERGY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.emojiChip, energyLevel === opt.value && s.emojiChipActive]}
            onPress={() => setEnergyLevel(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, energyLevel === opt.value && s.emojiDescActive]}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stress */}
      <Text style={s.sectionLabel}>Stress level</Text>
      <View style={s.emojiRow}>
        {STRESS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.emojiChip, stressLevel === opt.value && s.emojiChipActive]}
            onPress={() => setStressLevel(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, stressLevel === opt.value && s.emojiDescActive]}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Soreness grid */}
      <Text style={s.sectionLabel}>Muscle soreness  <Text style={s.tapHint}>(tap to cycle)</Text></Text>
      <View style={s.sorenessGrid}>
        {SORENESS_PARTS.map((part) => {
          const level = soreness[part.key] ?? 0;
          const col = sorenessColor(level);
          return (
            <TouchableOpacity
              key={part.key}
              style={[
                s.sorenessCell,
                col
                  ? { borderColor: col, backgroundColor: col + "22" }
                  : { borderColor: theme.border },
              ]}
              onPress={() => cycleSoreness(part.key)}
            >
              <Text style={[s.sorenessCellLabel, col ? { color: col } : { color: theme.textMuted }]}>
                {part.label}
              </Text>
              <Text style={[s.sorenessCellLevel, col ? { color: col } : { color: theme.textMuted }]}>
                {sorenessLabel(level)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[s.saveBtn, mutation.isPending && s.saveBtnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <>
            <Feather name="check" size={15} color="#000" />
            <Text style={s.saveBtnText}>Save Check-In</Text>
          </>
        )}
      </TouchableOpacity>

      {mutation.isError && (
        <Text style={s.errorText}>Failed to save — please try again.</Text>
      )}
    </View>
  );
}

function getRecoveryInfluence(log: RecoveryLog): string | null {
  const soreness = log.soreness ?? {};
  const legSore = Math.max(soreness["legs"] ?? 0, soreness["glutes"] ?? 0);
  const upperSore = Math.max(
    soreness["chest"] ?? 0, soreness["back"] ?? 0,
    soreness["shoulders"] ?? 0, soreness["arms"] ?? 0
  );
  const energy = log.energyLevel ?? 3;
  const sleep = log.sleepQuality ?? 3;

  if (legSore >= 2 && upperSore >= 2) return "High soreness — cardio or mobility workout prioritised";
  if (legSore >= 2) return "Leg soreness detected — upper body session recommended";
  if (upperSore >= 2) return "Upper body sore — lower body or cardio session recommended";
  if (energy >= 4 && sleep >= 4) return "Great energy & sleep — harder session unlocked";
  if (energy <= 2 || sleep <= 2) return "Low energy — lighter session selected for you";
  return null;
}

function styles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    promptCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    promptLeft: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      flex: 1,
    },
    promptSub: {
      color: theme.textMuted,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
      maxWidth: 220,
    },
    promptCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: theme.primary + "1a",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    promptCtaText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: theme.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    doneBadge: {
      backgroundColor: theme.primary + "22",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    doneBadgeText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: "600",
    },
    editLink: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    summaryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryChipEmoji: {
      fontSize: 14,
    },
    summaryChipText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "500",
    },
    soreSummaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
      marginBottom: 8,
    },
    soreChip: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    soreChipText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: "500",
    },
    influenceBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: theme.primary + "15",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 4,
    },
    influenceText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "500",
      flex: 1,
    },
    sectionLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    tapHint: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: "400",
      textTransform: "none",
      letterSpacing: 0,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 4,
    },
    valueChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    valueChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "22",
    },
    valueChipText: {
      color: theme.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    valueChipTextActive: {
      color: theme.primary,
    },
    customInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 10,
      color: theme.text,
      fontSize: 14,
      marginBottom: 12,
      backgroundColor: theme.surface,
    },
    emojiRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    emojiChip: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    emojiChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "22",
    },
    emojiLabel: {
      fontSize: 20,
      marginBottom: 2,
    },
    emojiDesc: {
      color: theme.textMuted,
      fontSize: 9,
      fontWeight: "500",
    },
    emojiDescActive: {
      color: theme.primary,
    },
    sorenessGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    sorenessCell: {
      width: "29%",
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
    },
    sorenessCellLabel: {
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 2,
    },
    sorenessCellLevel: {
      fontSize: 10,
      fontWeight: "500",
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: "#000",
      fontSize: 15,
      fontWeight: "700",
    },
    errorText: {
      color: "#ef5350",
      fontSize: 12,
      textAlign: "center",
      marginTop: 6,
    },
  });
}
