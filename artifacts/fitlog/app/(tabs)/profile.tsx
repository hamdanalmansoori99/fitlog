import React, { useState, useCallback, useEffect } from "react";
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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  const [tab, setTab] = useState<"profile" | "settings">("profile");
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
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [waterGoalMl, setWaterGoalMl] = useState("2000");
  
  const [profileLoaded, setProfileLoaded] = useState(false);
  
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
    enabled: tab === "profile",
  });
  const { data: waterTodayData } = useQuery({
    queryKey: ["waterToday"],
    queryFn: api.getWaterToday,
    staleTime: 5 * 60 * 1000,
    enabled: tab === "profile",
  });

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
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
      setCalorieGoal(profile.dailyCalorieGoal?.toString() || "");
      setProteinGoal(profile.dailyProteinGoal?.toString() || "");
      setCarbsGoal(profile.dailyCarbsGoal?.toString() || "");
      setFatGoal(profile.dailyFatGoal?.toString() || "");
      setWaterGoalMl(profile.dailyWaterGoalMl?.toString() || "2000");
      setProfileLoaded(true);
    }
  }, [profile]);
  
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
    if (pct >= 0.8) return theme.primary;
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
      
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          onPress={() => setTab("profile")}
          style={[styles.tab, { backgroundColor: tab === "profile" ? theme.primary : "transparent" }]}
        >
          <Text style={{ color: tab === "profile" ? "#0f0f1a" : theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            {t("profile.profileTab")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("settings")}
          style={[styles.tab, { backgroundColor: tab === "settings" ? theme.primary : "transparent" }]}
        >
          <Text style={{ color: tab === "settings" ? "#0f0f1a" : theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            {t("profile.settingsTab")}
          </Text>
        </Pressable>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 + bottomPad, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PROFILE ERROR RETRY ── */}
        {tab === "profile" && profileError && (
          <View style={{ padding: 14, borderRadius: 12, backgroundColor: theme.danger + "18", borderWidth: 1, borderColor: theme.danger + "40", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Feather name="alert-circle" size={18} color={theme.danger} />
            <Text style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>{t("common.error")}</Text>
            <Pressable onPress={() => refetchProfile()} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.danger + "25" }}>
              <Text style={{ color: theme.danger, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        )}

        {/* ── PROFILE LOADING SKELETONS ── */}
        {tab === "profile" && profileLoading && !profile && (
          <View style={{ gap: 16 }}>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 16 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.card }} />
              <View style={{ width: 140, height: 16, borderRadius: 8, backgroundColor: theme.card }} />
            </View>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ gap: 8, padding: 16, borderRadius: 16, backgroundColor: theme.card }}>
                <View style={{ width: 100, height: 14, borderRadius: 7, backgroundColor: theme.border }} />
                <View style={{ height: 44, borderRadius: 10, backgroundColor: theme.border + "88" }} />
              </View>
            ))}
          </View>
        )}

        {tab === "profile" ? (
          <>
            {/* Training Identity */}
            {profileLoaded && (
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                    {t("profile.trainingIdentity")}
                  </Text>
                  <Pressable onPress={() => router.push("/workouts/onboarding" as any)}>
                    <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                      {t("profile.updateGoalEquipment")} {"›"}
                    </Text>
                  </Pressable>
                </View>

                {fitnessGoals.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primaryDim, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="target" size={16} color={theme.primary} />
                    </View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                      {goalLabels[fitnessGoals[0]] || fitnessGoals[0]}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {!!profile?.weeklyWorkoutDays && (
                    <View style={{ backgroundColor: theme.primaryDim, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: theme.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                        {t("profile.perWeek", { days: profile.weeklyWorkoutDays })}
                      </Text>
                    </View>
                  )}
                  {!!profile?.experienceLevel && (
                    <View style={{ backgroundColor: theme.cardAlt, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                        {experienceLabels[profile.experienceLevel] || profile.experienceLevel}
                      </Text>
                    </View>
                  )}
                </View>

                {profile?.coachOnboardingComplete && (profile?.availableEquipment?.length ?? 0) > 0 ? (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    {t("profile.configuredFor", { days: profile.weeklyWorkoutDays ?? 3, goal: (goalLabels[fitnessGoals[0]] || fitnessGoals[0] || "").toLowerCase() })}
                  </Text>
                ) : (
                  <Text style={{ color: theme.warning, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    {t("profile.profileIncomplete")}
                  </Text>
                )}
              </Card>
            )}

            {/* Avatar section */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatar, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}>
                {profile?.photoUrl ? (
                  <Image
                    source={{ uri: profile.photoUrl }}
                    style={{ width: "100%", height: "100%", borderRadius: 40 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[styles.avatarLetter, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {firstName[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || "U"}
                  </Text>
                )}
              </View>
              <Text style={[styles.userName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {firstName} {lastName}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {user?.email}
              </Text>
            </View>
            
            {/* Personal Info */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.personalInfo")}</Text>
              <View style={styles.fieldGroup}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label={t("profile.firstName")} value={firstName} onChangeText={setFirstName} placeholder={t("profile.firstNamePlaceholder")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t("profile.lastName")} value={lastName} onChangeText={setLastName} placeholder={t("profile.lastNamePlaceholder")} />
                  </View>
                </View>

                {/* Body Stats collapsible */}
                <Pressable
                  onPress={() => setBodyStatsExpanded(v => !v)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border }}
                >
                  <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {t("profile.bodyStatsSection")}
                  </Text>
                  <Feather name={bodyStatsExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textMuted} />
                </Pressable>

                {bodyStatsExpanded && (
                  <View style={{ gap: 12 }}>
                    <Input label={t("profile.age")} value={age} onChangeText={setAge} placeholder="28" keyboardType="numeric" />
                    <View>
                      <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>{t("profile.gender")}</Text>
                      <View style={styles.chipRow}>
                        {["Male", "Female", "Other"].map(g => {
                          const genderLabels: Record<string, string> = { "Male": t("profile.male"), "Female": t("profile.female"), "Other": t("profile.other") };
                          return (
                            <Pressable
                              key={g}
                              onPress={() => setGender(gender === g ? "" : g)}
                              style={[styles.chip, { backgroundColor: gender === g ? theme.primaryDim : "transparent", borderColor: gender === g ? theme.primary : theme.border }]}
                            >
                              <Text style={{ color: gender === g ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>{genderLabels[g]}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    {unitSystem === "imperial" ? (
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Input label={t("profile.heightFt")} value={heightFt} onChangeText={setHeightFt} placeholder="5" keyboardType="decimal-pad" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input label={t("profile.heightIn")} value={heightIn} onChangeText={setHeightIn} placeholder="10" keyboardType="decimal-pad" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input label={t("profile.weightLbs")} value={weightLbs} onChangeText={setWeightLbs} placeholder="165" keyboardType="decimal-pad" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Input label={t("profile.heightCm")} value={heightCm} onChangeText={setHeightCm} placeholder="175" keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input label={t("profile.weightKg")} value={weightKg} onChangeText={setWeightKg} placeholder="75" keyboardType="numeric" />
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </Card>
            
            {/* Fitness Goals */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.fitnessGoals")}</Text>
              <View style={styles.goalsGrid}>
                {FITNESS_GOALS.map(goal => (
                  <Pressable
                    key={goal}
                    onPress={() => setFitnessGoals(
                      fitnessGoals.includes(goal) ? fitnessGoals.filter(g => g !== goal) : [...fitnessGoals, goal]
                    )}
                    style={[
                      styles.goalChip,
                      { backgroundColor: fitnessGoals.includes(goal) ? theme.primaryDim : theme.cardAlt, borderColor: fitnessGoals.includes(goal) ? theme.primary : theme.border },
                    ]}
                  >
                    {fitnessGoals.includes(goal) && <Feather name="check" size={12} color={theme.primary} />}
                    <Text style={{ color: fitnessGoals.includes(goal) ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {goalLabels[goal] || goal}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            
            {/* Activity Level */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.activityLevel")}</Text>
              {ACTIVITY_LEVELS.map(level => (
                <Pressable
                  key={level}
                  onPress={() => setActivityLevel(level)}
                  style={[styles.levelRow, { borderColor: activityLevel === level ? theme.primary : theme.border }]}
                >
                  <View style={[styles.radio, { borderColor: activityLevel === level ? theme.primary : theme.border }]}>
                    {activityLevel === level && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                  </View>
                  <Text style={{ color: activityLevel === level ? theme.primary : theme.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                    {activityLabels[level] || level}
                  </Text>
                </Pressable>
              ))}
            </Card>
            
            {/* Nutrition Targets */}
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>{t("profile.dailyTargets")}</Text>
                {hasAnyIntake && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {t("common.today")}
                  </Text>
                )}
              </View>

              {/* Calories */}
              <View>
                <Input label={t("profile.calorieGoalLabel")} value={calorieGoal} onChangeText={setCalorieGoal} placeholder="2000" keyboardType="numeric" />
                {hasAnyIntake && !!calorieGoal && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: intakeStatusColor(todayCaloriesConsumed, parseInt(calorieGoal) || 0) ?? theme.border }} />
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      {todayCaloriesConsumed} / {calorieGoal} {t("common.kcal")}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label={t("profile.proteinG")} value={proteinGoal} onChangeText={setProteinGoal} placeholder="150" keyboardType="numeric" />
                  {hasAnyIntake && !!proteinGoal && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: intakeStatusColor(todayProteinConsumed, parseInt(proteinGoal) || 0) ?? theme.border }} />
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        {todayProteinConsumed}g
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}><Input label={t("profile.carbsG")} value={carbsGoal} onChangeText={setCarbsGoal} placeholder="200" keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Input label={t("profile.fatG")} value={fatGoal} onChangeText={setFatGoal} placeholder="60" keyboardType="numeric" /></View>
              </View>

              {/* Water */}
              <View>
                <Input label={t("profile.dailyWaterGoal")} value={waterGoalMl} onChangeText={setWaterGoalMl} placeholder="2000" keyboardType="numeric" />
                {hasAnyIntake && !!waterGoalMl && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: intakeStatusColor(todayWaterConsumed, parseInt(waterGoalMl) || 0) ?? theme.border }} />
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      {todayWaterConsumed} / {waterGoalMl} ml
                    </Text>
                  </View>
                )}
              </View>
            </Card>
            
            <Button title={t("profile.saveProfile")} onPress={handleSave} loading={updateMutation.isPending} />
            
            <Pressable onPress={handleLogout} style={[styles.logoutBtn, { borderColor: theme.border }]}>
              <Feather name="log-out" size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 15 }}>{t("profile.signOut")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* ── Plan ── */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: subscriptionData?.upgradeAvailable ? 14 : 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.planIcon, { backgroundColor: subscriptionData?.plan?.key === "premium" ? "#448aff20" : theme.primaryDim }]}>
                    <Feather name="zap" size={18} color={subscriptionData?.plan?.key === "premium" ? "#448aff" : theme.primary} />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("profile.currentPlan")}</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {subscriptionData?.plan?.name ?? t("profile.free")} · {(subscriptionData?.subscription?.status ?? t("profile.active")).charAt(0).toUpperCase() + (subscriptionData?.subscription?.status ?? t("profile.active")).slice(1)}
                    </Text>
                  </View>
                </View>
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
              </View>

              {subscriptionData?.upgradeAvailable && (
                <Pressable
                  onPress={() => router.push("/subscription" as any)}
                  style={[styles.upgradeRow, { backgroundColor: "#448aff0d", borderColor: "#448aff35" }]}
                >
                  <Feather name="trending-up" size={16} color="#448aff" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#448aff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("profile.upgrade")}</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      {t("profile.premiumFeatures")}
                    </Text>
                  </View>
                  <Feather name={rtlIcon("chevron-right")} size={14} color="#448aff" />
                </Pressable>
              )}
            </Card>

            {/* ── Achievements ── */}
            <Pressable
              onPress={() => router.push("/achievements" as any)}
              style={[styles.achieveRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.achieveIcon, { backgroundColor: "#e040fb" + "18" }]}>
                <Feather name="award" size={18} color="#e040fb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("achievements.title")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>{t("profile.badgesStreaksRecords")}</Text>
              </View>
              <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
            </Pressable>

            {/* ── Recovery & Wellness ── */}
            <Pressable
              onPress={() => router.push("/recovery" as any)}
              style={[styles.achieveRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.achieveIcon, { backgroundColor: "#00bcd4" + "18" }]}>
                <Feather name="heart" size={18} color="#00bcd4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("profile.recoveryWellness")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>{t("profile.sleepEnergyStress")}</Text>
              </View>
              <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
            </Pressable>

            {/* ── Notifications ── */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: globalEnabled ? 16 : 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
                    { backgroundColor: globalEnabled ? theme.primaryDim : theme.card }]}>
                    <Feather name="bell" size={18} color={globalEnabled ? theme.primary : theme.textMuted} />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("profile.notifications")}</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {globalEnabled ? t("profile.allNotifications") : t("profile.allNotifications")}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={globalEnabled}
                  onValueChange={handleToggleGlobalNotifs}
                  trackColor={{ false: theme.border, true: theme.primary + "80" }}
                  thumbColor={globalEnabled ? theme.primary : theme.textMuted}
                />
              </View>

              {globalEnabled && NOTIF_TYPES.map((type, i) => {
                const meta = NOTIF_META[type];
                const pref = prefs[type];
                const isLast = i === NOTIF_TYPES.length - 1;
                const expanded = expandedNotifType === type;

                return (
                  <View
                    key={type}
                    style={[
                      { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
                      !isLast && { paddingBottom: 12 },
                    ]}
                  >
                    {/* Row: icon + label + toggle */}
                    <Pressable
                      onPress={() => setExpandedNotifType(expanded ? null : type)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                    >
                      <View style={[{ width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
                        { backgroundColor: pref.enabled ? meta.color + "20" : theme.card }]}>
                        <Feather name={meta.icon as any} size={15} color={pref.enabled ? meta.color : theme.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>{t(meta.labelKey)}</Text>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                          {pref.enabled ? t("profile.dailyAt", { time: fmtTime(pref.time) }) : t(meta.descriptionKey)}
                        </Text>
                      </View>
                      <Switch
                        value={pref.enabled}
                        onValueChange={(v) => handleToggleType(type, v)}
                        trackColor={{ false: theme.border, true: meta.color + "80" }}
                        thumbColor={pref.enabled ? meta.color : theme.textMuted}
                      />
                    </Pressable>

                    {/* Time picker (expanded) */}
                    {expanded && pref.enabled && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 8 }}>
                          {t("profile.reminderTime")}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {PRESET_TIMES.map((pt) => {
                              const sel = pref.time === pt;
                              return (
                                <Pressable
                                  key={pt}
                                  onPress={() => handleSetTime(type, pt)}
                                  style={[{
                                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                                    borderWidth: 1.5,
                                    backgroundColor: sel ? meta.color + "20" : "transparent",
                                    borderColor: sel ? meta.color : theme.border,
                                  }]}
                                >
                                  <Text style={{
                                    color: sel ? meta.color : theme.textMuted,
                                    fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular",
                                    fontSize: 12,
                                  }}>
                                    {fmtTime(pt)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            {/* Settings */}
            <Card>
              <SettingRow label={t("profile.darkMode")} icon="moon" theme={theme}>
                <Switch
                  value={isDark}
                  onValueChange={setDarkMode}
                  trackColor={{ false: theme.border, true: theme.primary + "80" }}
                  thumbColor={isDark ? theme.primary : theme.textMuted}
                />
              </SettingRow>
            </Card>
            
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.language")}</Text>
              <View style={styles.chipRow}>
                {[{ key: "en", label: t("profile.english") }, { key: "ar", label: t("profile.arabic") }].map(lng => (
                  <Pressable
                    key={lng.key}
                    onPress={() => {
                      if (lng.key !== language) {
                        Alert.alert(
                          t("profile.languageChangeTitle"),
                          t("profile.languageChangeMessage"),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            { text: t("profile.languageChangeConfirm"), onPress: () => changeLanguage(lng.key as "en" | "ar") },
                          ]
                        );
                      }
                    }}
                    style={[styles.chip, { backgroundColor: language === lng.key ? theme.primaryDim : "transparent", borderColor: language === lng.key ? theme.primary : theme.border, flex: 1 }]}
                  >
                    <Text style={{ color: language === lng.key ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                      {lng.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.unitSystem")}</Text>
              <View style={styles.chipRow}>
                {["metric", "imperial"].map(u => (
                  <Pressable
                    key={u}
                    onPress={() => setUnitSystem(u as any)}
                    style={[styles.chip, { backgroundColor: unitSystem === u ? theme.primaryDim : "transparent", borderColor: unitSystem === u ? theme.primary : theme.border, flex: 1 }]}
                  >
                    <Text style={{ color: unitSystem === u ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                      {u === "metric" ? t("profile.metric") : t("profile.imperial")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("profile.dangerZone")}</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/progress" as any)}
                style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              >
                <View style={styles.settingLeft}>
                  <Feather name="download" size={18} color={theme.secondary} />
                  <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 15 }}>{t("profile.exportData")}</Text>
                </View>
                <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
              </Pressable>
              
              <Pressable onPress={handleDeleteAccount} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Feather name="trash-2" size={18} color={theme.danger} />
                  <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 15 }}>{t("profile.deleteAccount")}</Text>
                </View>
                <Feather name={rtlIcon("chevron-right")} size={18} color={theme.textMuted} />
              </Pressable>
            </Card>
            
            <View style={styles.versionInfo}>
              <Text style={[styles.versionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("profile.appVersion", { version: "1.0.0" })}
              </Text>
            </View>
          </>
        )}
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
  tabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 4,
    borderRadius: 12, padding: 4, borderWidth: 1,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", minHeight: 44 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarLetter: { fontSize: 32 },
  userName: { fontSize: 20 },
  userEmail: { fontSize: 14 },
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
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, minHeight: 44 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  versionInfo: { alignItems: "center", paddingVertical: 8 },
  versionText: { fontSize: 13 },
  achieveRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  achieveIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  planIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  planBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  upgradeRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  soonBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: "#448aff20",
  },
});
