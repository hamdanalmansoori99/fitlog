import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
      router.replace("/(tabs)");
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

  const renderStep = () => {
    switch (step) {

      // ── Step 0: Name ─────────────────────────────────────────────────────
      case 0:
        return (
          <>
            <StepHeader title="What's your name?" subtitle="We'll use this to personalise your experience." />
            <View style={styles.inputGroup}>
              <View style={[styles.textInputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.textInputLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>First name *</Text>
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
                <Text style={[styles.textInputLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Last name (optional)</Text>
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
            <StepHeader title="How old are you?" subtitle="Used to calculate your recommended targets." />
            <NumberInput
              label="Age"
              value={data.age}
              onChange={v => set("age", v.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 28"
              suffix="years"
            />
            <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Gender (optional)
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
                    {g}
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
            <StepHeader title="Your body stats" subtitle="Used to personalise your calorie and macro targets." />
            <View style={styles.inputGroup}>
              <NumberInput
                label="Height"
                value={data.heightCm}
                onChange={v => set("heightCm", v)}
                placeholder="e.g. 175"
                suffix="cm"
                keyboardType="decimal-pad"
              />
              <NumberInput
                label="Weight"
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
            <StepHeader title="What's your main goal?" subtitle="We'll tailor your workouts and nutrition to match." />
            <View style={styles.goalGrid}>
              {FITNESS_GOALS.map(g => {
                const selected = data.fitnessGoal === g.id;
                return (
                  <OptionCard key={g.id} selected={selected} onPress={() => set("fitnessGoal", g.id)} style={styles.goalCard}>
                    <View style={[styles.goalIcon, { backgroundColor: selected ? theme.primary + "30" : theme.cardAlt }]}>
                      <Feather name={g.icon} size={22} color={selected ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[styles.goalLabel, { color: selected ? theme.primary : theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {g.id}
                    </Text>
                    <Text style={[styles.goalDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {g.desc}
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
            <StepHeader title="How active are you now?" subtitle="Be honest — this affects your calorie recommendations." />
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
                        {a.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {a.desc}
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
            <StepHeader title="What equipment do you have?" subtitle="Select everything available to you." />
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
                      {eq.label}
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
            <StepHeader title="Where do you work out?" subtitle="This helps us suggest the right workouts." />
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
                        {l.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {l.desc}
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
            <StepHeader title="Your training schedule" subtitle="How often and how long do you want to train?" />

            <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Days per week
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
              Session length
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
                      {dur.label}
                    </Text>
                    <Text style={[styles.durationSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {dur.sub}
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
            <StepHeader title="Experience level" subtitle="Be honest — we'll adjust everything accordingly." />
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
                        {e.label}
                      </Text>
                      <Text style={[styles.listDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {e.desc}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        {step > 0 ? (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
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
          title={step === TOTAL_STEPS - 1 ? "Build my plan" : "Continue"}
          onPress={handleNext}
          disabled={!canAdvance()}
          loading={saveMutation.isPending}
        />
        {step < TOTAL_STEPS - 1 && step > 0 && (
          <Pressable onPress={handleNext} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Skip this step
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
