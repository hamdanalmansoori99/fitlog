import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { rtlIcon } from "@/lib/rtl";

const QUICK_AMOUNTS = [
  { label: "250 ml", value: 250 },
  { label: "500 ml", value: 500 },
  { label: "750 ml", value: 750 },
  { label: "1 L", value: 1000 },
];

export default function WaterAddScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amount = selected ?? (custom ? parseInt(custom, 10) : null);

  const mutation = useMutation({
    mutationFn: (ml: number) => api.logWater(ml),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterToday"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      router.back();
    },
    onError: (err: any) => {
      setError(err?.message || t("water.logError"));
    },
  });

  function handleLog() {
    setError(null);
    if (!amount || isNaN(amount) || amount <= 0) {
      setError(t("water.invalidAmount"));
      return;
    }
    mutation.mutate(amount);
  }

  function handleQuickSelect(value: number) {
    setSelected(value);
    setCustom("");
    setError(null);
  }

  function handleCustomChange(text: string) {
    setCustom(text.replace(/[^0-9]/g, ""));
    setSelected(null);
    setError(null);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name={rtlIcon("chevron-left")} size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{t("water.addTitle")}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          {/* Icon + label */}
          <View style={styles.iconRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.cyan + "20" }]}>
              <Feather name="droplet" size={32} color={theme.cyan} />
            </View>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {t("water.prompt")}
            </Text>
          </View>

          {/* Quick amounts */}
          <View style={styles.grid}>
            {QUICK_AMOUNTS.map((item) => {
              const active = selected === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleQuickSelect(item.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.cyan : theme.card,
                      borderColor: active ? theme.cyan : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? theme.background : theme.text,
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom input */}
          <View style={styles.customRow}>
            <Text style={[styles.customLabel, { color: theme.textMuted }]}>{t("water.customMl")}</Text>
            <TextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: theme.card,
                  borderColor: custom ? theme.cyan : theme.border,
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={custom}
              onChangeText={handleCustomChange}
              placeholder={t("water.placeholder")}
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={5}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerDim, borderColor: theme.danger }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Log button */}
          <Pressable
            onPress={handleLog}
            disabled={mutation.isPending}
            style={[
              styles.logBtn,
              {
                backgroundColor: amount && !isNaN(amount) && amount > 0 ? theme.cyan : theme.border,
                opacity: mutation.isPending ? 0.7 : 1,
              },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.logBtnText, { color: amount ? theme.background : theme.textMuted }]}>
                {t("water.logAmount", { amount: amount && !isNaN(amount) && amount > 0 ? `${amount} ml` : t("water.water") })}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  iconRow: {
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flex: 1,
    minWidth: "44%",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  chipText: {
    fontSize: 15,
  },
  customRow: {
    gap: 8,
  },
  customLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  customInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  logBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  logBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
