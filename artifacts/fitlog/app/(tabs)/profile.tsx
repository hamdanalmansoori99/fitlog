import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
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
import { Toast } from "@/components/ui/Toast";

const PRESET_TIMES = [
  "06:00","07:00","07:30","08:00","08:30","09:00","10:00","11:00",
  "12:00","12:30","13:00","14:00","15:00","16:00","17:00","18:00",
  "19:00","20:00","21:00","22:00",
];

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, "0")}${ampm}`;
}

const FITNESS_GOALS = ["Lose Weight", "Build Muscle", "Stay Active", "Improve Endurance", "Improve Flexibility"];
const ACTIVITY_LEVELS = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, clearAuth } = useAuthStore();
  const { darkMode, unitSystem, setDarkMode, setUnitSystem } = useSettingsStore();
  const { globalEnabled, prefs, setGlobalEnabled, setEnabled, setTime } = useNotificationStore();
  const [expandedNotifType, setExpandedNotifType] = useState<NotifType | null>(null);
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  
  const [tab, setTab] = useState<"profile" | "settings">("profile");
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });
  
  // Profile fields
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
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

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  useEffect(() => {
    if (profile && !profileLoaded) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      setHeightCm(profile.heightCm?.toString() || "");
      setWeightKg(profile.weightKg?.toString() || "");
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
      setToast({ visible: true, message: "Profile updated!", type: "success" });
    },
    onError: () => setToast({ visible: true, message: "Failed to update profile", type: "error" }),
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
          "Permission required",
          "Please enable notifications in your device settings to use this feature.",
          [{ text: "OK" }]
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

  const handleSave = () => {
    // Auto-calculate calorie goal if height/weight/age set
    let calculatedGoal = calorieGoal ? parseInt(calorieGoal) : undefined;
    if (!calculatedGoal && heightCm && weightKg && age) {
      const h = parseFloat(heightCm), w = parseFloat(weightKg), a = parseInt(age);
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
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
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
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
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
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Profile</Text>
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          onPress={() => setTab("profile")}
          style={[styles.tab, { backgroundColor: tab === "profile" ? theme.primary : "transparent" }]}
        >
          <Text style={{ color: tab === "profile" ? "#0f0f1a" : theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("settings")}
          style={[styles.tab, { backgroundColor: tab === "settings" ? theme.primary : "transparent" }]}
        >
          <Text style={{ color: tab === "settings" ? "#0f0f1a" : theme.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
            Settings
          </Text>
        </Pressable>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + bottomPad, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "profile" ? (
          <>
            {/* Avatar section */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatar, { backgroundColor: theme.primaryDim, borderColor: theme.primary }]}>
                <Text style={[styles.avatarLetter, { color: theme.primary, fontFamily: "Inter_700Bold" }]}>
                  {firstName[0] || user?.firstName?.[0] || "U"}
                </Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Personal Info</Text>
              <View style={styles.fieldGroup}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="First Name" value={firstName} onChangeText={setFirstName} placeholder="John" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Doe" />
                  </View>
                </View>
                <Input label="Age" value={age} onChangeText={setAge} placeholder="28" keyboardType="numeric" />
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Gender</Text>
                  <View style={styles.chipRow}>
                    {["Male", "Female", "Other"].map(g => (
                      <Pressable
                        key={g}
                        onPress={() => setGender(gender === g ? "" : g)}
                        style={[styles.chip, { backgroundColor: gender === g ? theme.primaryDim : "transparent", borderColor: gender === g ? theme.primary : theme.border }]}
                      >
                        <Text style={{ color: gender === g ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="Height (cm)" value={heightCm} onChangeText={setHeightCm} placeholder="175" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} placeholder="75" keyboardType="numeric" />
                  </View>
                </View>
              </View>
            </Card>
            
            {/* Fitness Goals */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Fitness Goals</Text>
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
                      {goal}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            
            {/* Activity Level */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Activity Level</Text>
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
                    {level}
                  </Text>
                </Pressable>
              ))}
            </Card>
            
            {/* Nutrition Targets */}
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Daily Targets</Text>
              <Input label="Calorie Goal (auto-calc if blank)" value={calorieGoal} onChangeText={setCalorieGoal} placeholder="2000" keyboardType="numeric" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Input label="Protein (g)" value={proteinGoal} onChangeText={setProteinGoal} placeholder="150" keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Input label="Carbs (g)" value={carbsGoal} onChangeText={setCarbsGoal} placeholder="200" keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Input label="Fat (g)" value={fatGoal} onChangeText={setFatGoal} placeholder="60" keyboardType="numeric" /></View>
              </View>
              <Input label="Daily Water Goal (ml)" value={waterGoalMl} onChangeText={setWaterGoalMl} placeholder="2000" keyboardType="numeric" />
            </Card>
            
            <Button title="Save Profile" onPress={handleSave} loading={updateMutation.isPending} />
            
            <Pressable onPress={handleLogout} style={[styles.logoutBtn, { borderColor: theme.border }]}>
              <Feather name="log-out" size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 15 }}>Sign Out</Text>
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
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Current Plan</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {subscriptionData?.plan?.name ?? "Free"} · {(subscriptionData?.subscription?.status ?? "active").charAt(0).toUpperCase() + (subscriptionData?.subscription?.status ?? "active").slice(1)}
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
                <Pressable style={[styles.upgradeRow, { backgroundColor: "#448aff0d", borderColor: "#448aff35" }]}>
                  <Feather name="trending-up" size={16} color="#448aff" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#448aff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Upgrade to Premium</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                      Photo analysis · Unlimited plans · Advanced analytics
                    </Text>
                  </View>
                  <View style={styles.soonBadge}>
                    <Text style={{ color: "#448aff", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>Soon</Text>
                  </View>
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
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Achievements</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>Badges, streaks &amp; personal records</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
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
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Notifications</Text>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {globalEnabled ? "Smart reminders on" : "All reminders off"}
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
                        <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>{meta.label}</Text>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                          {pref.enabled ? `Daily at ${fmtTime(pref.time)}` : meta.description}
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
                          Reminder time
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {PRESET_TIMES.map((t) => {
                              const sel = pref.time === t;
                              return (
                                <Pressable
                                  key={t}
                                  onPress={() => handleSetTime(type, t)}
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
                                    {fmtTime(t)}
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
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Appearance</Text>
              <SettingRow label="Dark Mode" icon="moon" theme={theme}>
                <Switch
                  value={isDark}
                  onValueChange={setDarkMode}
                  trackColor={{ false: theme.border, true: theme.primary + "80" }}
                  thumbColor={isDark ? theme.primary : theme.textMuted}
                />
              </SettingRow>
            </Card>
            
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Units</Text>
              <View style={styles.chipRow}>
                {["metric", "imperial"].map(u => (
                  <Pressable
                    key={u}
                    onPress={() => setUnitSystem(u as any)}
                    style={[styles.chip, { backgroundColor: unitSystem === u ? theme.primaryDim : "transparent", borderColor: unitSystem === u ? theme.primary : theme.border, flex: 1 }]}
                  >
                    <Text style={{ color: unitSystem === u ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Account</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/progress" as any)}
                style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              >
                <View style={styles.settingLeft}>
                  <Feather name="download" size={18} color={theme.secondary} />
                  <Text style={{ color: theme.text, fontFamily: "Inter_400Regular", fontSize: 15 }}>Export Data</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textMuted} />
              </Pressable>
              
              <Pressable onPress={handleDeleteAccount} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Feather name="trash-2" size={18} color={theme.danger} />
                  <Text style={{ color: theme.danger, fontFamily: "Inter_400Regular", fontSize: 15 }}>Delete Account</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textMuted} />
              </Pressable>
            </Card>
            
            <View style={styles.versionInfo}>
              <Text style={[styles.versionText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                FitLog v1.0.0
              </Text>
            </View>
          </>
        )}
      </ScrollView>
      
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
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
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: 32 },
  userName: { fontSize: 20 },
  userEmail: { fontSize: 14 },
  sectionTitle: { fontSize: 15, marginBottom: 12 },
  fieldGroup: { gap: 12 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
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
