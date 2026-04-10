import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

const TOTAL_STEPS = 6;

interface OnboardingData {
  age: string;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  fitnessGoal: string;
  activityLevel: string;
  availableEquipment: string[];
}

function calcBMI(heightCm: number, weightKg: number): number {
  return weightKg / Math.pow(heightCm / 100, 2);
}

function calcMacros(data: OnboardingData) {
  const weight = parseFloat(data.weightKg) || 70;
  const height = parseFloat(data.heightCm) || 170;
  const age = parseInt(data.age, 10) || 25;
  // Mifflin-St Jeor (using male formula as default; could be enhanced with gender field)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const actMultipliers: Record<string, number> = {
    sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
    very_active: 1.725, extra_active: 1.9,
  };
  const tdee = bmr * (actMultipliers[data.activityLevel] || 1.55);
  // Goal adjustment
  let calories: number;
  let proteinPerKg: number;
  if (data.fitnessGoal === "Lose weight") {
    calories = tdee - 500;
    proteinPerKg = 1.8;
  } else if (data.fitnessGoal === "Build muscle" || data.fitnessGoal === "Get stronger") {
    calories = tdee + 300;
    proteinPerKg = 2.0;
  } else {
    calories = tdee;
    proteinPerKg = 1.6;
  }
  calories = Math.round(Math.max(calories, 1200));
  const protein = Math.round(proteinPerKg * weight);
  const fatCals = calories * 0.25;
  const fat = Math.round(fatCals / 9);
  const carbCals = calories - (protein * 4) - fatCals;
  const carbs = Math.round(Math.max(carbCals / 4, 50));
  return { calories, protein, carbs, fat };
}

function bmiCategory(bmi: number): { label: string; color: string; motivation: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "#4fc3f7", motivation: "Focus on building strength and healthy habits." };
  if (bmi < 25)   return { label: "Normal weight", color: "#00e676", motivation: "Great foundation! Keep up the healthy lifestyle." };
  if (bmi < 30)   return { label: "Overweight", color: "#ffab40", motivation: "Consistent training and nutrition will get you there." };
  return            { label: "Obese", color: "#ef5350", motivation: "Every workout counts. You're already taking the right steps." };
}

const FITNESS_GOALS = [
  { id: "Lose weight", icon: "trending-down" as const, labelKey: "loseWeight", descKey: "loseWeightDesc" },
  { id: "Build muscle", icon: "zap" as const, labelKey: "buildMuscle", descKey: "buildMuscleDesc" },
  { id: "Get stronger", icon: "anchor" as const, labelKey: "getStronger", descKey: "getStrongerDesc" },
  { id: "Stay active", icon: "heart" as const, labelKey: "stayActive", descKey: "stayActiveDesc" },
  { id: "Improve endurance", icon: "wind" as const, labelKey: "improveEndurance", descKey: "improveEnduranceDesc" },
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
      <View style={{
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: selected ? theme.primary + "30" : theme.border + "40",
        alignItems: "center", justifyContent: "center",
      }}>
        <Feather name={icon} size={14} color={selected ? theme.primary : theme.textMuted} />
      </View>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: selected ? theme.primary : theme.text, flex: 1 }}>
        {label}
      </Text>
      {selected && <Feather name="check" size={14} color={theme.primary} />}
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    age: "",
    heightCm: "",
    weightKg: "",
    waistCm: "",
    fitnessGoal: "",
    activityLevel: "",
    availableEquipment: [],
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSubmitError(null);
      setStep(5);
    },
    onError: (err: any) => {
      setSubmitError(err?.message || "Something went wrong. Please try again.");
    },
  });

  const canProceed = () => {
    if (step === 0) return !!data.fitnessGoal;
    if (step === 1) return !!data.age.trim() && !!data.heightCm.trim() && !!data.weightKg.trim();
    if (step === 2) return !!data.activityLevel;
    if (step === 3) return true;
    if (step === 4) return true; // waist is optional
    return false;
  };

  const handleNext = () => {
    setSubmitError(null);
    if (step === 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mutation.mutate({
        age: parseInt(data.age, 10) || undefined,
        heightCm: parseFloat(data.heightCm) || undefined,
        weightKg: parseFloat(data.weightKg) || undefined,
        waistCm: data.waistCm ? parseFloat(data.waistCm) : undefined,
        fitnessGoals: [data.fitnessGoal],
        activityLevel: data.activityLevel,
        availableEquipment: data.availableEquipment.length > 0 ? data.availableEquipment : ["none"],
        workoutLocation: "Mixed",
        weeklyWorkoutDays: 3,
        preferredWorkoutDuration: "45",
        experienceLevel: "intermediate",
        coachOnboardingComplete: true,
        onboardingComplete: true,
      });
    } else if (step < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  if (step === 5) {
    const macros = calcMacros(data);
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
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

          {/* Daily Targets Card */}
          <View style={{
            width: "100%", backgroundColor: theme.card, borderRadius: 16,
            borderWidth: 1, borderColor: theme.border, padding: 20, marginTop: 8,
          }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: theme.text, textAlign: "center", marginBottom: 16 }}>
              {t("onboarding.summaryTitle")}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              {[
                { value: macros.calories, label: "kcal", color: theme.primary },
                { value: `${macros.protein}g`, label: t("onboarding.protein"), color: "#42a5f5" },
                { value: `${macros.carbs}g`, label: t("onboarding.carbs"), color: "#ffab40" },
                { value: `${macros.fat}g`, label: t("onboarding.fat"), color: "#ef5350" },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: item.color }}>
                    {item.value}
                  </Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted, textAlign: "center", marginTop: 14, lineHeight: 18 }}>
              {t("onboarding.summaryNote")}
            </Text>
          </View>

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
        </ScrollView>
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                {EQUIPMENT_OPTIONS.map((eqOpt) => (
                  <EquipChip
                    key={eqOpt.id}
                    selected={data.availableEquipment.includes(eqOpt.id)}
                    onPress={() => toggleEquip(eqOpt.id)}
                    icon={eqOpt.icon}
                    label={t(`onboarding.${eqOpt.labelKey}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </>
          )}

          {step === 4 && (() => {
            const h = parseFloat(data.heightCm);
            const w = parseFloat(data.weightKg);
            const hasBMI = h > 0 && w > 0;
            const bmi = hasBMI ? calcBMI(h, w) : null;
            const cat = bmi !== null ? bmiCategory(bmi) : null;
            return (
              <>
                <StepHeader title={t("onboarding.yourBodyStats")} subtitle={t("onboarding.bodyStatsSummary")} />
                {hasBMI && bmi !== null && cat !== null ? (
                  <View style={{ gap: 16 }}>
                    {/* BMI card */}
                    <View style={[styles.bmiCard, { backgroundColor: theme.card, borderColor: cat.color + "40" }]}>
                      <View style={[styles.bmiStrip, { backgroundColor: cat.color }]} />
                      <View style={{ flex: 1, padding: 16, gap: 6 }}>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                          {t("onboarding.bodyMassIndex")}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                          <Text style={{ color: cat.color, fontFamily: "Inter_700Bold", fontSize: 40 }}>
                            {bmi.toFixed(1)}
                          </Text>
                          <View style={[styles.catBadge, { backgroundColor: cat.color + "20" }]}>
                            <Text style={{ color: cat.color, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                              {cat.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
                          {cat.motivation}
                        </Text>
                      </View>
                    </View>

                    {/* Height/Weight summary chips */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Feather name="arrow-up" size={14} color={theme.textMuted} />
                        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{data.heightCm} cm</Text>
                      </View>
                      <View style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Feather name="activity" size={14} color={theme.textMuted} />
                        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{data.weightKg} kg</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ padding: 16, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                      {t("onboarding.bmiNotCalculated")}
                    </Text>
                  </View>
                )}

                {/* Optional waist */}
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: theme.text }}>
                      {t("onboarding.waistSize")}
                    </Text>
                    <View style={{ backgroundColor: theme.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 11 }}>{t("common.optional")}</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
                    {t("onboarding.waistDesc")}
                  </Text>
                  <InputField
                    label={t("onboarding.waistLabel")}
                    value={data.waistCm}
                    onChangeText={(v) => setData({ ...data, waistCm: v })}
                    placeholder="e.g. 85"
                    keyboardType="decimal-pad"
                    theme={theme}
                  />
                </View>
              </>
            );
          })()}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {submitError && (
          <View style={[styles.errorBanner, { backgroundColor: "#b71c1c20", borderColor: "#ef5350" }]}>
            <Feather name="alert-circle" size={14} color="#ef5350" />
            <Text style={{ color: "#ef5350", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
              {submitError}
            </Text>
          </View>
        )}
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
            <>
              <Text style={styles.nextBtnText}>{t("onboarding.buildMyPlan")}</Text>
              <Text style={styles.nextBtnText}> ...</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === 4 ? t("onboarding.buildMyPlan") : t("common.continueText")}
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
    flexDirection: "row", alignItems: "center", gap: 10,
    width: "48%" as any,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  input: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 17,
  },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
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
  bmiCard: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden",
  },
  bmiStrip: { width: 4 },
  catBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
  },
  statChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
});
