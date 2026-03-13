import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, SlideInRight, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { getTemplateById } from "@/lib/workoutTemplates";
import { getFilteredExercises, getActivityBenefits, getEquipmentMatchLevel } from "@/lib/coachEngine";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SuccessView } from "@/components/SuccessView";

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
    "Builds foundational strength": "Strengthening muscles early helps protect joints and improve posture for life.",
    "Improves coordination and balance": "Better neuromuscular control reduces injury risk in everyday activities.",
    "No equipment required": "Consistency matters more than equipment — bodyweight training is proven to build real strength.",
    "Scalable as you progress": "Start easy, then add reps, sets, or harder variations when you're ready.",
    "Builds strength and muscle": "Progressive overload — gradually increasing the challenge — is the key to continuous gains.",
    "Improves bone density": "Weight-bearing exercise strengthens bones and reduces osteoporosis risk.",
    "Boosts resting metabolism": "More muscle means you burn more calories even while at rest.",
    "Supports long-term body composition": "Muscle is denser than fat — a leaner look with the same weight is possible.",
    "Builds cardiovascular endurance": "A stronger heart pumps more blood per beat, making all activities feel easier.",
    "Burns significant calories": "Running can burn 400–600+ kcal/hour depending on pace and bodyweight.",
    "Improves flexibility and range of motion": "Greater range of motion reduces injury risk and improves athletic performance.",
    "Supports muscle recovery": "Mobility and stretching increase blood flow to muscles, speeding up repair.",
    "Reduces stress and improves sleep": "Exercise lowers cortisol and boosts serotonin — a natural mood lifter.",
    "Full-body conditioning": "Working all muscle groups in one session maximises calorie burn and functional fitness.",
    "Zero joint impact": "Water supports your body weight — ideal for recovery or joint pain.",
    "Great aerobic workout": "Elevating your heart rate for sustained periods improves cardiovascular health.",
    "Effective cardiovascular workout": "Steady-state cardio strengthens the heart and improves lung efficiency.",
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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, whyGoodForYou } = useLocalSearchParams<{ id: string; whyGoodForYou?: string }>();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const template = id ? getTemplateById(id) : undefined;
  const [saved, setSaved] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });
  const userEquipment: string[] = profile?.availableEquipment || [];
  const benefits = getActivityBenefits(template?.activityType || "gym");
  const filteredExercises = template ? getFilteredExercises(template, userEquipment) : [];
  const { level: equipMatch, missing: missingEquip } = template
    ? getEquipmentMatchLevel(template, userEquipment)
    : { level: "full" as const, missing: [] };

  const logMutation = useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivity"] });
      setSuccess(true);
      setTimeout(() => router.replace("/(tabs)/workouts" as any), 2000);
    },
  });

  if (!template) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={40} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 12 }}>Workout not found</Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SuccessView
          title="Workout Logged!"
          subtitle={`Great job completing ${template.name}. Keep the momentum going!`}
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
            {saved ? "Saved" : "Save"}
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
        </Animated.View>

        {/* Why this is good for you */}
        {whyGoodForYou && (
          <Animated.View entering={FadeInDown.delay(100).duration(350)}>
            <Card style={[styles.whyCard, { borderColor: theme.primary }]}>
              <View style={styles.whyHeader}>
                <Feather name="zap" size={16} color={theme.primary} />
                <Text style={[styles.whyTitle, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                  Why this is good for you today
                </Text>
              </View>
              <Text style={[styles.whyText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{whyGoodForYou}</Text>
            </Card>
          </Animated.View>
        )}

        {/* Equipment */}
        {template.requiredEquipment.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(350)}>
            <Card>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Equipment needed</Text>
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
                    Missing items are swapped for best alternatives in the exercise list below.
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
