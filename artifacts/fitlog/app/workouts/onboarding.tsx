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
  { id: "none", label: "Bodyweight only", icon: "user" as const },
  { id: "dumbbells", label: "Dumbbells", icon: "zap" as const },
  { id: "barbell", label: "Barbell", icon: "minus" as const },
  { id: "bench", label: "Bench", icon: "layout" as const },
  { id: "pullup_bar", label: "Pull-up bar", icon: "chevrons-up" as const },
  { id: "resistance_bands", label: "Resistance bands", icon: "link" as const },
  { id: "kettlebells", label: "Kettlebells", icon: "disc" as const },
  { id: "cable_machine", label: "Cable machine", icon: "anchor" as const },
  { id: "smith_machine", label: "Smith machine", icon: "sliders" as const },
  { id: "leg_press", label: "Leg press", icon: "chevron-down" as const },
  { id: "treadmill", label: "Treadmill", icon: "activity" as const },
  { id: "stationary_bike", label: "Stationary bike", icon: "wind" as const },
  { id: "rowing_machine", label: "Rowing machine", icon: "navigation" as const },
  { id: "yoga_mat", label: "Yoga mat", icon: "heart" as const },
  { id: "jump_rope", label: "Jump rope", icon: "repeat" as const },
  { id: "tennis_racket", label: "Tennis racket", icon: "circle" as const },
  { id: "swimming_pool", label: "Swimming pool", icon: "droplet" as const },
];

const LOCATION_OPTIONS = ["Home", "Gym", "Outdoors", "Mixed"];
const GOAL_OPTIONS = [
  "Lose weight", "Build muscle", "Get stronger",
  "Stay active", "Improve endurance", "Improve flexibility",
];
const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const DURATION_OPTIONS = ["15 minutes", "30 minutes", "45 minutes", "60+ minutes"];
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const TRAINING_PREF_OPTIONS = [
  { id: "Strength training", label: "Strength training", icon: "zap" as const },
  { id: "Cardio", label: "Cardio", icon: "heart" as const },
  { id: "Running", label: "Running", icon: "navigation" as const },
  { id: "Walking", label: "Walking", icon: "map-pin" as const },
  { id: "Cycling", label: "Cycling", icon: "wind" as const },
  { id: "Swimming", label: "Swimming", icon: "droplet" as const },
  { id: "Stretching / mobility", label: "Stretching / mobility", icon: "minimize" as const },
  { id: "Calisthenics", label: "Calisthenics", icon: "user" as const },
  { id: "Other", label: "Other", icon: "activity" as const },
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
      options: LOCATION_OPTIONS.map(l => ({ id: l, label: l })),
    },
    {
      title: t("workouts.mainGoalTitle"),
      subtitle: t("workouts.updateAnytime"),
      key: "fitnessGoals",
      type: "multiselect",
      options: GOAL_OPTIONS.map(g => ({ id: g, label: g })),
    },
    {
      title: t("workouts.howManyDaysTitle"),
      subtitle: t("workouts.buildAroundThis"),
      key: "weeklyWorkoutDays",
      type: "number",
      options: DAYS_OPTIONS.map(d => ({ id: String(d), label: `${d} day${d !== 1 ? "s" : ""}` })),
    },
    {
      title: t("workouts.howLongTitle"),
      subtitle: t("workouts.typicalSession"),
      key: "preferredWorkoutDuration",
      type: "single",
      options: DURATION_OPTIONS.map(d => ({ id: d, label: d })),
    },
    {
      title: t("workouts.experienceLevelTitle"),
      subtitle: t("workouts.beHonest"),
      key: "experienceLevel",
      type: "single",
      options: EXPERIENCE_OPTIONS.map(e => ({ id: e, label: e })),
    },
    {
      title: t("workouts.whatTrainingTitle"),
      subtitle: t("workouts.prioritise"),
      key: "trainingPreferences",
      type: "multiselect",
      options: TRAINING_PREF_OPTIONS.map(tp => ({ id: tp.id, label: tp.label, icon: tp.icon })),
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
          <Pressable onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
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

          <View style={styles.optionsGrid}>
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
        <Pressable onPress={handleNext} style={{ paddingVertical: 8, alignItems: "center" }}>
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
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  stepCount: { fontSize: 12, minWidth: 36, textAlign: "right" },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  questionHeader: { marginBottom: 28 },
  questionTitle: { fontSize: 28, lineHeight: 36, marginBottom: 8 },
  questionSub: { fontSize: 15 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5,
  },
  numberChip: { width: "30%", justifyContent: "center" },
  optionLabel: { fontSize: 14 },
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
