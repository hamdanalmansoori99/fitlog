import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

const TOTAL_STEPS = 5;

interface OnboardingData {
  age: string;
  heightCm: string;
  weightKg: string;
  fitnessGoal: string;
  activityLevel: string;
  availableEquipment: string[];
}

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

function ProgressBar({ step, total, theme }: { step: number; total: number; theme: any }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1, height: 4, borderRadius: 2,
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
        <Feather name={icon} size={18} color={selected ? theme.primary : theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: selected ? theme.primary : theme.text }}>
          {label}
        </Text>
        {desc ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
            {desc}
          </Text>
        ) : null}
      </View>
      {selected && <Feather name="check-circle" size={20} color={theme.primary} />}
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
      <Feather name={icon} size={14} color={selected ? theme.primary : theme.textMuted} />
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: selected ? theme.primary : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(350)} style={{ gap: 6, marginBottom: 28 }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: theme.text, lineHeight: 34 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: theme.textMuted, lineHeight: 22 }}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

function InputField({
  label, value, onChangeText, placeholder, keyboardType, theme,
}: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any; theme: any }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: theme.textMuted }}>{label}</Text>
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

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 24 : insets.top;

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    age: "",
    heightCm: "",
    weightKg: "",
    fitnessGoal: "",
    activityLevel: "",
    availableEquipment: [],
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setStep(4);
    },
  });

  const canProceed = () => {
    if (step === 0) return !!data.fitnessGoal;
    if (step === 1) return !!data.age.trim() && !!data.heightCm.trim() && !!data.weightKg.trim();
    if (step === 2) return !!data.activityLevel;
    if (step === 3) return true;
    return false;
  };

  const handleNext = () => {
    if (step === 3) {
      mutation.mutate({
        firstName: user?.firstName || "",
        age: parseInt(data.age, 10) || undefined,
        heightCm: parseFloat(data.heightCm) || undefined,
        weightKg: parseFloat(data.weightKg) || undefined,
        fitnessGoals: [data.fitnessGoal],
        activityLevel: data.activityLevel,
        availableEquipment: data.availableEquipment.length > 0 ? data.availableEquipment : ["none"],
        gender: undefined,
        workoutLocation: "Mixed",
        weeklyWorkoutDays: 3,
        preferredWorkoutDuration: "45",
        experienceLevel: "intermediate",
        coachOnboardingComplete: true,
        onboardingComplete: true,
      });
    } else if (step < 3) {
      setStep(step + 1);
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

  if (step === 4) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: theme.primary }]}>
            <Feather name="check" size={40} color="#0f0f1a" />
          </View>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 30, color: theme.text, textAlign: "center" }}>
            {t("onboarding.allSet")}
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 16, color: theme.textMuted, textAlign: "center", lineHeight: 24, maxWidth: 300 }}>
            {t("onboarding.allSetMessage")}
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: "#0f0f1a" }}>
              {t("onboarding.letsGo")}
            </Text>
            <Feather name="arrow-right" size={20} color="#0f0f1a" />
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
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 6 }}>
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

          {step === 0 && (
            <>
              <StepHeader title={t("onboarding.mainGoal")} subtitle={t("onboarding.goalSubtitle")} />
              <View style={{ gap: 12 }}>
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

          {step === 1 && (
            <>
              <StepHeader title={t("onboarding.bodyStats")} subtitle={t("onboarding.bodyStatsSubtitle")} />
              <View style={{ gap: 20 }}>
                <InputField
                  label={t("onboarding.age")}
                  value={data.age}
                  onChangeText={(v) => setData({ ...data, age: v })}
                  placeholder="25"
                  keyboardType="number-pad"
                  theme={theme}
                />
                <InputField
                  label={`${t("onboarding.height")} (cm)`}
                  value={data.heightCm}
                  onChangeText={(v) => setData({ ...data, heightCm: v })}
                  placeholder="175"
                  keyboardType="decimal-pad"
                  theme={theme}
                />
                <InputField
                  label={`${t("onboarding.weight")} (kg)`}
                  value={data.weightKg}
                  onChangeText={(v) => setData({ ...data, weightKg: v })}
                  placeholder="70"
                  keyboardType="decimal-pad"
                  theme={theme}
                />
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 }}>
                  {t("onboarding.bodyStatsSubtitle")}
                </Text>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader title={t("onboarding.howActive")} subtitle={t("onboarding.activeSubtitle")} />
              <View style={{ gap: 12 }}>
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

          {step === 3 && (
            <>
              <StepHeader title={t("onboarding.whatEquipment")} subtitle={t("onboarding.equipmentOptionalSubtitle")} />
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
        </Animated.View>
      </ScrollView>

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
            <Text style={styles.nextBtnText}>...</Text>
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === 3 ? t("onboarding.buildMyPlan") : t("common.continueText")}
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
  scroll: { paddingHorizontal: 24, paddingBottom: 140, paddingTop: 20 },
  selCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1.5, padding: 16,
  },
  selIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  equipChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1,
  },
  input: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 17,
  },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  nextBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#0f0f1a" },
  doneWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 20,
  },
  doneIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  doneBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 36, paddingVertical: 16, borderRadius: 16, marginTop: 12,
  },
});
