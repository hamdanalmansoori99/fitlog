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
  const colors: Record<string, string> = {
    Beginner: theme.primary,
    Intermediate: theme.secondary,
    Advanced: theme.danger,
  };
  const color = colors[difficulty] || theme.primary;
  return (
    <View style={[styles.badge, { backgroundColor: color + "20", borderColor: color }]}>
      <Text style={[styles.badgeText, { color, fontFamily: "Inter_500Medium" }]}>{difficulty}</Text>
    </View>
  );
}

function BenefitRow({ benefit, index }: { benefit: string; index: number }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const tips: Record<string, string> = {
    // Strength / bodyweight
    "Builds foundational strength": "Strengthening muscles early protects your joints and improves posture for life. Compound movements like squats and push-ups recruit dozens of muscles at once.",
    "Improves coordination and balance": "Better neuromuscular control reduces injury risk in everyday activities and sports. Balance training also activates deep core stabilisers.",
    "No equipment required": "Consistency beats equipment every time. Bodyweight training uses your own mass as resistance and can be scaled infinitely as you get stronger.",
    "Scalable as you progress": "Start with easier variations, then add reps, sets, tempo, or harder progressions. Linear progression means you'll always have a next level.",
    "Builds strength and muscle": "Progressive overload — gradually increasing the challenge — is the proven driver of muscle growth. Even 1–2 reps more per week compounds over months.",
    "Improves bone density": "Weight-bearing exercise stresses bones enough to stimulate remodelling. This is one of the best long-term defences against osteoporosis.",
    "Boosts resting metabolism": "Each kilogram of muscle burns roughly 13 kcal/day at rest. More muscle means passive calorie burn — even while you sleep.",
    "Supports long-term body composition": "Muscle is denser than fat. Gaining muscle while losing fat can make you leaner and stronger even if the scale barely moves.",
    // Cardio / running
    "Builds cardiovascular endurance": "A stronger heart pumps more blood per beat — this is called stroke volume. Over time, your resting heart rate drops and all activities feel easier.",
    "Burns significant calories": "Running burns roughly 60–80 kcal per kilometre regardless of speed. An hour of running can torch 500–700 kcal depending on your bodyweight.",
    "Strengthens the heart and lungs": "Regular aerobic training enlarges the heart's left ventricle and increases lung capacity — adaptations that protect you for decades.",
    "Improves mental health and mood": "Aerobic exercise triggers endorphin release and long-term increases in BDNF — a brain protein linked to memory, learning, and mood regulation.",
    // Flexibility / yoga
    "Improves flexibility and range of motion": "Greater range of motion reduces injury risk and allows more effective exercise technique. Flexible muscles also recover faster after hard sessions.",
    "Supports muscle recovery": "Mobility work and yoga increase blood flow to fatigued muscles, accelerating waste removal and nutrient delivery — the two keys to repair.",
    "Reduces stress and improves sleep": "Just 20 minutes of yoga lowers cortisol measurably. Better sleep then accelerates every other fitness adaptation — it's the force multiplier.",
    "Improves mobility and balance": "Mobility training targets the joints themselves — not just the muscles. Better joint health means pain-free movement at any age.",
    // Swimming / low impact
    "Full-body conditioning": "Water provides resistance in all directions, so every stroke works both agonist and antagonist muscles simultaneously — more muscles, less time.",
    "Zero joint impact": "Buoyancy offloads up to 90% of your bodyweight, making swimming ideal when joints are sore, injured, or when you need active recovery.",
    "Builds lung capacity": "Controlled breathing patterns in swimming train your respiratory muscles and increase the efficiency with which your body uses oxygen.",
    "Excellent for recovery": "The hydrostatic pressure of water acts like a full-body compression garment, reducing inflammation and muscle soreness after hard training days.",
    // Cycling
    "Effective cardiovascular workout": "Steady-state cycling at 65–75% max heart rate is the most efficient zone for fat burning while sparing muscle tissue.",
    "Lower joint impact than running": "Cycling is non-weight-bearing, so your knees, hips, and ankles experience a fraction of the stress compared to running at the same intensity.",
    "Improves leg endurance and power": "High cadence cycling builds muscular endurance; low cadence with resistance builds raw leg power — both transfer to running, sports, and life.",
    "Great calorie burner": "A 45-minute moderate cycling session burns 300–500 kcal. Combine with strength work for optimal body composition changes.",
    // Tennis / sport
    "Improves agility and reaction speed": "The multidirectional movements in tennis train your nervous system to change direction faster — a skill that transfers to almost every other sport.",
    "Great aerobic workout": "Tennis players average a heart rate of 60–80% max during a match, qualifying it as genuine cardiovascular training with the added fun of competition.",
    "Develops hand-eye coordination": "Tracking a moving ball and timing your swing trains the visual-motor system — coordination that improves across all sport and daily activities.",
    "Fun and social": "Enjoyment is the most powerful predictor of long-term exercise adherence. If you love it, you'll stick with it.",
    // Walking
    "Improves cardiovascular health": "Even 7,000–8,000 daily steps significantly reduce cardiovascular disease risk. Walking is one of the most evidence-backed forms of exercise.",
    "Supports sustainable fat loss": "Walking at a moderate pace uses fat as its primary fuel source. It's sustainable enough to do daily without impacting recovery.",
    "Low impact — easy on joints": "Walking generates only 1–1.5× your bodyweight in ground reaction force vs 3–5× for running. Perfect for active recovery or injury prevention.",
    "Great for active recovery": "Low-intensity movement on rest days increases blood flow to sore muscles without adding training stress — accelerating recovery between sessions.",
  };

  const tip = tips[benefit];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        onPress={() => tip && setExpanded(!expanded)}
        style={[styles.benefitRow, { borderBottomColor: theme.border }]}
      >
        <View style={[styles.benefitDot, { backgroundColor: theme.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.benefitText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{benefit}</Text>
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
    queryKey: ["workouts"],
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
    if (daysAgo < 1) return { label: "Done today", sub: "Rest up after completing this!", icon: "check-circle" as const, color: theme.primary };
    if (daysAgo < 2) return { label: "Done yesterday", sub: "Consider targeting different muscle groups today.", icon: "clock" as const, color: theme.warning || "#ff9800" };
    const d = Math.round(daysAgo);
    if (d <= 3) return { label: `Last done ${d} days ago`, sub: "Your muscles have had time to recover — good timing.", icon: "clock" as const, color: theme.primary };
    if (d <= 7) return { label: `Last done ${d} days ago`, sub: "Fully recovered and ready to push harder today.", icon: "clock" as const, color: theme.primary };
    return { label: `Last done ${d} days ago`, sub: "It's been a while — ease back in and listen to your body.", icon: "clock" as const, color: theme.textMuted };
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
          <Feather name="arrow-left" size={24} color={theme.text} />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
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
              <Text style={[styles.statText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{template.durationMinutes} min</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Benefits</Text>
              <Text style={[styles.tapHint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Tap for details
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
                {filteredExercises.length} Exercises
              </Text>
              {equipMatch === "partial" && (
                <View style={[styles.subsBadge, { backgroundColor: theme.warning + "20" }]}>
                  <Feather name="refresh-cw" size={10} color={theme.warning} />
                  <Text style={{ color: theme.warning, fontFamily: "Inter_500Medium", fontSize: 10 }}>Substituted</Text>
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
                      Replaces: {ex.substituteFor}
                    </Text>
                  )}
                  {ex.missingEquipment && !ex.isSubstitution && (
                    <Text style={[styles.subLabel, { color: theme.danger, fontFamily: "Inter_500Medium" }]}>
                      Needs: {ex.missingEquipment.replace(/_/g, " ")} (unavailable)
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
                        {ex.sets} sets × {ex.reps || ex.duration}
                      </Text>
                    )}
                    {!ex.sets && ex.duration && (
                      <Text style={[styles.exStat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{ex.duration}</Text>
                    )}
                    {ex.rest && (
                      <View style={[styles.restPill, { backgroundColor: theme.secondaryDim }]}>
                        <Feather name="clock" size={10} color={theme.secondary} />
                        <Text style={{ color: theme.secondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>Rest {ex.rest}</Text>
                      </View>
                    )}
                  </View>
                  {!ex.isSubstitution && !ex.missingEquipment && ex.alternatives && ex.alternatives.length > 0 && (
                    <Text style={[styles.exNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      Alt: {ex.alternatives[0]}
                    </Text>
                  )}
                  {isGymTemplate && exerciseHistoryMap[ex.name] != null && (() => {
                    const sessions = exerciseHistoryMap[ex.name] ?? [];
                    const target = calculateStrengthTarget(sessions);
                    if (target.trend === "first") return null;
                    const trendColors: Record<string, string> = { progress: theme.primary, maintain: theme.secondary, deload: theme.warning };
                    const trendColor = trendColors[target.trend] ?? theme.textMuted;
                    const trendLabels: Record<string, string> = { progress: "↑ Level up", maintain: "→ Hold steady", deload: "↓ Recovery" };
                    return (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {target.previousDisplay ? (
                          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                            Last: {target.previousDisplay}
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
              Tap "Customise & Log" to adjust weights, reps, or duration before logging.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border, backgroundColor: theme.background }]}>
        {template.activityType === "gym" ? (
          <>
            <Button
              title="▶  Start Workout"
              onPress={() => router.push({ pathname: "/workouts/execute" as any, params: { id: template.id } })}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                title="Log as Done"
                onPress={handleLogWorkout}
                loading={logMutation.isPending}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Customise"
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
              title="Log as Completed"
              onPress={handleLogWorkout}
              loading={logMutation.isPending}
            />
            <Button
              title="Customise & Log"
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
  content: { paddingHorizontal: 20, gap: 14, paddingTop: 4 },
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
