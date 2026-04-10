import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType, BarcodeScanningResult } from "expo-camera";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { api, ScanMealItem, MacroTotals, ScanStatus } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";

type ScreenState = "camera" | "scanning" | "results";
type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
type ScanMode = "photo" | "barcode";

const CATEGORIES: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.macroPill, { backgroundColor: color + "18" }]}>
      <Text style={[styles.macroPillValue, { color, fontFamily: "Inter_700Bold" }]}>
        {Math.round(value)}
      </Text>
      <Text style={[styles.macroPillUnit, { color, fontFamily: "Inter_500Medium" }]}>
        {unit}
      </Text>
      <Text style={[styles.macroPillLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
    </View>
  );
}

function ScanningOverlay({
  capturedUri,
  timedOut,
  onRetry,
}: {
  capturedUri: string;
  timedOut: boolean;
  onRetry: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pulse = useSharedValue(0);
  const scanLine = useSharedValue(0);

  useEffect(() => {
    if (timedOut) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    scanLine.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [timedOut]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLine.value, [0, 1], [0, 180]) }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={StyleSheet.absoluteFillObject}
    >
      {capturedUri ? (
        <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : null}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.72)" }]} />
      <View style={styles.scanCenter}>
        {timedOut ? (
          <>
            <View style={[styles.scanFrame, { borderColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="clock" size={40} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={[styles.scanningText, { color: "#fff", fontFamily: "Inter_600SemiBold", marginTop: 20, textAlign: "center" }]}>
              {t("scan.analyzeTimedOut")}
            </Text>
            <Text style={[styles.scanSubText, { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", textAlign: "center" }]}>
              {t("scan.analyzeTimedOutSub")}
            </Text>
            <Pressable
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={16} color="#000" />
              <Text style={{ color: "#000", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                {t("scan.retryAnalysis")}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Animated.View style={[styles.scanFrame, pulseStyle]}>
              <View style={[styles.scanCorner, styles.scanCornerTL, { borderColor: theme.primary }]} />
              <View style={[styles.scanCorner, styles.scanCornerTR, { borderColor: theme.primary }]} />
              <View style={[styles.scanCorner, styles.scanCornerBL, { borderColor: theme.primary }]} />
              <View style={[styles.scanCorner, styles.scanCornerBR, { borderColor: theme.primary }]} />
              <View style={styles.scanLineContainer}>
                <Animated.View
                  style={[styles.scanLine, scanLineStyle, { backgroundColor: theme.primary + "cc" }]}
                />
              </View>
            </Animated.View>
            <View style={styles.scanTextRow}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={[styles.scanningText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                {t("scan.analyzing")}
              </Text>
            </View>
            <Text style={[styles.scanSubText, { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" }]}>
              {t("scan.analyzingSubtitle")}
            </Text>
            <Text style={[styles.scanHintText, { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular" }]}>
              {t("scan.analyzingHint")}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function EditPortionModal({
  item,
  onSave,
  onClose,
}: {
  item: ScanMealItem;
  onSave: (updated: ScanMealItem) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [portionSize, setPortionSize] = useState(String(item.portionSize));

  const handleSave = () => {
    const newSize = parseFloat(portionSize);
    if (!newSize || isNaN(newSize) || newSize <= 0) {
      Alert.alert(t("common.error"), t("scan.invalidPortion"));
      return;
    }
    const ratio = newSize / item.portionSize;
    onSave({
      ...item,
      portionSize: newSize,
      calories: Math.round(item.calories * ratio),
      proteinG: Math.round(item.proteinG * ratio * 10) / 10,
      carbsG: Math.round(item.carbsG * ratio * 10) / 10,
      fatG: Math.round(item.fatG * ratio * 10) / 10,
    });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalBackdrop}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(300).easing(Easing.out(Easing.cubic))}
          style={[styles.editModal, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={[styles.editTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {item.name}
          </Text>
          <Text style={[styles.editSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t("scan.adjustPortion")}
          </Text>
          <View style={[styles.portionRow, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.portionInput, { color: theme.text, fontFamily: "Inter_500Medium" }]}
              value={portionSize}
              onChangeText={setPortionSize}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.portionUnitLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {item.portionUnit}
            </Text>
          </View>
          <View style={styles.editButtons}>
            <Pressable onPress={onClose} style={[styles.editBtn, { borderColor: theme.border }]}>
              <Text style={[styles.editBtnText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.editBtn, styles.editBtnPrimary, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.editBtnText, { color: "#000", fontFamily: "Inter_600SemiBold" }]}>
                {t("common.save")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ScanScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 49;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [screenState, setScreenState] = useState<ScreenState>("camera");
  const [capturedUri, setCapturedUri] = useState("");
  const [items, setItems] = useState<ScanMealItem[]>([]);
  const [totals, setTotals] = useState<MacroTotals>({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [mealDescription, setMealDescription] = useState("");
  const [category, setCategory] = useState<MealCategory>("Lunch");
  const [editingItem, setEditingItem] = useState<ScanMealItem | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [scanTimedOut, setScanTimedOut] = useState(false);
  const [footerHeight, setFooterHeight] = useState(160);
  const clientTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode mode state
  const [scanMode, setScanMode] = useState<ScanMode>("photo");
  const [barcodeLooking, setBarcodeLooking] = useState(false);
  const barcodeProcessed = useRef(false);
  const [barcodeResult, setBarcodeResult] = useState<{
    name: string;
    brand?: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingG?: number;
  } | null>(null);

  // Scan limit status
  const { data: scanStatus, refetch: refetchScanStatus } = useQuery<ScanStatus>({
    queryKey: ["scan-status"],
    queryFn: () => api.scanMealStatus(),
    staleTime: 30_000,
  });

  const scanLimitReached =
    scanStatus != null &&
    !scanStatus.isUnlimited &&
    scanStatus.remainingScans <= 0;

  const captureButtonScale = useSharedValue(1);
  const captureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureButtonScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (clientTimeoutRef.current) {
        clearTimeout(clientTimeoutRef.current);
      }
    };
  }, []);

  const recalcTotals = (currentItems: ScanMealItem[]) => {
    const sum = currentItems.reduce(
      (acc, i) => ({
        calories: acc.calories + i.calories,
        proteinG: acc.proteinG + i.proteinG,
        carbsG: acc.carbsG + i.carbsG,
        fatG: acc.fatG + i.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
    setTotals({
      calories: Math.round(sum.calories),
      proteinG: Math.round(sum.proteinG * 10) / 10,
      carbsG: Math.round(sum.carbsG * 10) / 10,
      fatG: Math.round(sum.fatG * 10) / 10,
    });
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || screenState !== "camera") return;

    captureButtonScale.value = withSequence(
      withTiming(0.88, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setScanTimedOut(false);

    if (clientTimeoutRef.current) {
      clearTimeout(clientTimeoutRef.current);
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.55,
        base64: true,
        skipProcessing: false,
      });

      if (!photo) throw new Error("No photo captured");

      setCapturedUri(photo.uri);
      setScreenState("scanning");

      let base64Data = photo.base64;

      if (!base64Data) {
        if (photo.uri && photo.uri.startsWith("data:")) {
          base64Data = photo.uri.split(",")[1];
        } else {
          throw new Error("Could not get image data. Please try again.");
        }
      }

      const CLIENT_TIMEOUT_MS = 25000;

      const clientTimeoutPromise = new Promise<never>((_, reject) => {
        clientTimeoutRef.current = setTimeout(() => {
          setScanTimedOut(true);
          reject(new Error("CLIENT_TIMEOUT"));
        }, CLIENT_TIMEOUT_MS);
      });

      const result = await Promise.race([
        api.scanMealAnalyze({ imageBase64: base64Data, mimeType: "image/jpeg" }),
        clientTimeoutPromise,
      ]);

      if (clientTimeoutRef.current) {
        clearTimeout(clientTimeoutRef.current);
        clientTimeoutRef.current = null;
      }

      setItems(result.items);
      setTotals(result.totals);
      setMealDescription(result.mealDescription);
      setScreenState("results");
      refetchScanStatus();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (clientTimeoutRef.current) {
        clearTimeout(clientTimeoutRef.current);
        clientTimeoutRef.current = null;
      }
      console.error("Scan error:", err);
      if (err?.message === "CLIENT_TIMEOUT") {
        return;
      }
      // Handle scan limit reached (429)
      if (err?.status === 429) {
        refetchScanStatus();
        setScreenState("camera");
        showToast(t("scan.dailyLimitReached") || "Daily scan limit reached", "error");
        return;
      }
      const isServerTimeout =
        err?.status === 504 ||
        (typeof err?.message === "string" && err.message.includes("timed out"));
      if (isServerTimeout) {
        setScanTimedOut(true);
        return;
      }
      setScanTimedOut(false);
      setScreenState("camera");
      showToast(t("scan.analyzeFailed"), "error");
    }
  }, [screenState, captureButtonScale, t, showToast, refetchScanStatus]);

  const handleLogMeal = async () => {
    if (items.length === 0) return;
    setIsLogging(true);
    try {
      await api.scanMealLog({
        items,
        category,
        name: mealDescription || t("scan.scannedMeal"),
        photoUrl: capturedUri || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["today-nutrition"] });
      refetchScanStatus();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("scan.mealLogged"), "success");
      handleRetake();
    } catch (err) {
      showToast(t("scan.logFailed"), "error");
    } finally {
      setIsLogging(false);
    }
  };

  const handleRetake = () => {
    setScreenState("camera");
    setCapturedUri("");
    setItems([]);
    setTotals({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    setMealDescription("");
  };

  const handleItemEdit = (updatedItem: ScanMealItem) => {
    const newItems = items.map((it) =>
      it.name === editingItem?.name && it.portionSize === editingItem?.portionSize ? updatedItem : it
    );
    setItems(newItems);
    recalcTotals(newItems);
    setEditingItem(null);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    recalcTotals(newItems);
  };

  const handleRetry = useCallback(() => {
    setScanTimedOut(false);
    setScreenState("camera");
  }, []);

  const onBarcodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (barcodeProcessed.current || barcodeLooking) return;
    const code = result.data;
    if (!code || !/^\d{4,14}$/.test(code)) return;
    barcodeProcessed.current = true;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setBarcodeLooking(true);

    try {
      const { food } = await api.barcodeLookup(code);
      setBarcodeResult({
        name: food.name,
        brand: food.brand,
        calories: food.calories || 0,
        proteinG: food.proteinG || 0,
        carbsG: food.carbsG || 0,
        fatG: food.fatG || 0,
        servingG: food.servingG,
      });
    } catch (err: any) {
      const msg = err.message || t("scan.productNotFound");
      showToast(msg.includes("not found") ? t("scan.productNotFound") : msg, "error");
      barcodeProcessed.current = false;
    } finally {
      setBarcodeLooking(false);
    }
  }, [barcodeLooking, t, showToast]);

  const handleLogBarcodeItem = async () => {
    if (!barcodeResult) return;
    setIsLogging(true);
    try {
      const displayName = barcodeResult.brand
        ? `${barcodeResult.name} (${barcodeResult.brand})`
        : barcodeResult.name;
      const scanItem: ScanMealItem = {
        name: displayName,
        portionSize: barcodeResult.servingG || 100,
        portionUnit: "g",
        calories: barcodeResult.calories,
        proteinG: barcodeResult.proteinG,
        carbsG: barcodeResult.carbsG,
        fatG: barcodeResult.fatG,
      };
      await api.scanMealLog({
        items: [scanItem],
        category,
        name: displayName,
      });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["today-nutrition"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("scan.mealLogged"), "success");
      setBarcodeResult(null);
      barcodeProcessed.current = false;
    } catch (err) {
      showToast(t("scan.logFailed"), "error");
    } finally {
      setIsLogging(false);
    }
  };

  const handleBarcodeScanAnother = () => {
    setBarcodeResult(null);
    barcodeProcessed.current = false;
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.permissionIcon, { backgroundColor: theme.primary + "18" }]}>
          <Feather name="camera" size={40} color={theme.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {t("scan.cameraPermissionTitle")}
        </Text>
        <Text style={[styles.permissionDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {t("scan.cameraPermissionDesc")}
        </Text>
        <Pressable
          style={[styles.permissionBtn, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permissionBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {t("scan.allowCamera")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {(screenState === "camera" || screenState === "scanning") && scanMode === "photo" && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
        />
      )}

      {scanMode === "barcode" && screenState === "camera" && !barcodeResult && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}

      {screenState === "camera" && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="box-none"
        >
          <View style={[styles.cameraTopBar, { paddingTop: insets.top + 12 }]}>
            <Text style={[styles.cameraTitle, { fontFamily: "Inter_700Bold" }]}>
              {t("scan.title")}
            </Text>

            {/* Scan mode toggle */}
            <View style={[styles.modeToggle, { marginTop: 12 }]}>
              <Pressable
                onPress={() => { setScanMode("photo"); setBarcodeResult(null); barcodeProcessed.current = false; }}
                style={[
                  styles.modeToggleBtn,
                  { backgroundColor: scanMode === "photo" ? theme.primary : theme.card },
                ]}
              >
                <Feather name="camera" size={14} color={scanMode === "photo" ? "#000" : theme.text} />
                <Text style={[styles.modeToggleText, {
                  color: scanMode === "photo" ? "#000" : theme.text,
                  fontFamily: scanMode === "photo" ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>
                  {t("scan.scanMeal") || "Scan Meal"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setScanMode("barcode"); barcodeProcessed.current = false; }}
                style={[
                  styles.modeToggleBtn,
                  { backgroundColor: scanMode === "barcode" ? theme.primary : theme.card },
                ]}
              >
                <Feather name="maximize" size={14} color={scanMode === "barcode" ? "#000" : theme.text} />
                <Text style={[styles.modeToggleText, {
                  color: scanMode === "barcode" ? "#000" : theme.text,
                  fontFamily: scanMode === "barcode" ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>
                  {t("scan.barcode") || "Barcode"}
                </Text>
              </Pressable>
            </View>

            {/* Remaining scans badge */}
            {scanStatus && !scanStatus.isUnlimited && scanMode === "photo" && (
              <View style={[styles.scanCountBadge, { backgroundColor: scanLimitReached ? "rgba(255,82,82,0.18)" : "rgba(0,0,0,0.5)", marginTop: 10 }]}>
                <Feather name="zap" size={12} color={scanLimitReached ? "#ff5252" : theme.primary} />
                <Text style={[styles.scanCountText, {
                  color: scanLimitReached ? "#ff5252" : "#fff",
                  fontFamily: "Inter_500Medium",
                }]}>
                  {scanLimitReached
                    ? (t("scan.noScansLeft") || "No scans left today")
                    : `${scanStatus.remainingScans}/${scanStatus.scansPerDay} ${t("scan.scansRemaining") || "scans remaining today"}`
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Photo mode UI */}
          {scanMode === "photo" && (
            <>
              {scanLimitReached ? (
                /* ── Upsell card when daily limit is reached ── */
                <View style={[styles.upsellOverlay, { paddingBottom: insets.bottom + 24 }]}>
                  <View style={[styles.upsellCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.upsellIconCircle, { backgroundColor: theme.primary + "18" }]}>
                      <Feather name="lock" size={28} color={theme.primary} />
                    </View>
                    <Text style={[styles.upsellTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                      {t("scan.dailyLimitTitle") || "Daily Scan Limit Reached"}
                    </Text>
                    <Text style={[styles.upsellDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {t("scan.dailyLimitDesc") || "Free accounts get 1 meal scan per day. Upgrade to Premium for unlimited AI-powered scans."}
                    </Text>
                    <Pressable
                      onPress={() => router.push("/premium" as any)}
                      style={[styles.upsellBtn, { backgroundColor: theme.primary }]}
                    >
                      <Feather name="star" size={16} color="#000" />
                      <Text style={{ color: "#000", fontFamily: "Inter_700Bold", fontSize: 15 }}>
                        {t("scan.upgradePremium") || "Upgrade to Premium"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.cameraHint}>
                    <View style={[styles.hintPill, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                      <Feather name="info" size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={[styles.hintText, { fontFamily: "Inter_400Regular" }]}>
                        {t("scan.hintText")}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + 24 }]}>
                    <Pressable
                      style={styles.flipBtn}
                      onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                    >
                      <Feather name="refresh-cw" size={22} color="#fff" />
                    </Pressable>

                    <Animated.View style={captureStyle}>
                      <Pressable onPress={handleCapture} style={styles.captureOuter}>
                        <View style={styles.captureInner} />
                      </Pressable>
                    </Animated.View>

                    <View style={styles.flipBtn} />
                  </View>
                </>
              )}
            </>
          )}

          {/* Barcode mode UI */}
          {scanMode === "barcode" && !barcodeResult && (
            <>
              {barcodeLooking ? (
                <View style={styles.barcodeLoadingCenter}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 15, marginTop: 12 }}>
                    {t("scan.lookingUpProduct") || "Looking up product..."}
                  </Text>
                </View>
              ) : (
                <View style={styles.barcodeHintCenter}>
                  <View style={styles.barcodeFrame}>
                    <View style={[styles.barcodeCorner, styles.barcodeCornerTL, { borderColor: theme.primary }]} />
                    <View style={[styles.barcodeCorner, styles.barcodeCornerTR, { borderColor: theme.primary }]} />
                    <View style={[styles.barcodeCorner, styles.barcodeCornerBL, { borderColor: theme.primary }]} />
                    <View style={[styles.barcodeCorner, styles.barcodeCornerBR, { borderColor: theme.primary }]} />
                  </View>
                  <Text style={styles.barcodeHintText}>
                    {t("scan.pointAtBarcode") || "Point camera at a barcode"}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Barcode result display */}
          {scanMode === "barcode" && barcodeResult && (
            <View style={[styles.barcodeResultOverlay, { paddingBottom: tabBarHeight + 16 }]}>
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.85)" }]} />
              <View style={[styles.barcodeResultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.barcodeResultBadge, { backgroundColor: theme.primary + "18" }]}>
                  <Feather name="check-circle" size={14} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {t("scan.productFound") || "Product Found"}
                  </Text>
                </View>
                <Text style={[styles.barcodeResultName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {barcodeResult.name}
                </Text>
                {barcodeResult.brand && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 12 }}>
                    {barcodeResult.brand}
                  </Text>
                )}
                <View style={styles.barcodeResultMacros}>
                  <MacroPill label={t("common.calories")} value={barcodeResult.calories} unit="kcal" color={theme.primary} />
                  <MacroPill label={t("common.protein")} value={barcodeResult.proteinG} unit="g" color="#448aff" />
                  <MacroPill label={t("common.carbs")} value={barcodeResult.carbsG} unit="g" color="#ffab40" />
                  <MacroPill label={t("common.fat")} value={barcodeResult.fatG} unit="g" color="#ff5252" />
                </View>
                {barcodeResult.servingG && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 }}>
                    {t("scan.perServing") || "Per serving"}: {barcodeResult.servingG}g
                  </Text>
                )}
                <Pressable
                  onPress={handleLogBarcodeItem}
                  disabled={isLogging}
                  style={[styles.barcodeLogBtn, { backgroundColor: theme.primary, opacity: isLogging ? 0.7 : 1 }]}
                >
                  {isLogging ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#000" />
                      <Text style={{ color: "#000", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                        {t("scan.logMeal")}
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={handleBarcodeScanAnother} style={styles.barcodeScanAnotherBtn}>
                  <Feather name="maximize" size={14} color={theme.textMuted} />
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                    {t("scan.scanAnother") || "Scan another"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {screenState === "scanning" && (
        <ScanningOverlay capturedUri={capturedUri} timedOut={scanTimedOut} onRetry={handleRetry} />
      )}

      {screenState === "results" && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background }]}
        >
          {/* Food photo hero */}
          {capturedUri ? (
            <View style={[styles.resultImageContainer, { paddingTop: insets.top }]}>
              <Image source={{ uri: capturedUri }} style={styles.resultImage} resizeMode="cover" />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.4)" }]} />
              <Pressable
                style={[styles.retakeBtn, { top: insets.top + 12 }]}
                onPress={handleRetake}
              >
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          {/* Results slide-up sheet */}
          <Animated.View
            entering={SlideInDown.duration(320).delay(100).easing(Easing.out(Easing.cubic))}
            style={[styles.resultsSheet, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

            {/* ── Category selector (MOVED TO TOP) ── */}
            <View style={[styles.categoryRow, { borderBottomColor: theme.border, borderBottomWidth: 1, marginBottom: 12 }]}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === cat ? theme.primary : theme.cardAlt,
                      borderColor: category === cat ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color: category === cat ? "#000" : theme.textMuted,
                        fontFamily: category === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {t(`scan.categories.${cat.toLowerCase()}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mealDescription ? (
              <Text style={[styles.mealDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {mealDescription}
              </Text>
            ) : null}

            {/* Food items list */}
            <ScrollView
              style={styles.itemsList}
              contentContainerStyle={{ paddingBottom: footerHeight + 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((item, idx) => (
                <Animated.View
                  key={`${item.name}-${idx}`}
                  entering={FadeIn.duration(200)}
                  style={[styles.foodItem, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  <View style={styles.foodItemLeft}>
                    <Text style={[styles.foodItemName, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.foodItemPortion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {item.portionSize} {item.portionUnit}
                      {"  ·  "}
                      <Text style={{ color: "#448aff" }}>{item.proteinG}g P</Text>
                      {"  "}
                      <Text style={{ color: "#ffab40" }}>{item.carbsG}g C</Text>
                      {"  "}
                      <Text style={{ color: "#ff5252" }}>{item.fatG}g F</Text>
                    </Text>
                  </View>
                  <View style={styles.foodItemRight}>
                    <Text style={[styles.foodItemCal, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                      {item.calories}
                    </Text>
                    <Text style={[styles.foodItemCalUnit, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      kcal
                    </Text>
                    <Pressable
                      onPress={() => setEditingItem(item)}
                      style={[styles.editIconBtn, { backgroundColor: theme.cardAlt }]}
                    >
                      <Feather name="edit-2" size={13} color={theme.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveItem(idx)}
                      style={[styles.editIconBtn, { backgroundColor: theme.cardAlt }]}
                    >
                      <Feather name="trash-2" size={13} color={theme.danger} />
                    </Pressable>
                  </View>
                </Animated.View>
              ))}

              <Pressable
                onPress={() => router.push("/meals" as any)}
                style={styles.mealHistoryLink}
              >
                <Feather name="clock" size={14} color={theme.primary} />
                <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  {t("scan.viewMealHistory")}
                </Text>
                <Feather name={rtlIcon("chevron-right")} size={14} color={theme.primary} />
              </Pressable>
            </ScrollView>

            {/* ── Sticky macro + CTA footer ── */}
            <View
              style={[styles.stickyFooter, { borderTopColor: theme.border, paddingBottom: tabBarHeight + 8, backgroundColor: theme.background }]}
              onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            >
              {/* Macro pills row */}
              <View style={styles.macroRow}>
                <MacroPill label={t("common.calories")} value={totals.calories} unit="kcal" color={theme.primary} />
                <MacroPill label={t("common.protein")} value={totals.proteinG} unit="g" color="#448aff" />
                <MacroPill label={t("common.carbs")} value={totals.carbsG} unit="g" color="#ffab40" />
                <MacroPill label={t("common.fat")} value={totals.fatG} unit="g" color="#ff5252" />
              </View>

              {/* Full-width Log Meal CTA */}
              <Pressable
                onPress={handleLogMeal}
                disabled={isLogging || items.length === 0}
                style={[
                  styles.logBtnFull,
                  {
                    backgroundColor: items.length === 0 ? theme.textMuted : theme.primary,
                    opacity: isLogging ? 0.7 : 1,
                  },
                ]}
              >
                {isLogging ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={20} color="#000" />
                    <Text style={[styles.logBtnText, { fontFamily: "Inter_700Bold", fontSize: 17 }]}>
                      {t("scan.logMeal")}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Secondary retake link */}
              <Pressable onPress={handleRetake} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Feather name="camera" size={14} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                  {t("scan.retake")}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {editingItem && (
        <EditPortionModal
          item={editingItem}
          onSave={handleItemEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    marginBottom: 12,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  permissionBtnText: {
    color: "#000",
    fontSize: 16,
  },
  cameraTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 18,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cameraTagline: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraHint: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  cameraBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 32,
  },
  flipBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  scanCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  scanFrame: {
    width: 220,
    height: 220,
    position: "relative",
  },
  scanLineContainer: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    height: 180,
    overflow: "hidden",
  },
  scanLine: {
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  scanCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  scanCornerTL: {
    top: 0,
    start: 0,
    borderEndWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerTR: {
    top: 0,
    end: 0,
    borderStartWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBL: {
    bottom: 0,
    start: 0,
    borderEndWidth: 0,
    borderTopWidth: 0,
  },
  scanCornerBR: {
    bottom: 0,
    end: 0,
    borderStartWidth: 0,
    borderTopWidth: 0,
  },
  scanTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scanningText: {
    fontSize: 17,
    letterSpacing: 0.2,
  },
  scanSubText: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 220,
    marginTop: 6,
  },
  scanHintText: {
    fontSize: 11,
    textAlign: "center",
    maxWidth: 200,
    marginTop: 10,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    minHeight: 44,
  },
  resultImageContainer: {
    height: 200,
    position: "relative",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  retakeBtn: {
    position: "absolute",
    end: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsSheet: {
    flex: 1,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    marginTop: -24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  stickyFooter: {
    borderTopWidth: 1, paddingTop: 12, gap: 10, paddingHorizontal: 0,
  },
  macroRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
  },
  macroPillValue: {
    fontSize: 18,
  },
  macroPillUnit: {
    fontSize: 11,
    marginTop: 1,
  },
  macroPillLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mealDesc: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  itemsList: {
    flex: 1,
  },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  foodItemLeft: {
    flex: 1,
    marginEnd: 8,
  },
  foodItemName: {
    fontSize: 15,
    marginBottom: 4,
  },
  foodItemPortion: {
    fontSize: 12,
  },
  foodItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  foodItemCal: {
    fontSize: 17,
  },
  foodItemCalUnit: {
    fontSize: 11,
    marginEnd: 4,
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  catChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
  },
  mealHistoryLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 4,
  },
  retakeTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  retakeBtnText: {
    fontSize: 14,
  },
  logBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
  },
  logBtnText: {
    color: "#000",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  editModal: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    borderTopWidth: 1,
    borderStartWidth: 1,
    borderEndWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  editTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  editSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  portionInput: {
    flex: 1,
    fontSize: 22,
  },
  portionUnitLabel: {
    fontSize: 15,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
  },
  editBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  editBtnPrimary: {
    borderWidth: 0,
  },
  editBtnText: {
    fontSize: 15,
  },
  invalidPortion: {},
  modeToggle: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    padding: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  modeToggleText: {
    fontSize: 13,
  },
  barcodeLoadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  barcodeHintCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  barcodeFrame: {
    width: 260,
    height: 160,
    position: "relative",
  },
  barcodeCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderWidth: 3,
  },
  barcodeCornerTL: {
    top: 0,
    start: 0,
    borderEndWidth: 0,
    borderBottomWidth: 0,
    borderTopStartRadius: 8,
  },
  barcodeCornerTR: {
    top: 0,
    end: 0,
    borderStartWidth: 0,
    borderBottomWidth: 0,
    borderTopEndRadius: 8,
  },
  barcodeCornerBL: {
    bottom: 0,
    start: 0,
    borderEndWidth: 0,
    borderTopWidth: 0,
    borderBottomStartRadius: 8,
  },
  barcodeCornerBR: {
    bottom: 0,
    end: 0,
    borderStartWidth: 0,
    borderTopWidth: 0,
    borderBottomEndRadius: 8,
  },
  barcodeHintText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  barcodeResultOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  barcodeResultCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  barcodeResultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  barcodeResultName: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  barcodeResultMacros: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginTop: 8,
  },
  barcodeLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    marginTop: 16,
  },
  barcodeScanAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
  },

  // ── Scan limit styles ──
  scanCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
  },
  scanCountText: {
    fontSize: 12,
  },
  upsellOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
  },
  upsellCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  upsellIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  upsellTitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  upsellDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  upsellBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    width: "100%",
  },
});
