import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/i18n";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallBanner } from "@/components/InstallBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useNotificationSetup } from "@/hooks/useNotificationSetup";
import { usePendingWorkoutSync } from "@/hooks/usePendingWorkoutSync";
import { usePendingMealSync } from "@/hooks/usePendingMealSync";
import { usePendingWaterSync } from "@/hooks/usePendingWaterSync";
import { usePendingMeasurementSync } from "@/hooks/usePendingMeasurementSync";
import { usePendingRecoverySync } from "@/hooks/usePendingRecoverySync";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { api } from "@/lib/api";
import { migrateStorageKeys } from "@/store/migrateStorageKeys";

SplashScreen.preventAutoHideAsync();
migrateStorageKeys(); // one-time fitlog→ordeal key migration

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min before considered stale
      gcTime: 10 * 60_000,        // 10 min in cache after unmount
      retry: 2,
      refetchOnWindowFocus: false, // prevents noisy refetches on tab switch
      refetchOnReconnect: true,
    },
  },
});

function RootLayoutNav() {
  const { token, _hydrated } = useAuthStore();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    enabled: !!token && !!_hydrated,
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: serverSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    enabled: !!token && !!_hydrated,
    staleTime: 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (serverSettings?.language) {
      const serverLang = serverSettings.language as "en" | "ar";
      if (i18n.language !== serverLang) {
        setLanguage(serverLang);
        i18n.changeLanguage(serverLang);
        const isRTL = serverLang === "ar";
        const rtlChanged = I18nManager.isRTL !== isRTL;
        if (rtlChanged) {
          I18nManager.forceRTL(isRTL);
          I18nManager.allowRTL(isRTL);
        }
        if (Platform.OS === "web") {
          document.documentElement.dir = isRTL ? "rtl" : "ltr";
          document.documentElement.lang = serverLang;
          if (rtlChanged) {
            window.location.reload();
          }
        } else if (rtlChanged) {
          try {
            Updates.reloadAsync();
          } catch {}
        }
      }
    }
  }, [serverSettings]);

  useNotificationSetup(!!token && !!_hydrated);
  usePendingWorkoutSync();
  usePendingMealSync();
  usePendingWaterSync();
  usePendingMeasurementSync();
  usePendingRecoverySync();

  useEffect(() => {
    if (!_hydrated) return;
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    if (profile && profile.onboardingComplete === false) {
      router.replace("/onboarding");
    }
  }, [token, _hydrated, profile]);

  return (
    <Stack screenOptions={{ headerBackTitle: t("common.back") }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="achievements" options={{ headerShown: false }} />
      <Stack.Screen name="streaks" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/log" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/execute" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/template" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/plan" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/my-templates" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/user-template" options={{ headerShown: false }} />
      <Stack.Screen name="meals/add" options={{ headerShown: false }} />
      <Stack.Screen name="meals/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="meals/weekly-plan" options={{ headerShown: false }} />
      <Stack.Screen name="equipment/add" options={{ headerShown: false }} />
      <Stack.Screen name="measurements/add" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="meals/index" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/exercise/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/exercises" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/edit" options={{ headerShown: false }} />
      <Stack.Screen name="settings/health" options={{ headerShown: false }} />
      <Stack.Screen name="settings/referral" options={{ headerShown: false }} />
      <Stack.Screen name="settings/export" options={{ headerShown: false }} />
      <Stack.Screen name="friends/index" options={{ headerShown: false }} />
      <Stack.Screen name="challenges/index" options={{ headerShown: false }} />
      <Stack.Screen name="challenges/create" options={{ headerShown: false }} />
      <Stack.Screen name="challenges/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="coach/chat" options={{ headerShown: false }} />
      <Stack.Screen name="recovery" options={{ headerShown: false }} />
      <Stack.Screen name="rank" options={{ headerShown: false }} />
      <Stack.Screen name="water/add" options={{ headerShown: false }} />
      <Stack.Screen name="measurements/edit" options={{ headerShown: false }} />
      <Stack.Screen name="progress/weekly-report" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const { i18n } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  useServiceWorker();

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    const isRTL = language === "ar";
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
    }
    if (Platform.OS === "web") {
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
      document.documentElement.lang = language || "en";
    }
  }, [language]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ToastProvider>
                <RootLayoutNav />
                <OfflineIndicator />
                <OfflineBanner />
                <InstallBanner />
              </ToastProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
