import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const EQUIPMENT_OPTIONS = [
  { id: "none", icon: "user" as const },
  { id: "dumbbells", icon: "zap" as const },
  { id: "barbell", icon: "minus" as const },
  { id: "bench", icon: "layout" as const },
  { id: "pullup_bar", icon: "chevrons-up" as const },
  { id: "resistance_bands", icon: "link" as const },
  { id: "cable_machine", icon: "anchor" as const },
  { id: "smith_machine", icon: "sliders" as const },
  { id: "leg_press", icon: "chevron-down" as const },
  { id: "treadmill", icon: "activity" as const },
  { id: "stationary_bike", icon: "wind" as const },
  { id: "yoga_mat", icon: "heart" as const },
];

const LOCATION_OPTIONS = [
  { id: "Home", icon: "home" as const },
  { id: "Gym", icon: "award" as const },
  { id: "Outdoors", icon: "sun" as const },
  { id: "Mixed", icon: "shuffle" as const },
];
const GOAL_OPTIONS = [
  { id: "Lose weight", icon: "trending-down" as const },
  { id: "Build muscle", icon: "zap" as const },
  { id: "Get stronger", icon: "shield" as const },
  { id: "Stay active", icon: "heart" as const },
  { id: "Improve endurance", icon: "wind" as const },
  { id: "Improve flexibility", icon: "maximize-2" as const },
];
const GOAL_KEY: Record<string, string> = {
  "Lose weight": "loseWeight", "Build muscle": "buildMuscle", "Get stronger": "getStronger",
  "Stay active": "stayActive", "Improve endurance": "improveEndurance", "Improve flexibility": "improveFlexibility",
};
const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const DURATION_OPTIONS = [
  { id: "15 minutes", icon: "clock" as const },
  { id: "30 minutes", icon: "clock" as const },
  { id: "45 minutes", icon: "clock" as const },
  { id: "60+ minutes", icon: "clock" as const },
];
const DURATION_KEY: Record<string, string> = {
  "15 minutes": "dur15", "30 minutes": "dur30", "45 minutes": "dur45", "60+ minutes": "dur60plus",
};
const EXPERIENCE_OPTIONS = [
  { id: "Beginner", icon: "star" as const },
  { id: "Intermediate", icon: "award" as const },
  { id: "Advanced", icon: "target" as const },
];
const TRAINING_PREF_OPTIONS = [
  { id: "Strength training", labelKey: "strengthTraining", icon: "zap" as const },
  { id: "Cardio", labelKey: "cardio", icon: "heart" as const },
  { id: "Running", labelKey: "running", icon: "navigation" as const },
  { id: "Walking", labelKey: "walking", icon: "map-pin" as const },
  { id: "Cycling", labelKey: "cycling", icon: "wind" as const },
  { id: "Swimming", labelKey: "swimming", icon: "droplet" as const },
  { id: "Stretching / mobility", labelKey: "stretchingMobility", icon: "minimize" as const },
  { id: "Calisthenics", labelKey: "calisthenics", icon: "user" as const },
  { id: "Other", labelKey: "otherActivity", icon: "activity" as const },
];

interface OnboardingData {
  availableEquipment: string[];
  workoutLocation: string;
  fitnessGoals: string[];
  weeklyWorkoutDays: number;
  preferredWorkoutDuration: string;
  experienceLevel: string;
  trainingPreferences: string[];
}

export default function WorkoutOnboardingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    availableEquipment: [],
    workoutLocation: "",
    fitnessGoals: [],
    weeklyWorkoutDays: 3,
    preferredWorkoutDuration: "45 minutes",
    experienceLevel: "",
    trainingPreferences: [],
  });

  const { data: existingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!existingProfile) return;
    setData(prev => ({
      availableEquipment: existingProfile.availableEquipment ?? prev.availableEquipment,
      workoutLocation: existingProfile.workoutLocation ?? prev.workoutLocation,
      fitnessGoals: existingProfile.fitnessGoals ?? prev.fitnessGoals,
      weeklyWorkoutDays: existingProfile.weeklyWorkoutDays ?? prev.weeklyWorkoutDays,
      preferredWorkoutDuration: existingProfile.preferredWorkoutDuration ?? prev.preferredWorkoutDuration,
      experienceLevel: existingProfile.experienceLevel ?? prev.experienceLevel,
      trainingPreferences: existingProfile.trainingPreferences ?? prev.trainingPreferences,
    }));
  }, [existingProfile]);

  const mutation = useMutation({
    mutationFn: (body: any) => api.updateProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.replace("/(tabs)/workouts" as any);
    },
  });

  const STEPS = [
    {
      title: t("workouts.whatEquipmentTitle"),
      subtitle: t("workouts.selectEverything"),
      key: "availableEquipment",
      type: "multiselect",
      options: EQUIPMENT_OPTIONS.map(e => ({ id: e.id, label: t(`equipment.${e.id}`), icon: e.icon })),
    },
    {
      title: t("workouts.whereWorkoutTitle"),
      subtitle: t("workouts.pickLocation"),
      key: "workoutLocation",
      type: "single",
      options: LOCATION_OPTIONS.map(l => ({ id: l.id, label: t(`onboarding.${l.id.toLowerCase()}`), icon: l.icon })),
    },
    {
      title: t("workouts.mainGoalTitle"),
      subtitle: t("workouts.updateAnytime"),
      key: "fitnessGoals",
      type: "multiselect",
      options: GOAL_OPTIONS.map(g => ({ id: g.id, label: t(`onboarding.${GOAL_KEY[g.id] || g.id}`), icon: g.icon })),
    },
    {
      title: t("workouts.howManyDaysTitle"),
      subtitle: t("workouts.buildAroundThis"),
      key: "weeklyWorkoutDays",
      type: "number",
      options: DAYS_OPTIONS.map(d => ({ id: String(d), label: `${d} ${d !== 1 ? t("home.streakDays") || "days" : t("home.streakDay") || "day"}`, icon: "calendar" as const })),
    },
    {
      title: t("workouts.howLongTitle"),
      subtitle: t("workouts.typicalSession"),
      key: "preferredWorkoutDuration",
      type: "single",
      options: DURATION_OPTIONS.map(d => ({ id: d.id, label: t(`workouts.${DURATION_KEY[d.id]}`), icon: d.icon })),
    },
    {
      title: t("workouts.experienceLevelTitle"),
      subtitle: t("workouts.beHonest"),
      key: "experienceLevel",
      type: "single",
      options: EXPERIENCE_OPTIONS.map(e => ({ id: e.id, label: t(`onboarding.${e.id.toLowerCase()}`), icon: e.icon })),
    },
    {
      title: t("workouts.whatTrainingTitle"),
      subtitle: t("workouts.prioritise"),
      key: "trainingPreferences",
      type: "multiselect",
      options: TRAINING_PREF_OPTIONS.map(tp => ({ id: tp.id, label: t(`workouts.${tp.labelKey}`), icon: tp.icon })),
    },
  ];

  const currentStep = STEPS[step];

  function getValue() {
    const val = (data as any)[currentStep.key];
    return val;
  }

  function setValue(val: any) {
    setData(d => ({ ...d, [currentStep.key]: val }));
  }

  function toggleMulti(id: string) {
    const current: string[] = getValue() || [];
    setValue(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }

  function setSingle(id: string) {
    setValue(id);
  }

  function canContinue() {
    const val = getValue();
    if (currentStep.type === "multiselect") return Array.isArray(val) && val.length > 0;
    if (currentStep.type === "number") return val > 0;
    return Boolean(val);
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      mutation.mutate({
        availableEquipment: data.availableEquipment,
        workoutLocation: data.workoutLocation,
        fitnessGoals: data.fitnessGoals,
        weeklyWorkoutDays: data.weeklyWorkoutDays,
        preferredWorkoutDuration: data.preferredWorkoutDuration,
        experienceLevel: data.experienceLevel,
        trainingPreferences: data.trainingPreferences,
        coachOnboardingComplete: true,
      });
    }
  }

  const progress = (step + 1) / STEPS.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        {step > 0 && (
          <Pressable onPress={() => setStep(s => s - 1)} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t("common.back") || "Go back"}>
            <Feather name={rtlIcon("arrow-left")} size={22} color={theme.text} />
          </Pressable>
        )}
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.stepCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {step + 1} / {STEPS.length}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20, maxWidth: 600, width: "100%", alignSelf: "center" as const }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInRight.duration(300)} key={step}>
          <View style={styles.questionHeader}>
            <Text style={[styles.questionTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {currentStep.title}
            </Text>
            <Text style={[styles.questionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {currentStep.subtitle}
            </Text>
          </View>

          <View style={[styles.optionsGrid, currentStep.type === "number" && { flexDirection: "row" as const, flexWrap: "wrap" as const }]}>
            {currentStep.options.map((opt: any) => {
              const val = getValue();
              const isSelected = currentStep.type === "multiselect"
                ? Array.isArray(val) && val.includes(opt.id)
                : currentStep.type === "number"
                  ? val === parseInt(opt.id)
                  : val === opt.id;

              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    if (currentStep.type === "multiselect") toggleMulti(opt.id);
                    else if (currentStep.type === "number") setValue(parseInt(opt.id));
                    else setSingle(opt.id);
                  }}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? theme.primary + "18" : theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    currentStep.type === "number" ? styles.numberChip : {},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.chipContent}>
                    {opt.icon && (
                      <Feather name={opt.icon} size={16} color={isSelected ? theme.primary : theme.textMuted} />
                    )}
                    <Text style={[
                      styles.optionLabel,
                      { color: isSelected ? theme.primary : theme.text, fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular" },
                    ]}>
                      {opt.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={step === STEPS.length - 1 ? t("workouts.getMyPlan") : t("common.continueText")}
          onPress={handleNext}
          disabled={!canContinue()}
          loading={mutation.isPending}
        />
        <Pressable onPress={handleNext} style={{ paddingVertical: 8, alignItems: "center", minHeight: 44 }} accessibilityRole="button" accessibilityLabel={step === STEPS.length - 1 ? t("workouts.getMyPlan") : t("workouts.skipForNow")}>
          <Text style={[styles.skipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {step === STEPS.length - 1 ? "" : t("workouts.skipForNow")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  stepCount: { fontSize: 12, minWidth: 36, textAlign: "right" as const },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  questionHeader: { marginBottom: 28 },
  questionTitle: { fontSize: 28, lineHeight: 36, marginBottom: 8 },
  questionSub: { fontSize: 15 },
  optionsGrid: { gap: 10 },
  optionChip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, minHeight: 44,
  },
  numberChip: { width: 60, justifyContent: "center", minWidth: 44 },
  optionLabel: { fontSize: 15 },
  chipContent: {
    flexDirection: "row", alignItems: "center", gap: 8, flex: 1,
  },
  checkBadge: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  footer: { paddingHorizontal: 20, gap: 4 },
  skipText: { fontSize: 14 },
});
