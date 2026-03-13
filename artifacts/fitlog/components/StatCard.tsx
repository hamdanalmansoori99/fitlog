import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { SkeletonBox } from "./SkeletonBox";

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  value: string | number;
  label: string;
  color?: string;
  loading?: boolean;
}

export function StatCard({ icon, value, label, color, loading }: StatCardProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SkeletonBox width={40} height={40} borderRadius={12} />
        <SkeletonBox width={60} height={22} borderRadius={6} />
        <SkeletonBox width={48} height={12} borderRadius={4} />
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120, borderRadius: 16, padding: 14, gap: 6,
    borderWidth: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  value: { fontSize: 22 },
  label: { fontSize: 11, lineHeight: 14 },
});
