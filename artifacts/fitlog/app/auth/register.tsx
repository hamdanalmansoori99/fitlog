import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, TextInput,
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

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (!email.includes("@") || email.indexOf(".") < email.indexOf("@")) {
      setError(t("auth.validEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMin6"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.register({ firstName, lastName, email: email.trim(), password });
      setAuth(res.token, res.user);
      router.replace("/onboarding");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("already registered")) {
        setError(t("auth.emailAlreadyRegistered"));
      } else if (msg.includes("valid email")) {
        setError(t("auth.validEmail"));
      } else if (msg.includes("Password must")) {
        setError(t("auth.passwordMin6"));
      } else if (msg.includes("All fields")) {
        setError(t("auth.fillAllFields"));
      } else if (msg.includes("Network") || msg.includes("fetch") || msg.includes("Failed")) {
        setError(t("common.networkError"));
      } else {
        setError(t("auth.registerFailed"));
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("auth.createAccount")}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("auth.startJourney")}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerDim, borderColor: theme.danger + "60" }]}>
              <Feather name="alert-circle" size={14} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t("auth.firstName")}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("auth.firstNamePlaceholder")}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  ref={lastNameRef}
                  label={t("auth.lastName")}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("auth.lastNamePlaceholder")}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <Input
              ref={emailRef}
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
              placeholder={t("auth.passwordMinChars")}
              secureEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              leftIcon={<Feather name="lock" size={18} color={theme.textMuted} />}
            />

            <Button title={t("auth.createAccount")} onPress={handleRegister} loading={loading} style={styles.btn} />

            <Pressable onPress={() => router.back()} style={styles.loginLink}>
              <Text style={[styles.loginText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("auth.hasAccount")}{" "}
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold" }}>{t("auth.signIn")}</Text>
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
  backBtn: { width: 44, height: 44, justifyContent: "center", marginBottom: 8 },
  header: { gap: 6, marginBottom: 4 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  errorText: { fontSize: 13, flex: 1 },
  form: { gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  btn: { marginTop: 8 },
  loginLink: { alignItems: "center", padding: 4 },
  loginText: { fontSize: 14, textAlign: "center" },
});
