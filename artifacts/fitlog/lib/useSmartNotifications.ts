import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";
import { sendWebNotification, hasNotificationPermission } from "@/lib/notifications";
import type { NotifType } from "@/store/notificationStore";

const LAST_FETCH_KEY = "smart-notif-last-fetch";
const CACHE_KEY = "smart-notif-cache";
const DISMISSED_KEY_PREFIX = "smart-notif-dismissed:";
const FETCH_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export interface SmartMessage {
  id: string;
  type: NotifType;
  title: string;
  body: string;
}

async function isDismissed(messageId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${DISMISSED_KEY_PREFIX}${messageId}`);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  return Date.now() - dismissedAt < DISMISS_TTL_MS;
}

async function setDismissed(messageId: string): Promise<void> {
  await AsyncStorage.setItem(
    `${DISMISSED_KEY_PREFIX}${messageId}`,
    String(Date.now())
  );
}

async function findActiveBanner(messages: SmartMessage[]): Promise<SmartMessage | null> {
  for (const msg of messages) {
    if (!(await isDismissed(msg.id))) {
      return msg;
    }
  }
  return null;
}

export function useSmartNotifications() {
  const [activeBanner, setActiveBanner] = useState<SmartMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const now = Date.now();
        const lastFetchRaw = await AsyncStorage.getItem(LAST_FETCH_KEY);
        const lastFetch = lastFetchRaw ? parseInt(lastFetchRaw, 10) : 0;
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
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    if (!activeBanner) return;
    await setDismissed(activeBanner.id);
    setActiveBanner(null);
  }, [activeBanner]);

  return { activeBanner, dismiss };
}
