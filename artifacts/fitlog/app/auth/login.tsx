import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView,
  Platform, TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const MAX_W = 480;

export default function LoginScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.validEmail"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ email: email.trim(), password });
      setAuth(res.token, res.user);
      try {
        const profile = await api.getProfile();
        if (!profile.onboardingComplete) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.warn("Profile fetch after login failed:", err);
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Invalid credentials")) {
        setError(t("auth.invalidCredentials"));
      } else if (msg.includes("Email and password required")) {
        setError(t("auth.fillAllFields"));
      } else if (msg.includes("Network") || msg.includes("fetch")) {
        setError(t("common.networkError"));
      } else {
        setError(t("auth.loginFailed"));
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
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inner, Platform.OS === "web" ? { maxWidth: MAX_W, alignSelf: "center", width: "100%" } : {}]}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "60" }]}>
              <Feather name="activity" size={38} color={theme.primary} />
            </View>
            <Text style={[styles.appName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("auth.fitlog")}</Text>
            <Text style={[styles.tagline, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("auth.tagline")}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("auth.welcomeBack")}</Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerDim, borderColor: theme.danger + "60" }]}>
                <Feather name="alert-circle" size={14} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              keyboardType={Platform.OS === "web" ? "default" : "email-address"}
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              leftIcon={<Feather name="mail" size={18} color={theme.textMuted} />}
            />

            <Input
              ref={passwordRef}
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              secureEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              leftIcon={<Feather name="lock" size={18} color={theme.textMuted} />}
            />

            <Button title={t("auth.signIn")} onPress={handleLogin} loading={loading} style={styles.btn} />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <Text style={[styles.or, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("common.or")}</Text>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            <Pressable onPress={() => router.push("/auth/register")} style={styles.registerLink}>
              <Text style={[styles.registerText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("auth.noAccount")}{" "}
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold" }}>{t("auth.signUp")}</Text>
              </Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                setError("");
                setLoading(true);
                try {
                  const res = await api.demoLogin();
                  setAuth(res.token, res.user);
                  router.replace("/(tabs)");
                } catch (err: any) {
                  setError(err.message || t("auth.demoLoginFailed"));
                } finally {
                  setLoading(false);
                }
              }}
              style={styles.demoLink}
            >
              <Feather name="zap" size={13} color={theme.primary} />
              <Text style={[styles.demoText, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                {t("auth.tryDemo")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  inner: {},
  logoSection: { alignItems: "center", marginBottom: 44, gap: 12 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 26,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  appName: { fontSize: 32 },
  tagline: { fontSize: 15, textAlign: "center" },
  form: { gap: 16 },
  title: { fontSize: 26, marginBottom: 4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  btn: { marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1 },
  or: { fontSize: 13 },
  registerLink: { alignItems: "center", padding: 4 },
  registerText: { fontSize: 14, textAlign: "center" },
  demoLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, padding: 4, marginTop: 4 },
  demoText: { fontSize: 13 },
});
