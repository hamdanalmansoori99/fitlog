import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";
import {
  dismissReminder,
  isReminderDismissed,
  sendWebNotification,
  hasNotificationPermission,
} from "@/lib/notifications";
import type { NotifType } from "@/store/notificationStore";

const LAST_FETCH_KEY = "smart-notif-last-fetch";
const CACHE_KEY = "smart-notif-cache";
const FETCH_INTERVAL_MS = 4 * 60 * 60 * 1000;

export interface SmartMessage {
  type: NotifType;
  title: string;
  body: string;
}

export function useSmartNotifications() {
  const [activeBanner, setActiveBanner] = useState<SmartMessage | null>(null);

  const findActiveBanner = useCallback(async (messages: SmartMessage[]) => {
    for (const msg of messages) {
      const dismissed = await isReminderDismissed(msg.type);
      if (!dismissed) {
        return msg;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const now = Date.now();
        const lastFetchRaw = await AsyncStorage.getItem(LAST_FETCH_KEY);
        const lastFetch = lastFetchRaw ? parseInt(lastFetchRaw) : 0;
        const needsFetch = now - lastFetch > FETCH_INTERVAL_MS;

        let messages: SmartMessage[] = [];

        if (needsFetch) {
          const data = await api.getSmartNotifications();
          messages = (data.messages || []) as SmartMessage[];
          await AsyncStorage.setItem(LAST_FETCH_KEY, String(now));
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(messages));
        } else {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            messages = JSON.parse(cached) as SmartMessage[];
          }
        }

        if (cancelled) return;

        const banner = await findActiveBanner(messages);
        if (cancelled) return;

        setActiveBanner(banner);

        if (banner) {
          const hasPermission = await hasNotificationPermission();
          if (hasPermission) {
            sendWebNotification(banner.type, banner.body, banner.title);
          }
        }
      } catch {
      }
    }

    load();
    return () => { cancelled = true; };
  }, [findActiveBanner]);

  const dismiss = useCallback(async () => {
    if (!activeBanner) return;
    await dismissReminder(activeBanner.type);
    setActiveBanner(null);
  }, [activeBanner]);

  return { activeBanner, dismiss };
}
