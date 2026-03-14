import React, { useState, forwardRef } from "react";
import { TextInput, View, Text, StyleSheet, TextInputProps, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureEntry?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leftIcon, rightIcon, secureEntry, onFocus, onBlur, ...props },
  ref,
) {
  const { theme } = useTheme();
  const [secure, setSecure] = useState(secureEntry ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: error ? theme.danger : focused ? theme.primary : theme.border,
          },
        ]}
      >
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: theme.text, fontFamily: "Inter_400Regular" },
            leftIcon ? { paddingLeft: 0 } : {},
          ]}
          placeholderTextColor={theme.textMuted}
        />
        {secureEntry && (
          <Pressable onPress={() => setSecure(!secure)} style={styles.icon} hitSlop={8}>
            <Feather name={secure ? "eye" : "eye-off"} size={18} color={theme.textMuted} />
          </Pressable>
        )}
        {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={[styles.error, { color: theme.danger, fontFamily: "Inter_400Regular" }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, marginBottom: 2 },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  icon: { marginRight: 8, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  error: { fontSize: 12, marginTop: 2 },
});
