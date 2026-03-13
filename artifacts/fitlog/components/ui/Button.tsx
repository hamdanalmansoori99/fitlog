import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };
  
  const bgColors = {
    primary: theme.primary,
    secondary: theme.secondary,
    danger: theme.danger,
    ghost: "transparent",
    outline: "transparent",
  };
  
  const textColors = {
    primary: "#0f0f1a",
    secondary: "#ffffff",
    danger: "#ffffff",
    ghost: theme.primary,
    outline: theme.primary,
  };
  
  const paddingV = { sm: 8, md: 14, lg: 18 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];
  
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bgColors[variant],
          paddingVertical: paddingV,
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? theme.primary : "transparent",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColors[variant], fontSize, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
  },
  text: {
    textAlign: "center",
  },
});
