import React, { useEffect, createContext, useContext, useState, useCallback } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICON: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
};

const BG: Record<ToastType, string> = {
  success: "#00e676",
  error: "#ff5252",
  info: "#448aff",
};

const TEXT_COLOR: Record<ToastType, string> = {
  success: "#0f0f1a",
  error: "#ffffff",
  info: "#ffffff",
};

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: (id: string) => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast.id]);

  const bottomOffset = Platform.OS === "web" ? 100 : insets.bottom + 72;

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify()}
      exiting={FadeOutDown.duration(200)}
      style={[styles.toast, { backgroundColor: BG[toast.type], bottom: bottomOffset }]}
    >
      <Feather name={ICON[toast.type]} size={16} color={TEXT_COLOR[toast.type]} />
      <Text style={[styles.toastText, { color: TEXT_COLOR[toast.type], fontFamily: "Inter_500Medium" }]}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = String(Date.now() + Math.random());
    setToasts(prev => [...prev.slice(-1), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDone={removeToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 9999,
    pointerEvents: "none",
  } as any,
  toast: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 50,
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  toastText: { fontSize: 14 },
});
