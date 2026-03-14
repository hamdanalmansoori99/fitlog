import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
  iconColor?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, subtitle, action, iconColor, compact }: EmptyStateProps) {
  const { theme } = useTheme();
  const color = iconColor || theme.primary;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.container, compact && styles.compact]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={compact ? 28 : 36} color={color} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: compact ? 15 : 17 }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: compact ? 13 : 14 }]}>
        {subtitle}
      </Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.btn, { backgroundColor: color + "18", borderColor: color + "40", opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 28, gap: 12 },
  compact: { paddingVertical: 28 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", lineHeight: 20, maxWidth: 300 },
  btn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 50, borderWidth: 1 },
});
