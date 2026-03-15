import React, { useState, useRef } from "react";
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
import { Button } from "@/components/ui/Button";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingData {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  fitnessGoal: string;
  activityLevel: string;
  availableEquipment: string[];
  workoutLocation: string;
  weeklyWorkoutDays: number;
  preferredWorkoutDuration: string;
  experienceLevel: string;
}

// ─── Options ──────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const FITNESS_GOALS = [
  { id: "Lose weight", icon: "trending-down" as const, desc: "Burn fat, get leaner" },
  { id: "Build muscle", icon: "zap" as const, desc: "Grow stronger, bigger" },
  { id: "Get stronger", icon: "anchor" as const, desc: "Improve raw strength" },
  { id: "Stay active", icon: "heart" as const, desc: "Move more, feel better" },
  { id: "Improve endurance", icon: "wind" as const, desc: "Run further, longer" },
  { id: "Improve flexibility", icon: "rotate-cw" as const, desc: "Stretch and recover" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Little or no exercise", icon: "monitor" as const },
  { id: "lightly_active", label: "Lightly active", desc: "Light exercise 1–3 days/week", icon: "coffee" as const },
  { id: "moderately_active", label: "Moderately active", desc: "Moderate exercise 3–5 days/week", icon: "activity" as const },
  { id: "very_active", label: "Very active", desc: "Hard exercise 6–7 days/week", icon: "zap" as const },
  { id: "extra_active", label: "Extra active", desc: "Very hard exercise or physical job", icon: "award" as const },
];

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

const LOCATION_OPTIONS = [
  { id: "Home", label: "Home", icon: "home" as const, desc: "I train at home" },
  { id: "Gym", label: "Gym", icon: "award" as const, desc: "I have a gym membership" },
  { id: "Outdoors", label: "Outdoors", icon: "sun" as const, desc: "Parks, tracks, trails" },
  { id: "Mixed", label: "Mixed", icon: "shuffle" as const, desc: "I switch it up" },
];

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const DURATION_OPTIONS = [
  { id: "15 minutes", label: "15 min", sub: "Quick sessions" },
  { id: "30 minutes", label: "30 min", sub: "Half hour" },
  { id: "45 minutes", label: "45 min", sub: "Standard session" },
  { id: "60+ minutes", label: "60+ min", sub: "Long sessions" },
];

const EXPERIENCE_OPTIONS = [
  { id: "Beginner", label: "Beginner", desc: "New to structured training", icon: "star" as const },
  { id: "Intermediate", label: "Intermediate", desc: "Training 6–24 months", icon: "star" as const },
  { id: "Advanced", label: "Advanced", desc: "Training 2+ years seriously", icon: "star" as const },
];

// ─── Helper components ────────────────────────────────────────────────────────
function OptionCard({
  selected, onPress, children, style,
}: { selected: boolean; onPress: () => void; children: React.ReactNode; style?: any }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionCard,
        { backgroundColor: selected ? theme.primaryDim : theme.card, borderColor: selected ? theme.primary : theme.border },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stepHeader}>
      <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{title}</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
    </View>
  );
}

function NumberInput({
  label, value, onChange, suffix, placeholder, keyboardType = "numeric",
}: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; placeholder: string; keyboardType?: "numeric" | "decimal-pad";
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.numInputWrap}>
      <Text style={[styles.numInputLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <View style={[styles.numInputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType={keyboardType}
          style={[styles.numInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
        />
        {suffix && <Text style={[styles.numSuffix, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{suffix}</Text>}
      </View>
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
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<"welcome" | "steps" | "complete">("welcome");
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [data, setData] = useState<OnboardingData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    age: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    fitnessGoal: "",
    activityLevel: "",
    availableEquipment: [],
    workoutLocation: "",
    weeklyWorkoutDays: 3,
    preferredWorkoutDuration: "45 minutes",
    experienceLevel: "",
  });

  const set = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) =>
    setData(d => ({ ...d, [key]: value }));

  const toggleEquipment = (id: string) => {
    const current = data.availableEquipment;
    if (id === "none") {
      set("availableEquipment", current.includes("none") ? [] : ["none"]);
    } else {
      const withoutNone = current.filter(e => e !== "none");
      set("availableEquipment", withoutNone.includes(id) ? withoutNone.filter(e => e !== id) : [...withoutNone, id]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        age: parseInt(data.age) || null,
        gender: data.gender,
        heightCm: parseFloat(data.heightCm) || null,
        weightKg: parseFloat(data.weightKg) || null,
        fitnessGoals: data.fitnessGoal ? [data.fitnessGoal] : [],
        activityLevel: data.activityLevel,
        availableEquipment: data.availableEquipment,
        workoutLocation: data.workoutLocation,
        weeklyWorkoutDays: data.weeklyWorkoutDays,
        preferredWorkoutDuration: data.preferredWorkoutDuration,
        experienceLevel: data.experienceLevel,
        onboardingComplete: true,
        coachOnboardingComplete: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setPhase("complete");
    },
  });

  const TOTAL_STEPS = 9;

  function canAdvance(): boolean {
    switch (step) {
      case 0: return data.firstName.trim().length > 0;
      case 1: return data.age.trim().length > 0 && parseInt(data.age) >= 10 && parseInt(data.age) <= 120;
      case 2: return data.heightCm.trim().length > 0 && data.weightKg.trim().length > 0;
      case 3: return data.fitnessGoal.length > 0;
      case 4: return data.activityLevel.length > 0;
      case 5: return data.availableEquipment.length > 0;
      case 6: return data.workoutLocation.length > 0;
      case 7: return data.weeklyWorkoutDays > 0 && data.preferredWorkoutDuration.length > 0;
      case 8: return data.experienceLevel.length > 0;
      default: return false;
    }
  }

  function handleNext() {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      saveMutation.mutate();
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
  }

  const progress = (step + 1) / TOTAL_STEPS;

  const genderLabels: Record<string, string> = {
    "Male": t("onboarding.male"),
    "Female": t("onboarding.female"),
    "Other": t("onboarding.other"),
    "Prefer not to say": t("onboarding.preferNotToSay"),
  };

  const fitnessGoalLabels: Record<string, { label: string; desc: string }> = {
    "Lose weight": { label: t("onboarding.loseWeight"), desc: t("onboarding.loseWeightDesc") },
    "Build muscle": { label: t("onboarding.buildMuscle"), desc: t("onboarding.buildMuscleDesc") },
    "Get stronger": { label: t("onboarding.getStronger"), desc: t("onboarding.getStrongerDesc") },
    "Stay active": { label: t("onboarding.stayActive"), desc: t("onboarding.stayActiveDesc") },
    "Improve endurance": { label: t("onboarding.improveEndurance"), desc: t("onboarding.improveEnduranceDesc") },
    "Improve flexibility": { label: t("onboarding.improveFlexibility"), desc: t("onboarding.improveFlexibilityDesc") },
  };

  const activityLevelLabels: Record<string, { label: string; desc: string }> = {
    "sedentary": { label: t("onboarding.sedentary"), desc: t("onboarding.sedentaryDesc") },
    "lightly_active": { label: t("onboarding.lightlyActive"), desc: t("onboarding.lightlyActiveDesc") },
    "moderately_active": { label: t("onboarding.moderatelyActive"), desc: t("onboarding.moderatelyActiveDesc") },
    "very_active": { label: t("onboarding.veryActive"), desc: t("onboarding.veryActiveDesc") },
    "extra_active": { label: t("onboarding.extraActive"), desc: t("onboarding.extraActiveDesc") },
  };

  const equipmentLabels: Record<string, string> = {
    "none": t("onboarding.bodyweightOnly"),
    "dumbbells": t("onboarding.dumbbells"),
    "barbell": t("onboarding.barbell"),
    "bench": t("onboarding.bench"),
    "pullup_bar": t("onboarding.pullUpBar"),
    "resistance_bands": t("onboarding.resistanceBands"),
    "kettlebells": t("onboarding.kettlebells"),
    "cable_machine": t("onboarding.cableMachine"),
    "smith_machine": t("onboarding.smithMachine"),
    "leg_press": t("onboarding.legPress"),
    "treadmill": t("onboarding.treadmill"),
    "stationary_bike": t("onboarding.stationaryBike"),
    "rowing_machine": t("onboarding.rowingMachine"),
    "yoga_mat": t("onboarding.yogaMat"),
    "jump_rope": t("onboarding.jumpRope"),
    "tennis_racket": t("onboarding.tennisRacket"),
    "swimming_pool": t("onboarding.swimmingPool"),
  };

  const locationLabels: Record<string, { label: string; desc: string }> = {
    "Home": { label: t("onboarding.home"), desc: t("onboarding.homeDesc") },
    "Gym": { label: t("onboarding.gym"), desc: t("onboarding.gymDesc") },
    "Outdoors": { label: t("onboarding.outdoors"), desc: t("onboarding.outdoorsDesc") },
    "Mixed": { label: t("onboarding.mixed"), desc: t("onboarding.mixedDesc") },
  };

  const durationLabels: Record<string, { label: string; sub: string }> = {
    "15 minutes": { label: t("onboarding.fifteenMin"), sub: t("onboarding.quickSessions") },
    "30 minutes": { label: t("onboarding.thirtyMin"), sub: t("onboarding.halfHour") },
    "45 minutes": { label: t("onboarding.fortyFiveMin"), sub: t("onboarding.standardSession") },
    "60+ minutes": { label: t("onboarding.sixtyPlusMin"), sub: t("onboarding.longSessions") },
  };

  const experienceLabels: Record<string, { label: string; desc: string }> = {
    "Beginner": { label: t("onboarding.beginner"), desc: t("onboarding.beginnerDesc") },
    "Intermediate": { label: t("onboarding.intermediate"), desc: t("onboarding.intermediateDesc") },
    "Advanced": { label: t("onboarding.advanced"), desc: t("onboarding.advancedDesc") },
  };

  const renderStep = () => {
    switch (step) {

      // ── Step 0: Name ─────────────────────────────────────────────────────
      case 0:
        return (
          <>
            <StepHeader title={t("onboarding.whatsYourName")} subtitle={t("onboarding.nameSubtitle")} />
            <View style={styles.inputGroup}>
              <View style={[styles.textInputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.textInputLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("onboarding.firstNameRequired")}</Text>
                <TextInput
                  value={data.firstName}
                  onChangeText={v => set("firstName", v)}
                  placeholder="e.g. Alex"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  style={[styles.textInputField, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                />
              </View>
              <View style={[styles.textInputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.textInputLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{t("onboarding.lastNameOptional")}</Text>
                <TextInput
                  value={data.lastName}
                  onChangeText={v => set("lastName", v)}
                  placeholder="e.g. Smith"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  style={[styles.textInputField, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                />
              </View>
            </View>
          </>
        );

      // ── Step 1: Age + Gender ──────────────────────────────────────────────
      case 1:
        return (
          <>
            <StepHeader title={t("onboarding.howOld")} subtitle={t("onboarding.ageSubtitle")} />
            <NumberInput
              label={t("onboarding.age")}
              value={data.age}
              onChange={v => set("age", v.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 28"
              suffix={t("onboarding.years")}
            />
            <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {t("onboarding.genderOptional")}
            </Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map(g => (
                <Pressable
                  key={g}
                  onPress={() => set("gender", data.gender === g ? "" : g)}
                  style={[
                    styles.chip,
                    { backgroundColor: data.gender === g ? theme.primaryDim : theme.card, borderColor: data.gender === g ? theme.primary : theme.border },
                  ]}
                >
                  {data.gender === g && <Feather name="check" size={13} color={theme.primary} />}
                  <Text style={[styles.chipText, { color: data.gender === g ? theme.primary : theme.text, fontFamily: data.gender === g ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {genderLabels[g] || g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );

      // ── Step 2: Height + Weight ───────────────────────────────────────────
      case 2:
        return (
          <>
            <StepHeader title={t("onboarding.bodyStats")} subtitle={t("onboarding.bodyStatsSubtitle")} />
            <View style={styles.inputGroup}>
              <NumberInput
                label={t("onboarding.height")}
                value={data.heightCm}
                onChange={v => set("heightCm", v)}
                placeholder="e.g. 175"
                suffix="cm"
                keyboardType="decimal-pad"
              />
              <NumberInput
                label={t("onboarding.weight")}
                value={data.weightKg}
                onChange={v => set("weightKg", v)}
                placeholder="e.g. 75"
                suffix="kg"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      // ── Step 3: Fitness goal ─────────────────────────────────────────────
      case 3:
        return (
          <>
            <StepHeader title={t("onboarding.mainGoal")} subtitle={t("onboarding.goalSubtitle")} />
            <View style={styles.goalGrid}>
              {FITNESS_GOALS.map(g => {
                const selected = data.fitnessGoal === g.id;
                return (
                  <OptionCard key={g.id} selected={selected} onPress={() => set("fitnessGoal", g.id)} style={styles.goalCard}>
                    <View style={[styles.goalIcon, { backgroundColor: selected ? theme.primary + "30" : theme.cardAlt }]}>
                      <Feather name={g.icon} size={22} color={selected ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[styles.goalLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {fitnessGoalLabels[g.id]?.label || g.id}
                    </Text>
                    <Text style={[styles.goalDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {fitnessGoalLabels[g.id]?.desc || g.desc}
                    </Text>
                  </OptionCard>
                );
              })}
            </View>
          </>
        );

      // ── Step 4: Activity level ────────────────────────────────────────────
      case 4:
        return (
          <>
            <StepHeader title={t("onboarding.howActive")} subtitle={t("onboarding.activeSubtitle")} />
            <View style={styles.listStack}>
              {ACTIVITY_LEVELS.map(a => {
                const selected = data.activityLevel === a.id;
                return (
                  <OptionCard key={a.id} selected={selected} onPress={() => set("activityLevel", a.id)} style={styles.listCard}>
                    <View style={[styles.listIcon, { backgroundColor: selected ? theme.primary + "30" : theme.cardAlt }]}>
                      <Feather name={a.icon} size={18} color={selected ? theme.primary : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {activityLevelLabels[a.id]?.label || a.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {activityLevelLabels[a.id]?.desc || a.desc}
                      </Text>
                    </View>
                    {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
                  </OptionCard>
                );
              })}
            </View>
          </>
        );

      // ── Step 5: Equipment ─────────────────────────────────────────────────
      case 5:
        return (
          <>
            <StepHeader title={t("onboarding.whatEquipment")} subtitle={t("onboarding.equipmentSubtitle")} />
            <View style={styles.chipGrid}>
              {EQUIPMENT_OPTIONS.map(eq => {
                const selected = data.availableEquipment.includes(eq.id);
                return (
                  <Pressable
                    key={eq.id}
                    onPress={() => toggleEquipment(eq.id)}
                    style={[
                      styles.equipChip,
                      { backgroundColor: selected ? theme.primaryDim : theme.card, borderColor: selected ? theme.primary : theme.border },
                    ]}
                  >
                    <Feather name={eq.icon} size={14} color={selected ? theme.primary : theme.textMuted} />
                    <Text style={[styles.equipLabel, { color: selected ? theme.primary : theme.text, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {equipmentLabels[eq.id] || eq.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );

      // ── Step 6: Location ──────────────────────────────────────────────────
      case 6:
        return (
          <>
            <StepHeader title={t("onboarding.whereWorkout")} subtitle={t("onboarding.whereSubtitle")} />
            <View style={styles.listStack}>
              {LOCATION_OPTIONS.map(l => {
                const selected = data.workoutLocation === l.id;
                return (
                  <OptionCard key={l.id} selected={selected} onPress={() => set("workoutLocation", l.id)} style={styles.listCard}>
                    <View style={[styles.listIcon, { backgroundColor: selected ? theme.primary + "30" : theme.cardAlt }]}>
                      <Feather name={l.icon} size={18} color={selected ? theme.primary : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {locationLabels[l.id]?.label || l.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {locationLabels[l.id]?.desc || l.desc}
                      </Text>
                    </View>
                    {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
                  </OptionCard>
                );
              })}
            </View>
          </>
        );

      // ── Step 7: Schedule ──────────────────────────────────────────────────
      case 7:
        return (
          <>
            <StepHeader title={t("onboarding.trainingSchedule")} subtitle={t("onboarding.scheduleSubtitle")} />

            <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {t("onboarding.daysPerWeek")}
            </Text>
            <View style={styles.daysRow}>
              {DAYS_OPTIONS.map(d => {
                const selected = data.weeklyWorkoutDays === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => set("weeklyWorkoutDays", d)}
                    style={[
                      styles.dayBtn,
                      { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border },
                    ]}
                  >
                    <Text style={[styles.dayBtnText, { color: selected ? "#0f0f1a" : theme.text, fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular" }]}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium", marginTop: 24 }]}>
              {t("onboarding.sessionLength")}
            </Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map(dur => {
                const selected = data.preferredWorkoutDuration === dur.id;
                return (
                  <Pressable
                    key={dur.id}
                    onPress={() => set("preferredWorkoutDuration", dur.id)}
                    style={[
                      styles.durationCard,
                      { backgroundColor: selected ? theme.primaryDim : theme.card, borderColor: selected ? theme.primary : theme.border },
                    ]}
                  >
                    <Text style={[styles.durationLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_700Bold" }]}>
                      {durationLabels[dur.id]?.label || dur.label}
                    </Text>
                    <Text style={[styles.durationSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {durationLabels[dur.id]?.sub || dur.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );

      // ── Step 8: Experience ────────────────────────────────────────────────
      case 8:
        return (
          <>
            <StepHeader title={t("onboarding.experienceLevel")} subtitle={t("onboarding.experienceSubtitle")} />
            <View style={styles.listStack}>
              {EXPERIENCE_OPTIONS.map((e, idx) => {
                const selected = data.experienceLevel === e.id;
                const filledStars = idx + 1;
                return (
                  <OptionCard key={e.id} selected={selected} onPress={() => set("experienceLevel", e.id)} style={styles.listCard}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3].map(s => (
                        <Feather key={s} name="star" size={14} color={s <= filledStars ? (selected ? theme.primary : theme.warning) : theme.border} />
                      ))}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {experienceLabels[e.id]?.label || e.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {experienceLabels[e.id]?.desc || e.desc}
                      </Text>
                    </View>
                    {selected && <Feather name="check-circle" size={18} color={theme.primary} />}
                  </OptionCard>
                );
              })}
            </View>
          </>
        );

      default:
        return null;
    }
  };

  // ── Welcome phase ───────────────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View entering={FadeIn.duration(500)} style={[styles.welcomeContainer, { paddingTop: topPad + 40, paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.welcomeLogo, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "40" }]}>
            <Feather name="activity" size={42} color={theme.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {t("onboarding.welcomeTitle")}
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t("onboarding.welcomeDescription")}
          </Text>

          <View style={styles.welcomeFeatures}>
            {[
              { icon: "zap" as const, label: t("onboarding.aiWorkoutPlans") },
              { icon: "pie-chart" as const, label: t("onboarding.nutritionTracking") },
              { icon: "trending-up" as const, label: t("onboarding.progressInsightsGoals") },
            ].map(f => (
              <View key={f.label} style={styles.welcomeFeatureRow}>
                <View style={[styles.welcomeFeatureIcon, { backgroundColor: theme.primaryDim }]}>
                  <Feather name={f.icon} size={16} color={theme.primary} />
                </View>
                <Text style={{ color: theme.text, fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 }}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Button title={t("onboarding.letsGetStarted")} onPress={() => setPhase("steps")} style={{ marginTop: 8 }} />
        </Animated.View>
      </View>
    );
  }

  // ── Completion phase ─────────────────────────────────────────────────────────
  if (phase === "complete") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={[styles.welcomeContainer, { paddingTop: topPad + 40, paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.completeCircle, { backgroundColor: theme.primaryDim }]}>
            <Feather name="check" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {t("onboarding.allSet")}{data.firstName ? `, ${data.firstName}` : ""}!
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {t("onboarding.allSetMessage")}
          </Text>
          <Button title={t("onboarding.goToMyDashboard")} onPress={() => router.replace("/(tabs)")} style={{ marginTop: 16 }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        {step > 0 ? (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setPhase("welcome")} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </Pressable>
        )}

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
          </View>
          <Text style={[styles.stepCount, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {step + 1} / {TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View key={step} entering={FadeInRight.duration(280)}>
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12, borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <Button
          title={step === TOTAL_STEPS - 1 ? t("onboarding.buildMyPlan") : t("common.continueText")}
          onPress={handleNext}
          disabled={!canAdvance()}
          loading={saveMutation.isPending}
        />
        {step < TOTAL_STEPS - 1 && step > 0 && (
          <Pressable onPress={handleNext} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("onboarding.skipThisStep")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Welcome / Completion shared
  welcomeContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 28, gap: 16,
  },
  welcomeLogo: {
    width: 88, height: 88, borderRadius: 28,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  welcomeTitle: { fontSize: 28, textAlign: "center", lineHeight: 36 },
  welcomeSub: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 320 },
  welcomeFeatures: { gap: 12, width: "100%", marginTop: 8 },
  welcomeFeatureRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 4,
  },
  welcomeFeatureIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  completeCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },

  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  progressWrap: { flex: 1, gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  stepCount: { fontSize: 12, textAlign: "right" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },

  // Step header
  stepHeader: { gap: 8, marginBottom: 8 },
  stepTitle: { fontSize: 28, lineHeight: 36 },
  stepSubtitle: { fontSize: 15, lineHeight: 22 },

  // Number / text inputs
  inputGroup: { gap: 16 },
  numInputWrap: { gap: 8 },
  numInputLabel: { fontSize: 13 },
  numInputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
  },
  numInput: { flex: 1, fontSize: 18 },
  numSuffix: { fontSize: 15, marginLeft: 8 },
  textInputWrap: {
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, gap: 4,
  },
  textInputLabel: { fontSize: 12 },
  textInputField: { fontSize: 18 },

  // Group labels
  groupLabel: { fontSize: 13, marginBottom: 4 },

  // Chip row (gender)
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  chipText: { fontSize: 14 },

  // Goal grid (2 columns)
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  goalCard: { width: "47%", borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 10 },
  goalIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goalLabel: { fontSize: 14 },
  goalDesc: { fontSize: 12, lineHeight: 16 },

  // Option card base
  optionCard: { borderRadius: 14, borderWidth: 1.5 },

  // List stack (full-width cards)
  listStack: { gap: 10 },
  listCard: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  listIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  listLabel: { fontSize: 15, marginBottom: 2 },
  listDesc: { fontSize: 12 },
  starsRow: { flexDirection: "row", gap: 2 },

  // Equipment chips
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipChip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  equipLabel: { fontSize: 13 },

  // Days row
  daysRow: { flexDirection: "row", gap: 8 },
  dayBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  dayBtnText: { fontSize: 16 },

  // Duration grid
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  durationCard: {
    width: "47%", padding: 16, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 4,
  },
  durationLabel: { fontSize: 20 },
  durationSub: { fontSize: 12 },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, gap: 4, borderTopWidth: 1,
  },
  skipBtn: { paddingVertical: 8, alignItems: "center" },
  skipText: { fontSize: 14 },
});
