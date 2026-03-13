import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface ActivityItemProps {
  type: "workout" | "meal";
  name: string;
  date: string;
  keyStat?: string | null;
  activityType?: string | null;
}

function getActivityIcon(type: string, activityType?: string | null): keyof typeof Feather.glyphMap {
  if (type === "meal") return "coffee";
  switch (activityType) {
    case "cycling": return "wind";
    case "running": return "activity";
    case "walking": return "navigation";
    case "swimming": return "droplet";
    case "gym": return "zap";
    case "yoga": return "heart";
    case "tennis": return "circle";
    default: return "activity";
  }
}

function getActivityColor(type: string, activityType?: string | null, theme: any = {}) {
  if (type === "meal") return theme.orange;
  switch (activityType) {
    case "cycling": return theme.secondary;
    case "running": return theme.primary;
    case "walking": return theme.cyan;
    case "swimming": return theme.secondary;
    case "gym": return theme.purple;
    case "yoga": return theme.pink;
    default: return theme.primary;
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function ActivityItem({ type, name, date, keyStat, activityType }: ActivityItemProps) {
  const { theme } = useTheme();
  const icon = getActivityIcon(type, activityType);
  const color = getActivityColor(type, activityType, theme);
  
  return (
    <View style={[styles.item, { borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>{name}</Text>
        {keyStat && (
          <Text style={[styles.stat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{keyStat}</Text>
        )}
      </View>
      <Text style={[styles.time, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{timeAgo(date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 14 },
  stat: { fontSize: 12, marginTop: 1 },
  time: { fontSize: 12 },
});
