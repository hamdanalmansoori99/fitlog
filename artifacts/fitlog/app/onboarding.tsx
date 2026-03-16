import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Platform, KeyboardAvoidingView, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "react-i18next";

const TOTAL_STEPS = 5;
const SCREEN_W = Dimensions.get("window").width;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  firstName: string;
  age: string;
  heightCm: string;
  weightKg: string;
  fitnessGoal: string;
  activityLevel: string;
  availableEquipment: string[];
  weeklyWorkoutDays: number;
  preferredWorkoutDuration: string;
  experienceLevel: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

const FITNESS_GOALS = [
  { id: "Lose weight", icon: "trending-down" as const, labelKey: "loseWeight", descKey: "loseWeightDesc" },
  { id: "Build muscle", icon: "zap" as const, labelKey: "buildMuscle", descKey: "buildMuscleDesc" },
  { id: "Get stronger", icon: "anchor" as const, labelKey: "getStronger", descKey: "getStrongerDesc" },
  { id: "Stay active", icon: "heart" as const, labelKey: "stayActive", descKey: "stayActiveDesc" },
  { id: "Improve endurance", icon: "wind" as const, labelKey: "improveEndurance", descKey: "improveEnduranceDesc" },
  { id: "Improve flexibility", icon: "rotate-cw" as const, labelKey: "improveFlexibility", descKey: "improveFlexibilityDesc" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", icon: "monitor" as const, labelKey: "sedentary", descKey: "sedentaryDesc" },
  { id: "lightly_active", icon: "coffee" as const, labelKey: "lightlyActive", descKey: "lightlyActiveDesc" },
  { id: "moderately_active", icon: "activity" as const, labelKey: "moderatelyActive", descKey: "moderatelyActiveDesc" },
  { id: "very_active", icon: "zap" as const, labelKey: "veryActive", descKey: "veryActiveDesc" },
  { id: "extra_active", icon: "award" as const, labelKey: "extraActive", descKey: "extraActiveDesc" },
];

const EQUIPMENT_OPTIONS = [
  { id: "none", icon: "user" as const, labelKey: "bodyweightOnly" },
  { id: "dumbbells", icon: "zap" as const, labelKey: "dumbbells" },
  { id: "barbell", icon: "minus" as const, labelKey: "barbell" },
  { id: "bench", icon: "layout" as const, labelKey: "bench" },
  { id: "pullup_bar", icon: "chevrons-up" as const, labelKey: "pullUpBar" },
  { id: "resistance_bands", icon: "link" as const, labelKey: "resistanceBands" },
  { id: "kettlebells", icon: "disc" as const, labelKey: "kettlebells" },
  { id: "cable_machine", icon: "anchor" as const, labelKey: "cableMachine" },
  { id: "smith_machine", icon: "sliders" as const, labelKey: "smithMachine" },
  { id: "leg_press", icon: "chevron-down" as const, labelKey: "legPress" },
  { id: "treadmill", icon: "activity" as const, labelKey: "treadmill" },
  { id: "stationary_bike", icon: "wind" as const, labelKey: "stationaryBike" },
  { id: "rowing_machine", icon: "navigation" as const, labelKey: "rowingMachine" },
  { id: "yoga_mat", icon: "heart" as const, labelKey: "yogaMat" },
  { id: "jump_rope", icon: "repeat" as const, labelKey: "jumpRope" },
];

const EXPERIENCE_OPTIONS = [
  { id: "Beginner", icon: "star" as const, labelKey: "beginner", descKey: "beginnerDesc" },
  { id: "Intermediate", icon: "zap" as const, labelKey: "intermediate", descKey: "intermediateDesc" },
  { id: "Advanced", icon: "award" as const, labelKey: "advanced", descKey: "advancedDesc" },
];

const DURATION_OPTIONS = [
  { id: "15 minutes", labelKey: "fifteenMin", subKey: "quickSessions" },
  { id: "30 minutes", labelKey: "thirtyMin", subKey: "halfHour" },
  { id: "45 minutes", labelKey: "fortyFiveMin", subKey: "standardSession" },
  { id: "60+ minutes", labelKey: "sixtyPlusMin", subKey: "longSessions" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step, total, theme }: { step: number; total: number; theme: any }) {
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= step ? theme.primary : theme.border,
          }}
        />
      ))}
    </View>
  );
}

function SelectCard({
  selected, onPress, icon, label, desc, theme,
}: { selected: boolean; onPress: () => void; icon: any; label: string; desc?: string; theme: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.selCard,
        {
          backgroundColor: selected ? theme.primary + "15" : theme.card,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <View style={[styles.selIcon, { backgroundColor: selected ? theme.primary + "25" : theme.border + "60" }]}>
        <Feather name={icon} size={17} color={selected ? theme.primary : theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: selected ? theme.primary : theme.text }}>
          {label}
        </Text>
        {desc ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted, marginTop: 1 }}>
            {desc}
          </Text>
        ) : null}
      </View>
      {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
    </Pressable>
  );
}

function EquipChip({
  selected, onPress, icon, label, theme,
}: { selected: boolean; onPress: () => void; icon: any; label: string; theme: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.equipChip,
        {
          backgroundColor: selected ? theme.primary + "18" : theme.card,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Feather name={icon} size={13} color={selected ? theme.primary : theme.textMuted} />
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: selected ? theme.primary : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(350)} style={{ gap: 4, marginBottom: 24 }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 26, color: theme.text }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: theme.textMuted, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

function InputField({
  label, value, onChangeText, placeholder, keyboardType, theme,
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any; theme: any }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: theme.textMuted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text, fontFamily: "Inter_400Regular" }]}
      />
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 24 : insets.top;

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    firstName: user?.firstName || "",
    age: "",
    heightCm: "",
    weightKg: "",
    fitnessGoal: "",
    activityLevel: "",
    availableEquipment: [],
    weeklyWorkoutDays: 3,
    preferredWorkoutDuration: "45 minutes",
    experienceLevel: "",
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setDone(true);
    },
  });

  const canProceed = () => {
    if (step === 0) return !!data.fitnessGoal;
    if (step === 1) return !!data.firstName.trim() && !!data.age.trim() && !!data.heightCm.trim() && !!data.weightKg.trim();
    if (step === 2) return !!data.activityLevel;
    if (step === 3) return data.availableEquipment.length > 0;
    if (step === 4) return !!data.experienceLevel;
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      mutation.mutate({
        firstName: data.firstName.trim(),
        age: parseInt(data.age, 10) || undefined,
        heightCm: parseFloat(data.heightCm) || undefined,
        weightKg: parseFloat(data.weightKg) || undefined,
        fitnessGoals: [data.fitnessGoal],
        activityLevel: data.activityLevel,
        availableEquipment: data.availableEquipment,
        workoutLocation: "Mixed",
        weeklyWorkoutDays: data.weeklyWorkoutDays,
        preferredWorkoutDuration: data.preferredWorkoutDuration,
        experienceLevel: data.experienceLevel,
        coachOnboardingComplete: true,
      });
    }
  };

  const toggleEquip = (id: string) => {
    setData((d) => {
      if (id === "none") return { ...d, availableEquipment: ["none"] };
      const filtered = d.availableEquipment.filter((e) => e !== "none");
      const exists = filtered.includes(id);
      return {
        ...d,
        availableEquipment: exists ? filtered.filter((e) => e !== id) : [...filtered, id],
      };
    });
  };

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: theme.primary }]}>
            <Feather name="check" size={36} color="#0f0f1a" />
          </View>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: theme.text, textAlign: "center" }}>
            {t("onboarding.allSet")}
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 16, color: theme.textMuted, textAlign: "center", lineHeight: 24, maxWidth: 280 }}>
            {t("onboarding.allSetMessage")}
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: "#0f0f1a" }}>
              {t("onboarding.goToMyDashboard")}
            </Text>
            <Feather name="arrow-right" size={18} color="#0f0f1a" />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} style={[styles.backBtn, { backgroundColor: theme.card }]} hitSlop={8}>
            <Feather name="arrow-left" size={20} color={theme.text} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <ProgressBar step={step} total={TOTAL_STEPS} theme={theme} />
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 5 }}>
            {step + 1} / {TOTAL_STEPS}
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          hitSlop={8}
        >
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            {t("onboarding.skipThisStep")}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll]}
      >
        <Animated.View key={step} entering={FadeInRight.duration(300)}>

          {/* ── STEP 0: GOAL ── */}
          {step === 0 && (
            <>
              <StepHeader title={t("onboarding.mainGoal")} subtitle={t("onboarding.goalSubtitle")} />
              <View style={{ gap: 10 }}>
                {FITNESS_GOALS.map((g) => (
                  <SelectCard
                    key={g.id}
                    selected={data.fitnessGoal === g.id}
                    onPress={() => setData({ ...data, fitnessGoal: g.id })}
                    icon={g.icon}
                    label={t(`onboarding.${g.labelKey}`)}
                    desc={t(`onboarding.${g.descKey}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── STEP 1: BODY STATS ── */}
          {step === 1 && (
            <>
              <StepHeader title={t("onboarding.bodyStats")} subtitle={t("onboarding.bodyStatsSubtitle")} />
              <View style={{ gap: 16 }}>
                <InputField
                  label={t("onboarding.firstNameRequired")}
                  value={data.firstName}
                  onChangeText={(v) => setData({ ...data, firstName: v })}
                  placeholder="e.g. Alex"
                  theme={theme}
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label={t("onboarding.age")}
                      value={data.age}
                      onChangeText={(v) => setData({ ...data, age: v })}
                      placeholder="25"
                      keyboardType="number-pad"
                      theme={theme}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label={`${t("onboarding.height")} (cm)`}
                      value={data.heightCm}
                      onChangeText={(v) => setData({ ...data, heightCm: v })}
                      placeholder="175"
                      keyboardType="decimal-pad"
                      theme={theme}
                    />
                  </View>
                </View>
                <InputField
                  label={`${t("onboarding.weight")} (kg)`}
                  value={data.weightKg}
                  onChangeText={(v) => setData({ ...data, weightKg: v })}
                  placeholder="70"
                  keyboardType="decimal-pad"
                  theme={theme}
                />
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }}>
                  {t("onboarding.bodyStatsSubtitle")}
                </Text>
              </View>
            </>
          )}

          {/* ── STEP 2: ACTIVITY LEVEL ── */}
          {step === 2 && (
            <>
              <StepHeader title={t("onboarding.howActive")} subtitle={t("onboarding.activeSubtitle")} />
              <View style={{ gap: 10 }}>
                {ACTIVITY_LEVELS.map((a) => (
                  <SelectCard
                    key={a.id}
                    selected={data.activityLevel === a.id}
                    onPress={() => setData({ ...data, activityLevel: a.id })}
                    icon={a.icon}
                    label={t(`onboarding.${a.labelKey}`)}
                    desc={t(`onboarding.${a.descKey}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── STEP 3: EQUIPMENT ── */}
          {step === 3 && (
            <>
              <StepHeader title={t("onboarding.whatEquipment")} subtitle={t("onboarding.equipmentSubtitle")} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <EquipChip
                    key={eq.id}
                    selected={data.availableEquipment.includes(eq.id)}
                    onPress={() => toggleEquip(eq.id)}
                    icon={eq.icon}
                    label={t(`onboarding.${eq.labelKey}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── STEP 4: EXPERIENCE + SCHEDULE ── */}
          {step === 4 && (
            <>
              <StepHeader title={t("onboarding.experienceLevel")} subtitle={t("onboarding.experienceSubtitle")} />
              <View style={{ gap: 10, marginBottom: 28 }}>
                {EXPERIENCE_OPTIONS.map((e) => (
                  <SelectCard
                    key={e.id}
                    selected={data.experienceLevel === e.id}
                    onPress={() => setData({ ...data, experienceLevel: e.id })}
                    icon={e.icon}
                    label={t(`onboarding.${e.labelKey}`)}
                    desc={t(`onboarding.${e.descKey}`)}
                    theme={theme}
                  />
                ))}
              </View>

              {/* Schedule section */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 17, color: theme.text, marginBottom: 6 }}>
                {t("onboarding.trainingSchedule")}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: theme.textMuted, marginBottom: 16, lineHeight: 20 }}>
                {t("onboarding.scheduleSubtitle")}
              </Text>

              {/* Days per week */}
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                {t("onboarding.daysPerWeek")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setData({ ...data, weeklyWorkoutDays: d })}
                    style={[
                      styles.dayBtn,
                      {
                        backgroundColor: data.weeklyWorkoutDays === d ? theme.primary : theme.card,
                        borderColor: data.weeklyWorkoutDays === d ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={{
                      fontFamily: "Inter_700Bold", fontSize: 14,
                      color: data.weeklyWorkoutDays === d ? "#0f0f1a" : theme.text,
                    }}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Session length */}
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                {t("onboarding.sessionLength")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {DURATION_OPTIONS.map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => setData({ ...data, preferredWorkoutDuration: d.id })}
                    style={[
                      styles.durationBtn,
                      {
                        backgroundColor: data.preferredWorkoutDuration === d.id ? theme.primary + "15" : theme.card,
                        borderColor: data.preferredWorkoutDuration === d.id ? theme.primary : theme.border,
                        width: (SCREEN_W - 60) / 2,
                      },
                    ]}
                  >
                    <Text style={{
                      fontFamily: "Inter_700Bold", fontSize: 18,
                      color: data.preferredWorkoutDuration === d.id ? theme.primary : theme.text,
                    }}>
                      {t(`onboarding.${d.labelKey}`)}
                    </Text>
                    <Text style={{
                      fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted,
                    }}>
                      {t(`onboarding.${d.subKey}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleNext}
          disabled={!canProceed() || mutation.isPending}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: canProceed() ? theme.primary : theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {mutation.isPending ? (
            <Text style={styles.nextBtnText}>…</Text>
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step < TOTAL_STEPS - 1 ? t("common.continueText") : t("onboarding.buildMyPlan")}
              </Text>
              <Feather name="arrow-right" size={18} color="#0f0f1a" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 120, paddingTop: 16 },
  selCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1.5, padding: 14,
  },
  selIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  equipChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  input: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  dayBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  durationBtn: {
    padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 2,
  },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 16,
  },
  nextBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#0f0f1a" },
  doneWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 20,
  },
  doneIcon: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  doneBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 32, paddingVertical: 15, borderRadius: 16, marginTop: 8,
  },
});
