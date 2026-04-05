import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  ...pressableProps
}: ButtonProps) {
  const { theme } = useTheme();

  const bgColor = {
    primary: theme.primary,
    secondary: theme.secondary,
    outline: "transparent",
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: theme.background,
    secondary: theme.background,
    outline: theme.primary,
    ghost: theme.text,
  }[variant];

  const borderColor = variant === "outline" ? theme.primary : "transparent";

  const sizeStyles: Record<string, { px: number; py: number; fontSize: number }> = {
    sm: { px: 12, py: 6, fontSize: 13 },
    md: { px: 18, py: 10, fontSize: 15 },
    lg: { px: 24, py: 14, fontSize: 17 },
  };

  const s = sizeStyles[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        variant === "outline" && styles.outline,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: textColor, fontSize: s.fontSize },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  outline: {
    borderWidth: 1,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
