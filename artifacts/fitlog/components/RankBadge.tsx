import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { getRankByXp } from "@/lib/ranks";
import { RANK_ICON_MAP } from "@/components/RankIcons";

interface RankBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const SIZE_CONFIG = {
  sm: { icon: 24, font: 12, border: 2 },
  md: { icon: 36, font: 14, border: 2 },
  lg: { icon: 56, font: 18, border: 2 },
};

export function RankBadge({ xp, size = "md", showName = false }: RankBadgeProps) {
  const { t } = useTranslation();
  const rank = getRankByXp(xp);
  const cfg = SIZE_CONFIG[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            width: cfg.icon,
            height: cfg.icon,
            borderRadius: 100,
            backgroundColor: rank.bgColor,
            borderColor: rank.borderColor,
            borderWidth: cfg.border,
          },
        ]}
      >
        {(() => {
          const IconComponent = RANK_ICON_MAP[rank.tier];
          return IconComponent ? (
            <IconComponent color={rank.borderColor} size={Math.round(cfg.icon * 0.62)} />
          ) : null;
        })()}
      </View>
      {showName && (
        <Text
          style={[
            styles.rankName,
            {
              color: rank.textColor,
              fontSize: cfg.font,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {t(rank.nameKey)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankName: {
    letterSpacing: 0.3,
  },
});
