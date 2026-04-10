import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, SlideInRight, ZoomIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { getTemplateById } from "@/lib/workoutTemplates";
import { getFilteredExercises, getActivityBenefits, getEquipmentMatchLevel } from "@/lib/coachEngine";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SuccessView } from "@/components/SuccessView";
import { calculateStrengthTarget } from "@/lib/progressionEngine";
import { ProgressionCard } from "@/components/ProgressionCard";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    Beginner: theme.primary,
    Intermediate: theme.secondary,
    Advanced: theme.danger,
  };
  const color = colors[difficulty] || theme.primary;
  const label = t(`workouts.plan.difficulty.${difficulty}`, { defaultValue: difficulty });
  return (
    <View style={[styles.badge, { backgroundColor: color + "20", borderColor: color }]}>
      <Text style={[styles.badgeText, { color, fontFamily: "Inter_500Medium" }]}>{label}</Text>
    </View>
  );
}

const BENEFIT_KEYS: Record<string, string> = {
  "Builds foundational strength": "buildsFoundationalStrength",
  "Improves coordination and balance": "improvesCoordinationBalance",
  "No equipment required": "noEquipmentRequired",
  "Scalable as you progress": "scalableAsYouProgress",
  "Builds strength and muscle": "buildsStrengthMuscle",
  "Improves bone density": "improvesBoneDensity",
  "Boosts resting metabolism": "boostsRestingMetabolism",
  "Supports long-term body composition": "supportsBodyComposition",
  "Builds cardiovascular endurance": "buildsCardioEndurance",
  "Burns significant calories": "burnsSignificantCalories",
  "Strengthens the heart and lungs": "strengthensHeartLungs",
  "Improves mental health and mood": "improvesMentalHealth",
  "Improves flexibility and range of motion": "improvesFlexibility",
  "Supports muscle recovery": "supportsMuscleRecovery",
  "Reduces stress and improves sleep": "reducesStress",
  "Improves mobility and balance": "improvesMobilityBalance",
  "Full-body conditioning": "fullBodyConditioning",
  "Zero joint impact": "zeroJointImpact",
  "Builds lung capacity": "buildsLungCapacity",
  "Excellent for recovery": "excellentForRecovery",
  "Effective cardiovascular workout": "effectiveCardioWorkout",
  "Lower joint impact than running": "lowerJointImpact",
  "Improves leg endurance and power": "improvesLegEndurance",
  "Great calorie burner": "greatCalorieBurner",
  "Improves agility and reaction speed": "improvesAgility",
  "Great aerobic workout": "greatAerobicWorkout",
  "Develops hand-eye coordination": "handEyeCoordination",
  "Fun and social": "funAndSocial",
  "Improves cardiovascular health": "improvesCardioHealth",
  "Supports sustainable fat loss": "supportsFatLoss",
  "Low impact — easy on joints": "lowImpactEasyOnJoints",
  "Great for active recovery": "greatForActiveRecovery",
};

function BenefitRow({ benefit, index }: { benefit: string; index: number }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const key = BENEFIT_KEYS[benefit];
  const label = key ? t(`workouts.template.benefits.${key}`, { defaultValue: benefit }) : benefit;
  const tip = key ? t(`workouts.template.tips.${key}`, { defaultValue: "" }) : "";

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <Pressable
        onPress={() => tip && setExpanded(!expanded)}
        style={[styles.benefitRow, { borderBottomColor: theme.border }]}
      >
        <View style={[styles.benefitDot, { backgroundColor: theme.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.benefitText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{label}</Text>
          {expanded && tip && (
            <Animated.Text
              entering={FadeIn.duration(250)}
              style={[styles.benefitTip, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
            >
              {tip}
            </Animated.Text>
          )}
        </View>
        {tip && (
          <Feather
            name={expanded ? "chevron-up" : "info"}
            size={14}
            color={expanded ? theme.primary : theme.textMuted}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function WorkoutTemplateScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, whyGoodForYou } = useLocalSearchParams<{ id: string; whyGoodForYou?: string }>();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const template = id ? getTemplateById(id) : undefined;
  const [saved, setSaved] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const { data: workoutsData } = useQuery({
    queryKey: ["workouts", { limit: 30 }],
    queryFn: () => api.getWorkouts({ limit: 30 }),
  });

  const userEquipment: string[] = profile?.availableEquipment || [];
  const benefits = getActivityBenefits(template?.activityType || "gym");
  const filteredExercises = template ? getFilteredExercises(template, userEquipment) : [];
  const { level: equipMatch, missing: missingEquip } = template
    ? getEquipmentMatchLevel(template, userEquipment)
    : { level: "full" as const, missing: [] as string[] };

  const isGymTemplate = template?.activityType === "gym";
  const gymExerciseNames = useMemo(
    () => isGymTemplate ? filteredExercises.map((e) => e.name).filter(Boolean) : [],
    [isGymTemplate, filteredExercises]
  );
  const { data: exerciseHistoryData } = useQuery({
    queryKey: ["templateExerciseHistory", gymExerciseNames],
    queryFn: () => api.getExerciseHistory(gymExerciseNames),
    enabled: isGymTemplate && gymExerciseNames.length > 0,
    staleTime: 60000,
  });
  const exerciseHistoryMap = useMemo<Record<string, any[]>>(() => {
    const map: Record<string, any[]> = {};
    if (exerciseHistoryData?.exercises) {
      for (const entry of exerciseHistoryData.exercises) {
        map[entry.name] = entry.sessions ?? [];
      }
    }
    return map;
  }, [exerciseHistoryData]);

  // Pick the first exercise with real history for the top progression card
  const primaryProgressionEntry = useMemo(() => {
    for (const name of gymExerciseNames) {
      const sessions = exerciseHistoryMap[name] ?? [];
      if (sessions.length > 0) {
        return { name, target: calculateStrengthTarget(sessions) };
      }
    }
    return null;
  }, [gymExerciseNames, exerciseHistoryMap]);

  // Personal context: when did the user last do this activity type or this template?
  const lastDoneContext = React.useMemo(() => {
    if (!template || !workoutsData?.workouts?.length) return null;
    const recent: any[] = workoutsData.workouts;
    // Match by template name first, then by activity type
    const byName = recent.find((w) => w.name?.toLowerCase() === template.name.toLowerCase());
    const byType = recent.find((w) => w.activityType === template.activityType);
    const match = byName || byType;
    if (!match) return null;
    const daysAgo = (Date.now() - new Date(match.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 1) return { label: t("workouts.template.doneToday"), sub: t("workouts.template.restUpAfter"), icon: "check-circle" as const, color: theme.primary };
    if (daysAgo < 2) return { label: t("workouts.template.doneYesterday"), sub: t("workouts.template.considerDifferentMuscles"), icon: "clock" as const, color: theme.warning || "#ff9800" };
    const d = Math.round(daysAgo);
    if (d <= 3) return { label: t("workouts.template.lastDoneDaysAgo", { days: d }), sub: t("workouts.template.musclesRecovered"), icon: "clock" as const, color: theme.primary };
    if (d <= 7) return { label: t("workouts.template.lastDoneDaysAgo", { days: d }), sub: t("workouts.template.fullyRecovered"), icon: "clock" as const, color: theme.primary };
    return { label: t("workouts.template.lastDoneDaysAgo", { days: d }), sub: t("workouts.template.beenAWhile"), icon: "clock" as const, color: theme.textMuted };
  }, [template, workoutsData]);

  const logMutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      setSuccess(true);
      setTimeout(() => router.replace("/(tabs)/workouts" as any), 2000);
    },
    onError: (err: any) => Alert.alert(t("common.error"), err.message || t("workouts.errorSaving")),
  });

  if (!template) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={40} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 12 }}>{t("workouts.workoutNotFound")}</Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SuccessView
          title={t("workouts.workoutLogged")}
          subtitle={t("workouts.greatJobCompleting", { name: template.name })}
        />
      </View>
    );
  }

  const handleLogWorkout = () => {
    logMutation.mutate({
      activityType: template.activityType,
      name: template.name,
      date: new Date().toISOString(),
      durationMinutes: template.durationMinutes,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Nav */}
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={() => setSaved(!saved)}
          style={[styles.saveBtn, { backgroundColor: saved ? theme.primaryDim : theme.card, borderColor: saved ? theme.primary : theme.border }]}
        >
          <Feather name="bookmark" size={16} color={saved ? theme.primary : theme.textMuted} />
          <Text style={{ color: saved ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            {saved ? t("workouts.savedLabel") : t("workouts.saveBtnLabel")}
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100, maxWidth: 600, width: "100%", alignSelf: "center" as const }]}>
        {/* Hero */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Animated.View entering={ZoomIn.delay(100).duration(400)} style={[styles.heroIcon, { backgroundColor: theme.primaryDim }]}>
            <Feather name="activity" size={32} color={theme.primary} />
          </Animated.View>
          <Text style={[styles.heroTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{template.name}</Text>
          <Text style={[styles.heroDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{template.description}</Text>

          <View style={styles.statsRow}>
            <Animated.View entering={SlideInRight.delay(150).duration(300)} style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="clock" size={14} color={theme.secondary} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{template.durationMinutes} {t("common.min")}</Text>
            </Animated.View>
            <Animated.View entering={SlideInRight.delay(200).duration(300)}>
              <DifficultyBadge difficulty={template.difficulty} />
            </Animated.View>
            <Animated.View entering={SlideInRight.delay(250).duration(300)} style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="target" size={14} color={theme.pink} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{template.goals[0]}</Text>
            </Animated.View>
          </View>

          {/* Personal context pill */}
          {lastDoneContext && (
            <Animated.View entering={FadeIn.delay(300).duration(300)} style={[styles.lastDoneRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name={lastDoneContext.icon} size={12} color={lastDoneContext.color} />
              <Text style={{ color: lastDoneContext.color, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                {lastDoneContext.label}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 }}>
                {" · "}{lastDoneContext.sub}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Why this is good for you */}
        {whyGoodForYou && (
          <Animated.View entering={FadeInDown.delay(100).duration(350)}>
            <Card style={[styles.whyCard, { borderColor: theme.primary }]}>
              <View style={styles.whyHeader}>
                <Feather name="zap" size={16} color={theme.primary} />
                <Text style={[styles.whyTitle, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {t("workouts.whyGoodForYou")}
                </Text>
              </View>
              <Text style={[styles.whyText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{whyGoodForYou}</Text>
            </Card>
          </Animated.View>
        )}

        {/* Progression card — shown when user has history for any exercise */}
        {primaryProgressionEntry && primaryProgressionEntry.target.trend !== "first" && (
          <Animated.View entering={FadeInDown.delay(130).duration(350)}>
            <Card style={{ gap: 8, borderColor: (theme as any).secondaryDim }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Feather name="trending-up" size={14} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {t("workouts.progressionLabel")} · {primaryProgressionEntry.name}
                </Text>
              </View>
              <ProgressionCard
                target={primaryProgressionEntry.target}
                exerciseName={primaryProgressionEntry.name}
                compact
              />
            </Card>
          </Animated.View>
        )}

        {/* Equipment */}
        {template.requiredEquipment.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(350)}>
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.equipmentNeeded")}</Text>
              <View style={styles.tagRow}>
                {template.requiredEquipment.map(eq => {
                  const isMissing = missingEquip.includes(eq);
                  return (
                    <View key={eq} style={[
                      styles.tagChip,
                      isMissing
                        ? { backgroundColor: theme.warning + "18", borderColor: theme.warning }
                        : { backgroundColor: theme.primaryDim, borderColor: theme.primary },
                    ]}>
                      <Feather name={isMissing ? "x-circle" : "check-circle"} size={12} color={isMissing ? theme.warning : theme.primary} />
                      <Text style={{ color: isMissing ? theme.warning : theme.primary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                        {eq.replace(/_/g, " ")}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {equipMatch === "partial" && (
                <View style={[styles.subNoteRow, { backgroundColor: theme.warning + "15", borderColor: theme.warning + "40" }]}>
                  <Feather name="info" size={13} color={theme.warning} />
                  <Text style={[styles.subNote, { color: theme.warning, fontFamily: "Inter_400Regular" }]}>
                    {t("workouts.missingSwapped")}
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Benefits — tappable for tips */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("workouts.template.benefitsTitle")}</Text>
              <Text style={[styles.tapHint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {t("workouts.template.tapForDetails")}
              </Text>
            </View>
            {benefits.map((b, i) => (
              <BenefitRow key={i} benefit={b} index={i} />
            ))}
          </Card>
        </Animated.View>

        {/* Exercises */}
        <Animated.View entering={FadeInDown.delay(250).duration(350)}>
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("workouts.template.exercisesCount", { count: filteredExercises.length })}
              </Text>
              {equipMatch === "partial" && (
                <View style={[styles.subsBadge, { backgroundColor: theme.warning + "20" }]}>
                  <Feather name="refresh-cw" size={10} color={theme.warning} />
                  <Text style={{ color: theme.warning, fontFamily: "Inter_500Medium", fontSize: 10 }}>{t("workouts.template.substituted")}</Text>
                </View>
              )}
            </View>
            {filteredExercises.map((ex, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 45).duration(250)}
                style={[styles.exerciseRow, { borderBottomColor: theme.border }]}
              >
                <View style={[
                  styles.exNum,
                  { backgroundColor: ex.isSubstitution ? theme.warning + "20" : theme.primaryDim },
                ]}>
                  <Text style={[styles.exNumText, { color: ex.isSubstitution ? theme.warning : theme.primary, fontFamily: "Inter_700Bold" }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {ex.isSubstitution && (
                    <Text style={[styles.subLabel, { color: theme.warning, fontFamily: "Inter_500Medium" }]}>
                      {t("workouts.template.replaces", { name: ex.substituteFor })}
                    </Text>
                  )}
                  {ex.missingEquipment && !ex.isSubstitution && (
                    <Text style={[styles.subLabel, { color: theme.danger, fontFamily: "Inter_500Medium" }]}>
                      {t("workouts.template.needsUnavailable", { equipment: ex.missingEquipment.replace(/_/g, " ") })}
                    </Text>
                  )}
                  <Text style={[
                    styles.exName,
                    { color: ex.isSubstitution ? theme.warning : theme.text, fontFamily: "Inter_600SemiBold" },
                  ]}>
                    {ex.name}
                  </Text>
                  <View style={styles.exDetails}>
                    {ex.sets && (
                      <Text style={[styles.exStat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {ex.sets} {t("workouts.template.setsX")} {ex.reps || ex.duration}
                      </Text>
                    )}
                    {!ex.sets && ex.duration && (
                      <Text style={[styles.exStat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{ex.duration}</Text>
                    )}
                    {ex.rest && (
                      <View style={[styles.restPill, { backgroundColor: theme.secondaryDim }]}>
                        <Feather name="clock" size={10} color={theme.secondary} />
                        <Text style={{ color: theme.secondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("workouts.template.restTime", { time: ex.rest })}</Text>
                      </View>
                    )}
                  </View>
                  {!ex.isSubstitution && !ex.missingEquipment && ex.alternatives && ex.alternatives.length > 0 && (
                    <Text style={[styles.exNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {t("workouts.template.alt")}: {ex.alternatives[0]}
                    </Text>
                  )}
                  {isGymTemplate && exerciseHistoryMap[ex.name] != null && (() => {
                    const sessions = exerciseHistoryMap[ex.name] ?? [];
                    const target = calculateStrengthTarget(sessions);
                    if (target.trend === "first") return null;
                    const trendColors: Record<string, string> = { progress: theme.primary, maintain: theme.secondary, deload: theme.warning };
                    const trendColor = trendColors[target.trend] ?? theme.textMuted;
                    const trendLabels: Record<string, string> = { progress: `↑ ${t("workouts.template.levelUp")}`, maintain: `→ ${t("workouts.template.holdSteady")}`, deload: `↓ ${t("workouts.template.recovery")}` };
                    return (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {target.previousDisplay ? (
                          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                            {t("workouts.template.last")}: {target.previousDisplay}
                          </Text>
                        ) : null}
                        <View style={{ backgroundColor: trendColor + "18", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: trendColor, fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                            {trendLabels[target.trend] ?? target.trend}
                            {target.suggestedWeightKg ? ` · ${target.suggestedWeightKg}kg` : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
                {ex.isSubstitution && (
                  <View style={[styles.subBadge, { backgroundColor: theme.warning + "20" }]}>
                    <Feather name="refresh-cw" size={12} color={theme.warning} />
                  </View>
                )}
              </Animated.View>
            ))}
          </Card>
        </Animated.View>

        {/* Coach tip footer */}
        <Animated.View entering={FadeInDown.delay(300).duration(350)}>
          <View style={[styles.coachTip, { backgroundColor: theme.primaryDim, borderColor: theme.primary + "30" }]}>
            <Feather name="cpu" size={14} color={theme.primary} />
            <Text style={[styles.coachTipText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {t("workouts.template.coachTip")}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border, backgroundColor: theme.background }]}>
        {template.activityType === "gym" ? (
          <>
            <Button
              title={`▶  ${t("workouts.template.startWorkout")}`}
              onPress={() => router.push({ pathname: "/workouts/execute" as any, params: { id: template.id } })}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                title={t("workouts.template.logAsDone")}
                onPress={handleLogWorkout}
                loading={logMutation.isPending}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title={t("workouts.template.customise")}
                onPress={() => router.push({
                  pathname: "/workouts/log" as any,
                  params: { prefillName: template.name, prefillType: template.activityType, prefillDuration: template.durationMinutes.toString() },
                })}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <>
            <Button
              title={t("workouts.template.logAsCompleted")}
              onPress={handleLogWorkout}
              loading={logMutation.isPending}
            />
            <Button
              title={t("workouts.template.customiseAndLog")}
              onPress={() => router.push({
                pathname: "/workouts/log" as any,
                params: { prefillName: template.name, prefillType: template.activityType, prefillDuration: template.durationMinutes.toString() },
              })}
              variant="outline"
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  content: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 16 },
  heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, textAlign: "center" },
  heroDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  lastDoneRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  statText: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 12 },
  whyCard: { borderWidth: 1.5, gap: 0 },
  whyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  whyTitle: { fontSize: 14 },
  whyText: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 15, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  tapHint: { fontSize: 11 },
  subsBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  subNoteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  subNote: { fontSize: 12, flex: 1, lineHeight: 17 },
  subLabel: { fontSize: 10, marginBottom: 1 },
  subBadge: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 2 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  benefitDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  benefitText: { fontSize: 14, lineHeight: 20 },
  benefitTip: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  exerciseRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  exNum: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exNumText: { fontSize: 13 },
  exName: { fontSize: 14 },
  exDetails: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  exStat: { fontSize: 12 },
  restPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  exNote: { fontSize: 11, marginTop: 4 },
  coachTip: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  coachTipText: { fontSize: 12, lineHeight: 18, flex: 1 },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1,
  },
});
