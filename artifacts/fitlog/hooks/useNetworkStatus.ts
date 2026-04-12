import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { onlineManager } from "@tanstack/react-query";

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      const onOnline = () => { setIsConnected(true); onlineManager.setOnline(true); };
      const onOffline = () => { setIsConnected(false); onlineManager.setOnline(false); };
      setIsConnected(navigator.onLine);
      onlineManager.setOnline(navigator.onLine);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    // Native: use NetInfo
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const NetInfo = (await import("@react-native-community/netinfo")).default;
        unsubscribe = NetInfo.addEventListener((state) => {
          const connected = state.isConnected ?? true;
          setIsConnected(connected);
          onlineManager.setOnline(connected);
        });
      } catch {
        // NetInfo not available (e.g. Expo Go without native module)
      }
    })();

    return () => { unsubscribe?.(); };
  }, []);

  return isConnected;
}
