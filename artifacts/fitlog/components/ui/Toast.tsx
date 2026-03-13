import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, type = "success", visible, onHide }: ToastProps) {
  const { theme } = useTheme();
  const opacity = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);
  
  if (!visible) return null;
  
  const colors = {
    success: theme.success,
    error: theme.danger,
    info: theme.secondary,
  };
  
  const icons = {
    success: "check-circle" as const,
    error: "x-circle" as const,
    info: "info" as const,
  };
  
  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: theme.card, borderColor: colors[type], opacity },
    ]}>
      <Feather name={icons[type]} size={18} color={colors[type]} />
      <Text style={[styles.text, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  text: { flex: 1, fontSize: 14 },
});
