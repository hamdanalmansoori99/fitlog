import React from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { rtlIcon } from "@/lib/rtl";
import { api } from "@/lib/api";
import { RecoveryCheckIn } from "@/components/RecoveryCheckIn";
import { SkeletonBox } from "@/components/SkeletonBox";

const isWeb = Platform.OS === "web";
const WEB_TOP = 67;

export default function RecoveryScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const { data: recoveryData, isLoading } = useQuery({
    queryKey: ["recoveryToday"],
    queryFn: api.getRecoveryToday,
    staleTime: 60000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={isWeb ? [] : ["top"]}>
      <View style={{ paddingTop: isWeb ? WEB_TOP : 0, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name={rtlIcon("chevron-left")} size={24} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, flex: 1 }}>
            {t("profile.recoveryWellness")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <>
              <SkeletonBox height={200} borderRadius={16} />
              <SkeletonBox height={100} borderRadius={16} />
            </>
          ) : (
            <RecoveryCheckIn todayLog={recoveryData?.log ?? null} theme={theme} />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
