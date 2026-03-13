import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.register({ firstName, lastName, email: email.trim(), password });
      setAuth(res.token, res.user);
      router.replace("/onboarding");
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Start your fitness journey today
          </Text>
        </View>
        
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerDim, borderColor: theme.danger }]}>
            <Feather name="alert-circle" size={14} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
          </View>
        ) : null}
        
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                autoCapitalize="words"
              />
            </View>
          </View>
          
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Feather name="mail" size={18} color={theme.textMuted} />}
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            secureEntry
            leftIcon={<Feather name="lock" size={18} color={theme.textMuted} />}
          />
          
          <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.btn} />
          
          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Already have an account?{" "}
              <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 24 },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  header: { gap: 6 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  form: { gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  btn: { marginTop: 8 },
  loginLink: { alignItems: "center", padding: 4 },
  loginText: { fontSize: 14, textAlign: "center" },
});
