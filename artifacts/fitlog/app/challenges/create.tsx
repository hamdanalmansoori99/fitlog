import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const CHALLENGE_TYPES = [
  { key: "streak", icon: "zap", label: "Streak" },
  { key: "volume", icon: "trending-up", label: "Volume" },
  { key: "consistency", icon: "target", label: "Consistency" },
] as const;

export default function CreateChallengeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("streak");
  const [targetValue, setTargetValue] = useState("7");
  const [durationDays, setDurationDays] = useState("14");

  const createMutation = useMutation({
    mutationFn: () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + parseInt(durationDays, 10));
      return api.createChallenge({
        title: title.trim(),
        type,
        targetValue: parseInt(targetValue, 10),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      router.replace(`/challenges/${data.challenge.id}` as any);
    },
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const valid = title.trim().length >= 2 && parseInt(targetValue) > 0 && parseInt(durationDays) > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>{t("challenges.create", { defaultValue: "Create Challenge" })}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <Text style={[styles.label, { color: theme.text }]}>{t("challenges.challengeName", { defaultValue: "Challenge Name" })}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          placeholder={t("challenges.namePlaceholder", { defaultValue: "e.g. 7-Day Streak Challenge" })}
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>{t("challenges.challengeType", { defaultValue: "Challenge Type" })}</Text>
        <View style={styles.typeRow}>
          {CHALLENGE_TYPES.map((ct) => (
            <Pressable
              key={ct.key}
              onPress={() => setType(ct.key)}
              style={[styles.typeBtn, { backgroundColor: type === ct.key ? theme.primaryDim : theme.card, borderColor: type === ct.key ? theme.primary : theme.border }]}
            >
              <Feather name={ct.icon as any} size={18} color={type === ct.key ? theme.primary : theme.textMuted} />
              <Text style={{ color: type === ct.key ? theme.primary : theme.text, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {t(`challenges.type.${ct.key}`, { defaultValue: ct.label })}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>{t("challenges.target", { defaultValue: "Target Value" })}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          placeholder="7"
          placeholderTextColor={theme.textMuted}
          value={targetValue}
          onChangeText={setTargetValue}
          keyboardType="number-pad"
          maxLength={5}
        />

        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>{t("challenges.duration", { defaultValue: "Duration (days)" })}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          placeholder="14"
          placeholderTextColor={theme.textMuted}
          value={durationDays}
          onChangeText={setDurationDays}
          keyboardType="number-pad"
          maxLength={3}
        />

        <Button
          title={t("challenges.createBtn", { defaultValue: "Create Challenge" })}
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!valid}
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: "Inter_500Medium" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
});
