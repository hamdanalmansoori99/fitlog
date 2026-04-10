import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";

let isLiquidGlassAvailable: () => boolean = () => false;
try {
  const glassEffect = require("expo-glass-effect");
  if (typeof glassEffect?.isLiquidGlassAvailable === "function") {
    isLiquidGlassAvailable = glassEffect.isLiquidGlassAvailable;
  }
} catch {}

let NativeTabs: any = null;
let Icon: any = null;
let Label: any = null;
try {
  const nativeTabs = require("expo-router/unstable-native-tabs");
  NativeTabs = nativeTabs.NativeTabs;
  Icon = nativeTabs.Icon;
  Label = nativeTabs.Label;
} catch {}
import { SymbolView } from "expo-symbols";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { I18nManager, Platform, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { ActiveWorkoutPill } from "@/components/ActiveWorkoutPill";
import { useWorkoutStore } from "@/store/workoutStore";

function NativeTabLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t("tabs.home")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="workouts">
        <Icon sf={{ default: "figure.run", selected: "figure.run" }} />
        <Label>{t("tabs.workouts")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <Icon sf={{ default: "brain", selected: "brain.fill" }} />
        <Label>{t("tabs.coach")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan">
        <View
          style={[
            layoutStyles.nativeScanHero,
            {
              backgroundColor: theme.primary,
              elevation: 4,
              shadowColor: "#00e676",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            },
          ]}
        >
          <Icon sf={{ default: "fork.knife.circle.fill", selected: "fork.knife.circle.fill" }} selectedColor="#000" />
        </View>
        <Label>{t("tabs.scanMeal")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t("tabs.profile")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
          ...(I18nManager.isRTL ? { flexDirection: "row-reverse" as const } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.tabBar }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: t("tabs.workouts"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="figure.run" tintColor={color} size={22} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t("tabs.coach"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="brain" tintColor={color} size={22} />
            ) : (
              <Feather name="cpu" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t("tabs.scanMeal"),
          tabBarIcon: ({ focused }) => (
            <View style={[layoutStyles.scanHero, { backgroundColor: theme.primary }]}>
              {isIOS ? (
                <SymbolView name="fork.knife.circle.fill" tintColor="#000" size={22} />
              ) : (
                <MaterialCommunityIcons name="camera" size={22} color="#000" />
              )}
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

const layoutStyles = StyleSheet.create({
  scanHero: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    elevation: 4,
    shadowColor: "#00e676",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nativeScanHero: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  const activeId = useWorkoutStore((s) => s.activeWorkoutTemplateId);

  return (
    <View style={{ flex: 1 }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      {activeId ? <ActiveWorkoutPill /> : null}
    </View>
  );
}
