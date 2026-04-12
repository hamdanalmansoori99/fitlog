import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { rtlIcon } from "@/lib/rtl";

const MAX_W = 480;

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.validEmail"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      if (err.message?.includes("Too many")) {
        setError(t("auth.tooManyResetAttempts"));
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
              {t("auth.forgotPasswordTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("auth.forgotPasswordSubtitle")}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerDim, borderColor: theme.danger + "60" }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          ) : null}

          {sent ? (
            <View style={[styles.successBox, { backgroundColor: (theme as any).successDim ?? "#dcfce7", borderColor: (theme.success ?? "#22c55e") + "60" }]}>
              <Feather name="check-circle" size={18} color={theme.success ?? "#22c55e"} />
              <Text style={[styles.successText, { color: theme.success ?? "#22c55e", fontFamily: "Inter_400Regular" }]}>
                {t("auth.resetEmailSent")}
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.emailPlaceholder")}
                keyboardType={Platform.OS === "web" ? "default" : "email-address"}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                leftIcon={<Feather name="mail" size={18} color={theme.textMuted} />}
              />
              <Button title={t("auth.sendResetLink")} onPress={handleSubmit} loading={loading} style={styles.btn} />
            </View>
          )}

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("auth.backToLogin")}
            </Text>
          </Pressable>
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
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  successText: { fontSize: 14, flex: 1 },
  form: { gap: 14 },
  btn: { marginTop: 8 },
  loginLink: { alignItems: "center", padding: 12, marginTop: 12 },
  loginText: { fontSize: 14, textAlign: "center" },
});
