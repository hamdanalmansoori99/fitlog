import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { rtlIcon } from "@/lib/rtl";

const MAX_W = 480;

function PwRule({ ok, label, theme }: { ok: boolean; label: string; theme: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Feather name={ok ? "check-circle" : "circle"} size={14} color={ok ? theme.success : theme.textMuted} />
      <Text style={{ fontSize: 12, color: ok ? theme.success : theme.textMuted, fontFamily: "Inter_400Regular" }}>
        {label}
      </Text>
    </View>
  );
}

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!token) {
      setError(t("auth.invalidResetToken"));
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("auth.passwordRequirements"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("expired")) {
        setError(t("auth.resetTokenExpired"));
      } else if (msg.includes("Invalid")) {
        setError(t("auth.invalidResetToken"));
      } else {
        setError(t("common.networkError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inner, Platform.OS === "web" ? { maxWidth: MAX_W, alignSelf: "center", width: "100%" } : {}]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t("common.back")}>
            <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("auth.resetPasswordTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("auth.resetPasswordSubtitle")}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerDim, borderColor: theme.danger + "60" }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.successBox, { backgroundColor: (theme as any).successDim ?? "#dcfce7", borderColor: (theme.success ?? "#22c55e") + "60" }]}>
              <Feather name="check-circle" size={18} color={theme.success ?? "#22c55e"} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[styles.successText, { color: theme.success ?? "#22c55e", fontFamily: "Inter_400Regular" }]}>
                  {t("auth.passwordResetSuccess")}
                </Text>
                <Button
                  title={t("auth.signIn")}
                  onPress={() => router.replace("/auth/login")}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label={t("auth.newPassword")}
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.passwordMinChars")}
                secureEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                leftIcon={<Feather name="lock" size={18} color={theme.textMuted} />}
              />

              {password.length > 0 && (
                <View style={styles.pwRules}>
                  <PwRule ok={password.length >= 8} label={t("auth.pwRule8Chars")} theme={theme} />
                  <PwRule ok={/[A-Z]/.test(password)} label={t("auth.pwRuleUppercase")} theme={theme} />
                  <PwRule ok={/[0-9]/.test(password)} label={t("auth.pwRuleNumber")} theme={theme} />
                </View>
              )}

              <Button title={t("auth.resetPassword")} onPress={handleSubmit} loading={loading} style={styles.btn} />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  inner: {},
  backBtn: { width: 44, height: 44, justifyContent: "center", marginBottom: 8 },
  header: { gap: 6, marginBottom: 16 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  errorText: { fontSize: 13, flex: 1 },
  successBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  successText: { fontSize: 14 },
  form: { gap: 14 },
  btn: { marginTop: 8 },
  pwRules: { gap: 4, paddingHorizontal: 4 },
});
