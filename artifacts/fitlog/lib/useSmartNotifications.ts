import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";
import { sendWebNotification, hasNotificationPermission } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";
import type { NotifType } from "@/store/notificationStore";

const FETCH_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function lastFetchKey(userId: number) {
  return `smart-notif:${userId}:last-fetch`;
}
function cacheKey(userId: number) {
  return `smart-notif:${userId}:cache`;
}
function dismissKey(userId: number, messageId: string) {
  return `smart-notif:${userId}:dismissed:${messageId}`;
}

export interface SmartMessage {
  id: string;
  type: NotifType;
  title: string;
  body: string;
}

async function isDismissed(userId: number, messageId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(dismissKey(userId, messageId));
  if (!raw) return false;
  return Date.now() - parseInt(raw, 10) < DISMISS_TTL_MS;
}

async function findActiveBanner(
  userId: number,
  messages: SmartMessage[]
): Promise<SmartMessage | null> {
  for (const msg of messages) {
    if (!(await isDismissed(userId, msg.id))) {
      return msg;
    }
  }
  return null;
}

export function useSmartNotifications() {
  const { user } = useAuthStore();
  const userId = user?.id as number | undefined;
  const [activeBanner, setActiveBanner] = useState<SmartMessage | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        const now = Date.now();
        const lastFetchRaw = await AsyncStorage.getItem(lastFetchKey(userId!));
        const lastFetch = lastFetchRaw ? parseInt(lastFetchRaw, 10) : 0;
        const needsFetch = now - lastFetch > FETCH_INTERVAL_MS;

        let messages: SmartMessage[] = [];

        if (needsFetch) {
          try {
            const data = await api.getSmartNotifications();
            messages = (data.messages || []) as SmartMessage[];
            await AsyncStorage.setItem(lastFetchKey(userId!), String(now));
            await AsyncStorage.setItem(cacheKey(userId!), JSON.stringify(messages));
          } catch {
            const cached = await AsyncStorage.getItem(cacheKey(userId!));
            if (cached) {
              messages = JSON.parse(cached) as SmartMessage[];
            }
          }
        } else {
          const cached = await AsyncStorage.getItem(cacheKey(userId!));
          if (cached) {
            messages = JSON.parse(cached) as SmartMessage[];
          }
        }

        if (cancelled) return;

        const banner = await findActiveBanner(userId!, messages);
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
  }, [userId]);

  const dismiss = useCallback(async () => {
    if (!activeBanner || !userId) return;
    await AsyncStorage.setItem(dismissKey(userId, activeBanner.id), String(Date.now()));
    setActiveBanner(null);
  }, [activeBanner, userId]);

  return { activeBanner, dismiss };
}
