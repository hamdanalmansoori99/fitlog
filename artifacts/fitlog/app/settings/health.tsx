import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import {
  isHealthIntegrationAvailable,
  requestHealthPermissions,
  fetchStepCounts,
  getHealthPlatform,
  type HealthPermissions,
} from "@/lib/healthIntegration";

export default function HealthSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState(false);
  const [permissions, setPermissions] = useState<HealthPermissions | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);

  const platform = getHealthPlatform();
  const platformName =
    platform === "apple_health"
      ? "Apple Health"
      : platform === "health_connect"
      ? "Google Health Connect"
      : "Health";

  useEffect(() => {
    setAvailable(isHealthIntegrationAvailable());
  }, []);

  async function handleConnect() {
    setConnecting(true);
    const perms = await requestHealthPermissions();
    setPermissions(perms);
    if (perms.stepCount) {
      const steps = await fetchStepCounts(1);
      if (steps.length > 0) setTodaySteps(steps[0].steps);
    }
    setConnecting(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={{ padding: 16, paddingTop: insets.top + 16 }}>
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 8 }}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: theme.text }}>
            Health & Wearables
          </Text>
        </Pressable>

        {/* Platform card */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}
          >
            <Feather
              name={platform === "apple_health" ? "heart" : "activity"}
              size={24}
              color={theme.primary}
            />
            <View>
              <Text
                style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: theme.text }}
              >
                {platformName}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                {available
                  ? "Available on this device"
                  : "Requires a dev build — not available in Expo Go"}
              </Text>
            </View>
          </View>

          {!available && (
            <View
              style={{
                backgroundColor: theme.primaryDim,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="alert-triangle" size={14} color={theme.primary} />
                <Text style={{ fontSize: 13, color: theme.primary, flex: 1 }}>
                  Health integration requires a native dev build. It will activate
                  automatically once the app is built for the App Store / Play Store.
                </Text>
              </View>
            </View>
          )}

          {available && !permissions && (
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 8,
                padding: 12,
                alignItems: "center",
              }}
            >
              {connecting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" }}
                >
                  Connect {platformName}
                </Text>
              )}
            </Pressable>
          )}

          {permissions && (
            <View style={{ gap: 8 }}>
              {[
                { key: "stepCount", label: "Steps", icon: "trending-up" },
                { key: "heartRate", label: "Heart Rate", icon: "heart" },
                { key: "sleep", label: "Sleep", icon: "moon" },
                { key: "workouts", label: "Workouts", icon: "activity" },
              ].map((item) => (
                <View
                  key={item.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={
                      permissions[item.key as keyof HealthPermissions]
                        ? theme.primary
                        : theme.textMuted
                    }
                  />
                  <Text style={{ flex: 1, fontSize: 14, color: theme.text }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: permissions[item.key as keyof HealthPermissions]
                        ? theme.primary
                        : theme.danger,
                    }}
                  >
                    {permissions[item.key as keyof HealthPermissions]
                      ? "Connected"
                      : "Denied"}
                  </Text>
                </View>
              ))}
              {todaySteps !== null && (
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>
                  Today: {todaySteps.toLocaleString()} steps synced ✓
                </Text>
              )}
            </View>
          )}
        </View>

        {/* What gets synced */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.textMuted,
            marginBottom: 12,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          What syncs
        </Text>
        {[
          { icon: "trending-up", title: "Steps", desc: "Daily step count shown on home screen" },
          {
            icon: "heart",
            title: "Heart Rate",
            desc: "Resting HR used by AI coach for recovery advice",
          },
          {
            icon: "moon",
            title: "Sleep",
            desc: "Sleep hours fed to AI coach for strain scoring",
          },
          {
            icon: "activity",
            title: "Workouts",
            desc: "Workouts logged here sync to your health app",
          },
        ].map((item) => (
          <View
            key={item.title}
            style={{ flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "flex-start" }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: theme.primaryDim,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={item.icon as any} size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                  marginBottom: 2,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>{item.desc}</Text>
            </View>
          </View>
        ))}

        {/* Connected Devices */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: theme.textMuted,
            marginBottom: 12,
            marginTop: 8,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Connected Devices
        </Text>
        {[
          { name: "Whoop", icon: "zap", color: "#e53935", status: "Coming soon" },
          { name: "Garmin", icon: "map", color: "#00897b", status: "Coming soon" },
        ].map((device) => (
          <View
            key={device.name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: theme.card,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: device.color + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={device.icon as any} size={20} color={device.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: theme.text,
                }}
              >
                {device.name}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                {device.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
