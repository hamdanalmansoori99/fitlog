import { useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/store/settingsStore";
import { api } from "@/lib/api";

export function useLanguage() {
  const { i18n } = useTranslation();
  const { language, setLanguage: setStoreLanguage } = useSettingsStore();

  const changeLanguage = useCallback(
    async (lng: "en" | "ar") => {
      setStoreLanguage(lng);
      await i18n.changeLanguage(lng);

      const isRTL = lng === "ar";
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        I18nManager.allowRTL(isRTL);
      }

      try {
        await api.updateSettings({ language: lng });
      } catch {}

      if (Platform.OS === "web") {
        document.documentElement.dir = isRTL ? "rtl" : "ltr";
        document.documentElement.lang = lng;
      }
    },
    [i18n, setStoreLanguage],
  );

  return { language, changeLanguage, isRTL: language === "ar" };
}
