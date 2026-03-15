import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface PremiumBadgeProps {
  label?: string;
  small?: boolean;
  color?: string;
}

export function PremiumBadge({ label, small = false, color = "#448aff" }: PremiumBadgeProps) {
  const { t } = useTranslation();
  const displayLabel = label ?? t("components.premiumBadge.premium");

  if (small) {
    return (
      <View style={[styles.badgeSmall, { backgroundColor: color + "22", borderColor: color + "44" }]}>
        <Feather name="zap" size={9} color={color} />
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: color + "18", borderColor: color + "35" }]}>
      <Feather name="zap" size={10} color={color} />
      <Text style={[styles.badgeText, { color }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  badgeSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
