import React, { useState } from "react";
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
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";

const FITNESS_GOALS = ["Lose Weight", "Build Muscle", "Stay Active", "Improve Endurance", "Improve Flexibility"];
const ACTIVITY_LEVELS = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, clearAuth } = useAuthStore();
  const { darkMode, unitSystem, setDarkMode, setUnitSystem } = useSettingsStore();
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
  
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    onSuccess: (data: any) => {
      if (!profileLoaded) {
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setAge(data.age?.toString() || "");
        setGender(data.gender || "");
        setHeightCm(data.heightCm?.toString() || "");
        setWeightKg(data.weightKg?.toString() || "");
        setFitnessGoals(data.fitnessGoals || []);
        setActivityLevel(data.activityLevel || "");
        setCalorieGoal(data.dailyCalorieGoal?.toString() || "");
        setProteinGoal(data.dailyProteinGoal?.toString() || "");
        setCarbsGoal(data.dailyCarbsGoal?.toString() || "");
        setFatGoal(data.dailyFatGoal?.toString() || "");
        setProfileLoaded(true);
      }
    },
  } as any);
  
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
  
  const handleSave = () => {
    // Auto-calculate calorie goal if height/weight/age set
    let calculatedGoal = calorieGoal ? parseInt(calorieGoal) : undefined;
    if (!calculatedGoal && heightCm && weightKg && age) {
      const h = parseFloat(heightCm), w = parseFloat(weightKg), a = parseInt(age);
      // Mifflin-St Jeor (male default): 10*w + 6.25*h - 5*a + 5
      const bmr = 10 * w + 6.25 * h - 5 * a + 5;
      const actMults = { "Sedentary": 1.2, "Lightly Active": 1.375, "Moderately Active": 1.55, "Very Active": 1.725 };
      const mult = (actMults as any)[activityLevel] || 1.375;
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
            </Card>
            
            <Button title="Save Profile" onPress={handleSave} loading={updateMutation.isPending} />
            
            <Pressable onPress={handleLogout} style={[styles.logoutBtn, { borderColor: theme.border }]}>
              <Feather name="log-out" size={18} color={theme.danger} />
              <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 15 }}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
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
});
