import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Alert, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { rtlIcon, dateLocale } from "@/lib/rtl";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useNotificationStore, NOTIF_META, NOTIF_TYPES, type NotifType } from "@/store/notificationStore";
import {
  requestNotificationPermission,
  scheduleNativeNotifications,
  cancelAllNativeNotifications,
} from "@/lib/notifications";
import { api } from "@/lib/api";
import { getRankByXp, getXpProgress } from "@/lib/ranks";
import { RANK_ICON_MAP } from "@/components/RankIcons";
import { RankBadge } from "@/components/RankBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SkeletonBox, SkeletonCard } from "@/components/SkeletonBox";
import { useToast } from "@/components/ui/Toast";

const PRESET_TIMES = [
  "06:00","07:00","07:30","08:00","08:30","09:00","10:00","11:00",
  "12:00","12:30","13:00","14:00","15:00","16:00","17:00","18:00",
  "19:00","20:00","21:00","22:00",
];

function fmtTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString(dateLocale(), { hour: "numeric", minute: m === 0 ? undefined : "2-digit" });
}

const FITNESS_GOALS = ["Lose Weight", "Build Muscle", "Stay Active", "Improve Endurance", "Improve Flexibility"];
const ACTIVITY_LEVELS = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const PROFILE_EQUIPMENT: { id: string; label: string }[] = [
  { id: "none", label: "Bodyweight only" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "bench", label: "Bench" },
  { id: "pullup_bar", label: "Pull-up bar" },
  { id: "resistance_bands", label: "Resistance bands" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "cable_machine", label: "Cable machine" },
  { id: "smith_machine", label: "Smith machine" },
  { id: "leg_press", label: "Leg press" },
  { id: "treadmill", label: "Treadmill" },
  { id: "stationary_bike", label: "Stationary bike" },
  { id: "rowing_machine", label: "Rowing machine" },
  { id: "jump_rope", label: "Jump rope" },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, clearAuth } = useAuthStore();
  const { darkMode, unitSystem, setDarkMode, setUnitSystem } = useSettingsStore();
  const { globalEnabled, prefs, setGlobalEnabled, setEnabled, setTime } = useNotificationStore();
  const [expandedNotifType, setExpandedNotifType] = useState<NotifType | null>(null);
  const [bodyStatsExpanded, setBodyStatsExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const equipmentCardY = useRef(0);
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  const { showToast } = useToast();

  const goalLabels: Record<string, string> = {
    "Lose Weight": t("profile.loseWeight"),
    "Build Muscle": t("profile.buildMuscle"),
    "Stay Active": t("profile.stayActive"),
    "Improve Endurance": t("profile.improveEndurance"),
    "Improve Flexibility": t("profile.improveFlexibility"),
  };

  const activityLabels: Record<string, string> = {
    "Sedentary": t("profile.sedentary"),
    "Lightly Active": t("profile.lightlyActive"),
    "Moderately Active": t("profile.moderatelyActive"),
    "Very Active": t("profile.veryActive"),
  };

  // Profile fields
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  // Height: either cm (metric) or ft+in (imperial)
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  // Weight: either kg (metric) or lbs (imperial)
  const [weightKg, setWeightKg] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState("");
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [waterGoalMl, setWaterGoalMl] = useState("2000");
  
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [nutritionSuggestion, setNutritionSuggestion] = useState<{ calorieGoal: number; proteinGoal: number; carbsGoal: number; fatGoal: number; explanation: string } | null>(null);
  const [goalsExpanded, setGoalsExpanded] = useState(true);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);
  // Tracks the unit system from the previous render so we know the direction
  // of any switch (metric→imperial or imperial→metric) for in-place conversion.
  const prevUnitSystemRef = useRef(unitSystem);
  
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: api.getSubscription,
    staleTime: 5 * 60 * 1000,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: todayMealsData } = useQuery({
    queryKey: ["meals", todayStr],
    queryFn: () => api.getMeals(todayStr),
    staleTime: 5 * 60 * 1000,
  });
  const { data: waterTodayData } = useQuery({
    queryKey: ["waterToday"],
    queryFn: api.getWaterToday,
    staleTime: 5 * 60 * 1000,
  });

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 300_000,
  });

  const { data: workoutSummary } = useQuery({
    queryKey: ["workoutSummary"],
    queryFn: api.getWorkoutSummary,
    staleTime: 120_000,
  });

  const { data: streaksData } = useQuery({
    queryKey: ["streaks"],
    queryFn: api.getStreaks,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (profile && !profileLoaded) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      if (profile.heightCm != null) {
        if (unitSystem === "imperial") {
          const totalIn = profile.heightCm / 2.54;
          setHeightFt(String(Math.floor(totalIn / 12)));
          setHeightIn(String(Math.round(totalIn % 12)));
        } else {
          setHeightCm(profile.heightCm.toString());
        }
      }
      if (profile.weightKg != null) {
        if (unitSystem === "imperial") {
          setWeightLbs((profile.weightKg * 2.20462).toFixed(1));
        } else {
          setWeightKg(profile.weightKg.toString());
        }
      }
      setFitnessGoals(profile.fitnessGoals || []);
      setActivityLevel(profile.activityLevel || "");
      setAvailableEquipment(profile.availableEquipment ?? []);
      setCalorieGoal(profile.dailyCalorieGoal?.toString() || "");
      setProteinGoal(profile.dailyProteinGoal?.toString() || "");
      setCarbsGoal(profile.dailyCarbsGoal?.toString() || "");
      setFatGoal(profile.dailyFatGoal?.toString() || "");
      setWaterGoalMl(profile.dailyWaterGoalMl?.toString() || "2000");
      setProfileLoaded(true);
    }
  }, [profile]);

  // When the user switches unit system chips, convert whatever is currently
  // in the height/weight fields rather than forcing them to re-save the profile.
  useEffect(() => {
    const prev = prevUnitSystemRef.current;
    prevUnitSystemRef.current = unitSystem;

    // Don't convert until the profile has been loaded into the fields once.
    if (!profileLoaded) return;
    // No actual change (e.g. initial render).
    if (prev === unitSystem) return;

    if (unitSystem === "imperial") {
      // metric → imperial: convert whatever is currently in the cm/kg fields.
      const cm = parseFloat(heightCm);
      if (!isNaN(cm) && cm > 0) {
        const totalIn = cm / 2.54;
        setHeightFt(String(Math.floor(totalIn / 12)));
        setHeightIn(String(Math.round(totalIn % 12)));
      }
      const kg = parseFloat(weightKg);
      if (!isNaN(kg) && kg > 0) {
        setWeightLbs((kg * 2.20462).toFixed(1));
      }
    } else {
      // imperial → metric: convert whatever is currently in the ft/in/lbs fields.
      const ft = parseFloat(heightFt);
      const inVal = parseFloat(heightIn || "0");
      if (!isNaN(ft) && ft > 0) {
        const totalCm = Math.round((ft * 12 + (isNaN(inVal) ? 0 : inVal)) * 2.54);
        setHeightCm(String(totalCm));
      }
      const lbs = parseFloat(weightLbs);
      if (!isNaN(lbs) && lbs > 0) {
        setWeightKg((lbs / 2.20462).toFixed(1));
      }
    }
  }, [unitSystem]);

  const updateMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      showToast(t("profile.profileUpdated"));
    },
    onError: () => showToast(t("profile.failedToUpdate"), "error"),
  });
  
  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      clearAuth();
      router.replace("/auth/login");
    },
  });
  
  const handleToggleGlobalNotifs = useCallback(async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          t("profile.permissionRequired"),
          t("profile.enableNotifications"),
          [{ text: t("common.ok") }]
        );
        return;
      }
      setGlobalEnabled(true);
      await scheduleNativeNotifications(prefs);
    } else {
      setGlobalEnabled(false);
      await cancelAllNativeNotifications();
    }
  }, [prefs, setGlobalEnabled]);

  const handleToggleType = useCallback(async (type: NotifType, val: boolean) => {
    setEnabled(type, val);
    if (globalEnabled) {
      const updated = { ...prefs, [type]: { ...prefs[type], enabled: val } };
      await scheduleNativeNotifications(updated);
    }
  }, [globalEnabled, prefs, setEnabled]);

  const handleSetTime = useCallback(async (type: NotifType, time: string) => {
    setTime(type, time);
    if (globalEnabled && prefs[type].enabled) {
      const updated = { ...prefs, [type]: { ...prefs[type], time } };
      await scheduleNativeNotifications(updated);
    }
  }, [globalEnabled, prefs, setTime]);

  const todayCaloriesConsumed = todayMealsData?.dailyTotals?.calories ?? 0;
  const todayProteinConsumed = todayMealsData?.dailyTotals?.proteinG ?? 0;
  const todayWaterConsumed = waterTodayData?.totalMl ?? 0;
  const hasAnyIntake = todayCaloriesConsumed > 0 || todayProteinConsumed > 0 || todayWaterConsumed > 0;

  function intakeStatusColor(consumed: number, goal: number): string | null {
    if (!goal || consumed === 0) return null;
    const pct = consumed / goal;
    if (pct >= 0.8) return theme.success;
    if (pct >= 0.5) return theme.warning;
    return theme.danger;
  }

  const experienceLabels: Record<string, string> = {
    "Beginner": t("profile.expBeginner"),
    "Intermediate": t("profile.expIntermediate"),
    "Advanced": t("profile.expAdvanced"),
  };

  const handleSave = () => {
    // ── Validation ─────────────────────────────────────────────────────────
    if (age) {
      const a = parseInt(age);
      if (isNaN(a) || a < 10 || a > 120) {
        showToast(t("profile.ageValidation"), "error");
        return;
      }
    }
    // Resolve height and weight to metric for storage
    let resolvedHeightCm: number | undefined;
    let resolvedWeightKg: number | undefined;
    if (unitSystem === "imperial") {
      const ft = parseFloat(heightFt);
      const inVal = parseFloat(heightIn || "0");
      if (heightFt) {
        if (isNaN(ft) || ft < 1 || ft > 9) { showToast(t("profile.heightFtValidation"), "error"); return; }
        if (heightIn && (isNaN(inVal) || inVal < 0 || inVal > 11)) { showToast(t("profile.heightInValidation"), "error"); return; }
        resolvedHeightCm = Math.round((ft * 12 + inVal) * 2.54);
      }
      if (weightLbs) {
        const lbs = parseFloat(weightLbs);
        if (isNaN(lbs) || lbs < 44 || lbs > 1100) { showToast(t("profile.weightLbsValidation"), "error"); return; }
        resolvedWeightKg = parseFloat((lbs / 2.20462).toFixed(2));
      }
    } else {
      if (heightCm) {
        const h = parseFloat(heightCm);
        if (isNaN(h) || h < 50 || h > 300) { showToast(t("profile.heightCmValidation"), "error"); return; }
        resolvedHeightCm = h;
      }
      if (weightKg) {
        const w = parseFloat(weightKg);
        if (isNaN(w) || w < 20 || w > 500) { showToast(t("profile.weightKgValidation"), "error"); return; }
        resolvedWeightKg = w;
      }
    }
    if (calorieGoal) {
      const c = parseInt(calorieGoal);
      if (isNaN(c) || c < 500 || c > 10000) {
        showToast(t("profile.calorieValidation"), "error");
        return;
      }
    }
    if (proteinGoal) {
      const p = parseInt(proteinGoal);
      if (isNaN(p) || p < 0 || p > 600) {
        showToast(t("profile.proteinValidation"), "error");
        return;
      }
    }
    if (carbsGoal) {
      const c = parseInt(carbsGoal);
      if (isNaN(c) || c < 0 || c > 1500) {
        showToast(t("profile.carbsValidation"), "error");
        return;
      }
    }
    if (fatGoal) {
      const f = parseInt(fatGoal);
      if (isNaN(f) || f < 0 || f > 500) {
        showToast(t("profile.fatValidation"), "error");
        return;
      }
    }
    if (waterGoalMl) {
      const wml = parseInt(waterGoalMl);
      if (isNaN(wml) || wml < 500 || wml > 10000) {
        showToast(t("profile.waterValidation"), "error");
        return;
      }
    }

    // Auto-calculate calorie goal if height/weight/age set
    let calculatedGoal = calorieGoal ? parseInt(calorieGoal) : undefined;
    if (!calculatedGoal && resolvedHeightCm && resolvedWeightKg && age) {
      const h = resolvedHeightCm, w = resolvedWeightKg, a = parseInt(age);
      // Mifflin-St Jeor: male +5, female -161, other defaults to male
      const genderOffset = gender === "Female" ? -161 : 5;
      const bmr = 10 * w + 6.25 * h - 5 * a + genderOffset;
      const actMults: Record<string, number> = {
        "Sedentary": 1.2, "Lightly Active": 1.375,
        "Moderately Active": 1.55, "Very Active": 1.725,
      };
      const mult = actMults[activityLevel] || 1.375;
      calculatedGoal = Math.round(bmr * mult);
    }
    
    updateMutation.mutate({
      firstName, lastName,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      heightCm: resolvedHeightCm,
      weightKg: resolvedWeightKg,
      fitnessGoals,
      activityLevel: activityLevel || undefined,
      availableEquipment,
      dailyCalorieGoal: calculatedGoal,
      dailyProteinGoal: proteinGoal ? parseInt(proteinGoal) : undefined,
      dailyCarbsGoal: carbsGoal ? parseInt(carbsGoal) : undefined,
      dailyFatGoal: fatGoal ? parseInt(fatGoal) : undefined,
      dailyWaterGoalMl: waterGoalMl ? parseInt(waterGoalMl) : undefined,
    });
  };
  
  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteAccount"),
      t("profile.deleteAccountMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.continueText"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("profile.deleteAccountConfirm"),
              t("profile.deleteAccountFinal"),
              [
                { text: t("common.goBack"), style: "cancel" },
                {
                  text: t("profile.yesDeleteMyAccount"),
                  style: "destructive",
                  onPress: () => deleteMutation.mutate(),
                },
              ]
            );
          },
        },
      ]
    );
  };
  
  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    clearAuth();
    router.replace("/auth/login");
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("profile.title")}</Text>
      </View>
      
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + bottomPad, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── ERROR RETRY ── */}
        {profileError && (
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: theme.danger + "18", borderWidth: 1, borderColor: theme.danger + "40", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name="alert-circle" size={18} color={theme.danger} />
            <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("common.error")}</Text>
            <Pressable onPress={() => refetchProfile()} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.danger + "25" }}>
              <Text style={{ color: theme.danger, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        )}

        {/* ── LOADING SKELETONS ── */}
        {profileLoading && !profile && (
          <View style={{ gap: 16 }}>
            <SkeletonCard style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <SkeletonBox width={80} height={80} borderRadius={40} />
              <SkeletonBox width={140} height={16} borderRadius={8} />
              <SkeletonBox width={200} height={13} borderRadius={6} />
            </SkeletonCard>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} style={{ flex: 1, minWidth: "45%", height: 80 }}>
                  <SkeletonBox width={24} height={24} borderRadius={6} />
                  <SkeletonBox width={80} height={13} borderRadius={6} />
                </SkeletonCard>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — USER CARD
            ══════════════════════════════════════════════════════════════════ */}
        {profile && (() => {
          const xp: number = (profile as any)?.xp ?? 0;
          const rank = getRankByXp(xp);
          const xpProgress = getXpProgress(xp);
          const IconComponent = RANK_ICON_MAP[rank.tier];
          const currentStreak = streaksData?.currentWorkoutStreak ?? 0;
          return (
            <Card>
              <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}>
                  {profile?.photoUrl ? (
                    <Image source={{ uri: profile.photoUrl }} style={{ width: "100%", height: "100%", borderRadius: 40 }} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.avatarLetter, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                      {firstName[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || "U"}
                    </Text>
                  )}
                </View>

                {/* Name */}
                <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20 }}>
                  {firstName} {lastName}
                </Text>

                {/* XP badge + rank */}
                <Pressable onPress={() => router.push("/rank")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: rank.bgColor, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: rank.borderColor + "40" }}>
                    {IconComponent && <IconComponent color={rank.borderColor} size={16} />}
                    <Text style={{ color: rank.textColor, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                      {rank.name}
                    </Text>
                    <Text style={{ color: rank.textColor + "90", fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      {xp.toLocaleString()} XP
                    </Text>
                  </View>
                </Pressable>

                {/* Streak with fire icon */}
                {currentStreak > 0 && (
                  <Pressable onPress={() => router.push("/streaks" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="zap" size={14} color="#ff6b35" />
                    <Text style={{ color: "#ff6b35", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                      {currentStreak}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      day streak
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — MENU GRID (2x2)
            ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.menuGrid}>
          {([
            { icon: "trending-up" as const, title: t("progress.title") || "Progress", onPress: () => router.push("/(tabs)/progress" as any), color: theme.primary },
            { icon: "award" as const, title: t("achievements.title") || "Achievements", onPress: () => router.push("/achievements" as any), color: "#e040fb" },
            { icon: "heart" as const, title: t("profile.recoveryWellness") || "Recovery", onPress: () => router.push("/recovery" as any), color: "#00bcd4" },
            { icon: "calendar" as const, title: t("profile.workoutPlan") || "Workout Plan", onPress: () => router.push("/workouts/plan" as any), color: theme.secondary },
          ]).map((item) => (
            <Pressable
              key={item.title}
              onPress={item.onPress}
              style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 10 }}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — SETTINGS LIST
            ══════════════════════════════════════════════════════════════════ */}
        <Card>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
            {t("profile.settingsTab")}
          </Text>

          {/* Notifications */}
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: (globalEnabled ? theme.primary : theme.textMuted) + "18" }]}>
                <Feather name="bell" size={16} color={globalEnabled ? theme.primary : theme.textMuted} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.notifications")}</Text>
            </View>
            <Switch
              value={globalEnabled}
              onValueChange={handleToggleGlobalNotifs}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={globalEnabled ? theme.primary : theme.textMuted}
            />
          </View>

          {/* Language */}
          <Pressable
            onPress={() => {
              const nextLang = language === "en" ? "ar" : "en";
              Alert.alert(
                t("profile.languageChangeTitle"),
                t("profile.languageChangeMessage"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("profile.languageChangeConfirm"), onPress: () => changeLanguage(nextLang as "en" | "ar") },
                ]
              );
            }}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.secondary + "18" }]}>
                <Feather name="globe" size={16} color={theme.secondary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.language")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                {language === "en" ? t("profile.english") : t("profile.arabic")}
              </Text>
              <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
            </View>
          </Pressable>

          {/* Units */}
          <Pressable
            onPress={() => setUnitSystem(unitSystem === "metric" ? "imperial" : "metric")}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: (theme.warning || "#ffab40") + "18" }]}>
                <Feather name="sliders" size={16} color={theme.warning || "#ffab40"} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.unitSystem")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                {unitSystem === "metric" ? t("profile.metric") : t("profile.imperial")}
              </Text>
              <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
            </View>
          </Pressable>

          {/* Dark Mode */}
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.primary + "18" }]}>
                <Feather name="moon" size={16} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.darkMode")}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={isDark ? theme.primary : theme.textMuted}
            />
          </View>

          {/* Health & Wearables */}
          <Pressable
            onPress={() => router.push("/settings/health" as any)}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#00e676" + "18" }]}>
                <Feather name="activity" size={16} color="#00e676" />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>Health & Wearables</Text>
            </View>
            <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
          </Pressable>

          {/* Export Data */}
          <Pressable
            onPress={() => {
              if (subscriptionData?.plan?.key !== "premium") {
                router.push("/subscription" as any);
              } else {
                router.push("/(tabs)/progress" as any);
              }
            }}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#448aff" + "18" }]}>
                <Feather name="download" size={16} color="#448aff" />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.exportData")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {subscriptionData?.plan?.key !== "premium" && (
                <View style={{ backgroundColor: "#448aff20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: "#448aff", fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 }}>PRO</Text>
                </View>
              )}
              <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
            </View>
          </Pressable>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — ACCOUNT
            ══════════════════════════════════════════════════════════════════ */}
        <Card>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
            Account
          </Text>

          {/* Plan info */}
          <Pressable
            onPress={() => router.push("/subscription" as any)}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: (subscriptionData?.plan?.key === "premium" ? "#448aff" : theme.primary) + "18" }]}>
                <Feather name="zap" size={16} color={subscriptionData?.plan?.key === "premium" ? "#448aff" : theme.primary} />
              </View>
              <View>
                <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.currentPlan")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                  {subscriptionData?.plan?.name ?? t("profile.free")}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[styles.planBadge, {
                backgroundColor: subscriptionData?.plan?.key === "premium" ? "#448aff20" : theme.primaryDim,
              }]}>
                <Text style={{
                  color: subscriptionData?.plan?.key === "premium" ? "#448aff" : theme.primary,
                  fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8,
                }}>
                  {(subscriptionData?.plan?.key ?? "free").toUpperCase()}
                </Text>
              </View>
              <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
            </View>
          </Pressable>

          {/* Edit Profile — save current profile data */}
          <Pressable
            onPress={handleSave}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.textMuted + "18" }]}>
                <Feather name="edit-2" size={16} color={theme.textMuted} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.saveProfile")}</Text>
            </View>
            {updateMutation.isPending ? (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>...</Text>
            ) : (
              <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
            )}
          </Pressable>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: theme.danger + "18" }]}>
                <Feather name="log-out" size={16} color={theme.danger} />
              </View>
              <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.signOut")}</Text>
            </View>
          </Pressable>
        </Card>

        {/* Version info */}
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t("profile.appVersion", { version: "1.0.0" })}
          </Text>
        </View>
      </ScrollView>

    </View>
  );
}

function SettingRow({ label, icon, children, theme }: { label: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Feather name={icon} size={18} color={theme.textMuted} />
        <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 15 }}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarLetter: { fontSize: 32 },
  menuGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
  },
  menuCard: {
    width: "47%", flexGrow: 1,
    borderRadius: 14, padding: 16,
    borderWidth: 1,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, minHeight: 48,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  planBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  versionInfo: { alignItems: "center", paddingVertical: 8 },
  versionText: { fontSize: 13 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  fieldGroup: { gap: 12 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, minHeight: 44, justifyContent: "center" as const },
  goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
    minHeight: 44,
  },
  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
});
