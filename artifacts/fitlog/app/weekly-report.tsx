import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { rtlIcon } from "@/lib/rtl";

export default function WeeklyReportScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const isWeb = Platform.OS === "web";
  const WEB_TOP = 67;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={isWeb ? [] : ["top"]}>
      <View style={{ paddingTop: isWeb ? WEB_TOP : 0, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name={rtlIcon("chevron-left")} size={24} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, flex: 1 }}>
            {t("home.weeklyReport")}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: theme.secondaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Feather name="bar-chart-2" size={28} color={theme.secondary} />
          </View>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center", marginBottom: 8 }}>
            {t("home.comingSoon")}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            {t("home.weeklyReportDesc")}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
