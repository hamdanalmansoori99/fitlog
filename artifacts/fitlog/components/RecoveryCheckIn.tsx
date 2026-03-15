import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { rtlIcon } from "@/lib/rtl";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";

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
  { value: 1, label: "😴", descKey: "terrible" },
  { value: 2, label: "😕", descKey: "poor" },
  { value: 3, label: "😐", descKey: "okay" },
  { value: 4, label: "😊", descKey: "good" },
  { value: 5, label: "✨", descKey: "great" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "🥱", descKey: "drained" },
  { value: 2, label: "😕", descKey: "low" },
  { value: 3, label: "😐", descKey: "okay" },
  { value: 4, label: "⚡", descKey: "high" },
  { value: 5, label: "🔥", descKey: "peak" },
];

const STRESS_OPTIONS = [
  { value: 1, label: "😌", descKey: "chill" },
  { value: 2, label: "🙂", descKey: "low" },
  { value: 3, label: "😐", descKey: "some" },
  { value: 4, label: "😤", descKey: "high" },
  { value: 5, label: "🤯", descKey: "max" },
];

const SORENESS_PARTS = [
  { key: "legs", labelKey: "legs" },
  { key: "glutes", labelKey: "glutes" },
  { key: "chest", labelKey: "chest" },
  { key: "back", labelKey: "back" },
  { key: "shoulders", labelKey: "shoulders" },
  { key: "arms", labelKey: "arms" },
  { key: "core", labelKey: "core" },
];

const SORENESS_LEVELS_DATA = [
  { value: 0, labelKey: "none", color: null },
  { value: 1, labelKey: "mild", color: "#ffab40" },
  { value: 2, labelKey: "moderate", color: "#ff7043" },
  { value: 3, labelKey: "severe", color: "#ef5350" },
];

function sorenessColor(level: number): string | null {
  return SORENESS_LEVELS_DATA[level]?.color ?? null;
}

function getRecoveryInfluence(log: RecoveryLog, t: any): string | null {
  const soreness = log.soreness ?? {};
  const legSore = Math.max(soreness["legs"] ?? 0, soreness["glutes"] ?? 0);
  const upperSore = Math.max(
    soreness["chest"] ?? 0, soreness["back"] ?? 0,
    soreness["shoulders"] ?? 0, soreness["arms"] ?? 0
  );
  const energy = log.energyLevel ?? 3;
  const sleep = log.sleepQuality ?? 3;

  if (legSore >= 2 && upperSore >= 2) return t("components.recoveryCheckIn.influenceHighSoreness");
  if (legSore >= 2) return t("components.recoveryCheckIn.influenceLegSore");
  if (upperSore >= 2) return t("components.recoveryCheckIn.influenceUpperSore");
  if (energy >= 4 && sleep >= 4) return t("components.recoveryCheckIn.influenceGreatEnergy");
  if (energy <= 2 || sleep <= 2) return t("components.recoveryCheckIn.influenceLowEnergy");
  return null;
}

export function RecoveryCheckIn({ todayLog, theme }: Props) {
  const { t } = useTranslation();
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

      if (sleepCustom && sleepCustomVal) {
        const parsed = parseFloat(sleepCustomVal);
        if (isNaN(parsed) || parsed < 0 || parsed > 24) {
          return Promise.reject(new Error(t("recovery.sleepValidation")));
        }
      }

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
    onError: (err: any) => Alert.alert(t("components.recoveryCheckIn.errorTitle"), err?.message || t("components.recoveryCheckIn.errorMessage")),
  });

  const sorenessLabel = (level: number): string => {
    const key = SORENESS_LEVELS_DATA[level]?.labelKey ?? "none";
    return t(`components.recoveryCheckIn.${key}`);
  };

  const s = styles(theme);

  if (todayLog && !expanded) {
    return (
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <View style={s.iconBadge}>
              <Feather name="activity" size={14} color={theme.primary} />
            </View>
            <Text style={s.cardTitle}>{t("components.recoveryCheckIn.recovery")}</Text>
            <View style={s.doneBadge}>
              <Text style={s.doneBadgeText}>{t("components.recoveryCheckIn.logged")}</Text>
            </View>
          </View>
          <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
            <Text style={s.editLink}>{t("components.recoveryCheckIn.edit")}</Text>
          </Pressable>
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
              <Text style={s.summaryChipText}>{t("components.recoveryCheckIn.sleepLabel", { value: todayLog.sleepQuality })}</Text>
            </View>
          )}
          {todayLog.energyLevel != null && (
            <View style={s.summaryChip}>
              <Text style={s.summaryChipEmoji}>
                {ENERGY_OPTIONS.find((o) => o.value === todayLog.energyLevel)?.label}
              </Text>
              <Text style={s.summaryChipText}>{t("components.recoveryCheckIn.energyLabel", { value: todayLog.energyLevel })}</Text>
            </View>
          )}
          {todayLog.stressLevel != null && todayLog.stressLevel >= 4 && (
            <View style={[s.summaryChip, { borderColor: "#ff7043" }]}>
              <Text style={s.summaryChipEmoji}>
                {STRESS_OPTIONS.find((o) => o.value === todayLog.stressLevel)?.label}
              </Text>
              <Text style={[s.summaryChipText, { color: "#ff7043" }]}>{t("components.recoveryCheckIn.highStress")}</Text>
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
                      {part ? t(`components.recoveryCheckIn.${part.labelKey}`) : key}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {getRecoveryInfluence(todayLog, t) && (
          <View style={s.influenceBanner}>
            <Feather name="zap" size={11} color={theme.primary} />
            <Text style={s.influenceText}>{getRecoveryInfluence(todayLog, t)}</Text>
          </View>
        )}
      </View>
    );
  }

  if (!todayLog && !expanded) {
    return (
      <Pressable
        style={({ pressed }) => [s.promptCard, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setExpanded(true)}
      >
        <View style={s.promptLeft}>
          <View style={s.iconBadge}>
            <Feather name="activity" size={14} color={theme.primary} />
          </View>
          <View>
            <Text style={s.cardTitle}>{t("components.recoveryCheckIn.recoveryCheckIn")}</Text>
            <Text style={s.promptSub}>{t("components.recoveryCheckIn.promptSubtitle")}</Text>
          </View>
        </View>
        <View style={s.promptCta}>
          <Text style={s.promptCtaText}>{t("components.recoveryCheckIn.checkIn")}</Text>
          <Feather name={rtlIcon("chevron-right")} size={14} color={theme.primary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.titleRow}>
          <View style={s.iconBadge}>
            <Feather name="activity" size={14} color={theme.primary} />
          </View>
          <Text style={s.cardTitle}>{t("components.recoveryCheckIn.recoveryCheckIn")}</Text>
        </View>
        <Pressable onPress={() => setExpanded(false)} hitSlop={8}>
          <Feather name="x" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <Text style={s.sectionLabel}>{t("components.recoveryCheckIn.howLongSleep")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={s.chipRow}>
          {SLEEP_HOURS.map((h) => (
            <Pressable
              key={h}
              style={[s.valueChip, !sleepCustom && sleepHours === h && s.valueChipActive]}
              onPress={() => { setSleepHours(h); setSleepCustom(false); }}
            >
              <Text style={[s.valueChipText, !sleepCustom && sleepHours === h && s.valueChipTextActive]}>
                {h}h
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[s.valueChip, sleepCustom && s.valueChipActive]}
            onPress={() => setSleepCustom(true)}
          >
            <Text style={[s.valueChipText, sleepCustom && s.valueChipTextActive]}>{t("components.recoveryCheckIn.other")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      {sleepCustom && (
        <TextInput
          style={s.customInput}
          placeholder={t("recovery.sleepPlaceholder")}
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={sleepCustomVal}
          onChangeText={setSleepCustomVal}
        />
      )}

      <Text style={s.sectionLabel}>{t("components.recoveryCheckIn.sleepQuality")}</Text>
      <View style={s.emojiRow}>
        {SLEEP_QUALITY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[s.emojiChip, sleepQuality === opt.value && s.emojiChipActive]}
            onPress={() => setSleepQuality(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, sleepQuality === opt.value && s.emojiDescActive]}>{t(`components.recoveryCheckIn.${opt.descKey}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionLabel}>{t("components.recoveryCheckIn.energyLevel")}</Text>
      <View style={s.emojiRow}>
        {ENERGY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[s.emojiChip, energyLevel === opt.value && s.emojiChipActive]}
            onPress={() => setEnergyLevel(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, energyLevel === opt.value && s.emojiDescActive]}>{t(`components.recoveryCheckIn.${opt.descKey}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionLabel}>{t("components.recoveryCheckIn.stressLevel")}</Text>
      <View style={s.emojiRow}>
        {STRESS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[s.emojiChip, stressLevel === opt.value && s.emojiChipActive]}
            onPress={() => setStressLevel(opt.value)}
          >
            <Text style={s.emojiLabel}>{opt.label}</Text>
            <Text style={[s.emojiDesc, stressLevel === opt.value && s.emojiDescActive]}>{t(`components.recoveryCheckIn.${opt.descKey}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionLabel}>{t("components.recoveryCheckIn.muscleSoreness")}  <Text style={s.tapHint}>{t("components.recoveryCheckIn.tapToCycle")}</Text></Text>
      <View style={s.sorenessGrid}>
        {SORENESS_PARTS.map((part) => {
          const level = soreness[part.key] ?? 0;
          const col = sorenessColor(level);
          return (
            <Pressable
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
                {t(`components.recoveryCheckIn.${part.labelKey}`)}
              </Text>
              <Text style={[s.sorenessCellLevel, col ? { color: col } : { color: theme.textMuted }]}>
                {sorenessLabel(level)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [s.saveBtn, mutation.isPending && s.saveBtnDisabled, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator size="small" color="#0f0f1a" />
        ) : (
          <>
            <Feather name="check" size={15} color="#0f0f1a" />
            <Text style={s.saveBtnText}>{t("components.recoveryCheckIn.saveCheckIn")}</Text>
          </>
        )}
      </Pressable>

      {mutation.isError && (
        <Text style={s.errorText}>{t("components.recoveryCheckIn.failedToSave")}</Text>
      )}
    </View>
  );
}

function styles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
    },
    promptCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
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
      fontFamily: "Inter_400Regular",
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
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
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
      fontFamily: "Inter_700Bold",
      fontSize: 15,
    },
    doneBadge: {
      backgroundColor: theme.primary + "22",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    doneBadgeText: {
      color: theme.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
    },
    editLink: {
      color: theme.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
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
      backgroundColor: theme.cardAlt,
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
      fontFamily: "Inter_500Medium",
      fontSize: 12,
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
      fontFamily: "Inter_500Medium",
      fontSize: 11,
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
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      flex: 1,
    },
    sectionLabel: {
      color: theme.textMuted,
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    tapHint: {
      color: theme.textMuted,
      fontFamily: "Inter_400Regular",
      fontSize: 11,
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
      backgroundColor: theme.cardAlt,
    },
    valueChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "22",
    },
    valueChipText: {
      color: theme.textMuted,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
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
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      marginBottom: 12,
      backgroundColor: theme.cardAlt,
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
      backgroundColor: theme.cardAlt,
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
      fontFamily: "Inter_500Medium",
      fontSize: 9,
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
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      marginBottom: 2,
    },
    sorenessCellLevel: {
      fontFamily: "Inter_500Medium",
      fontSize: 10,
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
      color: "#0f0f1a",
      fontFamily: "Inter_700Bold",
      fontSize: 15,
    },
    errorText: {
      color: "#ef5350",
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      textAlign: "center",
      marginTop: 6,
    },
  });
}
