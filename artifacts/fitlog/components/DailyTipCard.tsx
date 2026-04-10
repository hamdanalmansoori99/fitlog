import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { getTodaysTip, CATEGORY_COLORS, CATEGORY_ICONS, TipCategory } from "@/lib/dailyTips";

export function DailyTipCard() {
  const { theme } = useTheme();
  const tip = getTodaysTip();
  const color = CATEGORY_COLORS[tip.category];
  const icon = CATEGORY_ICONS[tip.category] as keyof typeof Feather.glyphMap;
  const label = tip.category.charAt(0).toUpperCase() + tip.category.slice(1);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: color + "40" }]}>
      {/* Color strip */}
      <View style={[styles.strip, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
            <Feather name={icon} size={13} color={color} />
          </View>
          <Text style={[styles.label, { color, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
          <View style={[styles.proBadge, { backgroundColor: theme.purple }]}>
            <Text style={[styles.proText, { fontFamily: "Inter_700Bold" }]}>PRO</Text>
          </View>
        </View>
        <Text style={[styles.tip, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
          {tip.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  strip: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    flex: 1,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proText: {
    color: "#fff",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  tip: {
    fontSize: 13,
    lineHeight: 19,
  },
});
