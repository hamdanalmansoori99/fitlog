import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { getTemplateById } from "@/lib/workoutTemplates";
import { getFilteredExercises, getActivityBenefits, getEquipmentMatchLevel } from "@/lib/coachEngine";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
      setTimeout(() => router.replace("/(tabs)/workouts" as any), 1200);
    },
  });

  if (!template) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular" }}>Workout not found</Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <View style={[styles.successCircle, { backgroundColor: theme.primaryDim }]}>
          <Feather name="check" size={48} color={theme.primary} />
        </View>
        <Text style={[styles.successTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Workout Logged!</Text>
        <Text style={[styles.successSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Great job completing {template.name}
        </Text>
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
          <Feather name={saved ? "bookmark" : "bookmark"} size={16} color={saved ? theme.primary : theme.textMuted} />
          <Text style={{ color: saved ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
            {saved ? "Saved" : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: theme.primaryDim }]}>
            <Feather name="activity" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{template.name}</Text>
          <Text style={[styles.heroDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{template.description}</Text>

          {/* Key stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="clock" size={14} color={theme.secondary} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{template.durationMinutes} min</Text>
            </View>
            <DifficultyBadge difficulty={template.difficulty} />
            <View style={[styles.statChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="target" size={14} color={theme.pink} />
              <Text style={[styles.statText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{template.goals[0]}</Text>
            </View>
          </View>
        </View>

        {/* Why this is good for you */}
        {whyGoodForYou && (
          <Card style={[styles.whyCard, { borderColor: theme.primary }]}>
            <View style={styles.whyHeader}>
              <Feather name="zap" size={16} color={theme.primary} />
              <Text style={[styles.whyTitle, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                Why this is good for you
              </Text>
            </View>
            <Text style={[styles.whyText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{whyGoodForYou}</Text>
          </Card>
        )}

        {/* Equipment */}
        {template.requiredEquipment.length > 0 && (
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
              <Text style={[styles.subNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Missing items are replaced with alternatives below.
              </Text>
            )}
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Benefits</Text>
          <View style={styles.benefitsList}>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={[styles.benefitDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.benefitText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{b}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Exercises */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {filteredExercises.length} Exercises
          </Text>
          {filteredExercises.map((ex, i) => (
            <View key={i} style={[styles.exerciseRow, { borderBottomColor: theme.border }]}>
              <View style={[
                styles.exNum,
                { backgroundColor: ex.isSubstitution ? theme.warning + "20" : theme.primaryDim },
              ]}>
                <Text style={[styles.exNumText, { color: ex.isSubstitution ? theme.warning : theme.primary, fontFamily: "Inter_700Bold" }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                {/* Substitution label above name */}
                {ex.isSubstitution && (
                  <Text style={[styles.subLabel, { color: theme.warning, fontFamily: "Inter_500Medium" }]}>
                    Replaces: {ex.substituteFor}
                  </Text>
                )}
                {/* Missing equipment fallback label */}
                {ex.missingEquipment && !ex.isSubstitution && (
                  <Text style={[styles.subLabel, { color: theme.danger, fontFamily: "Inter_500Medium" }]}>
                    Needs: {ex.missingEquipment.replace(/_/g, " ")} (not available)
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
                      {ex.sets} × {ex.reps || ex.duration}
                    </Text>
                  )}
                  {!ex.sets && ex.duration && (
                    <Text style={[styles.exStat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>{ex.duration}</Text>
                  )}
                  {ex.rest && (
                    <Text style={[styles.exStat, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Rest: {ex.rest}</Text>
                  )}
                </View>
                {/* General alternatives note (when exercise isn't already substituted) */}
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
            </View>
          ))}
        </Card>
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
  whyCard: { borderWidth: 1.5 },
  whyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  whyTitle: { fontSize: 14 },
  whyText: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 15, marginBottom: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  subNote: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  subLabel: { fontSize: 10, marginBottom: 1 },
  subBadge: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 2 },
  benefitsList: { gap: 8 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  benefitDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  benefitText: { fontSize: 14, flex: 1, lineHeight: 20 },
  exerciseRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  exNum: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exNumText: { fontSize: 13 },
  exName: { fontSize: 14 },
  exDetails: { flexDirection: "row", gap: 10, marginTop: 3 },
  exStat: { fontSize: 12 },
  altPill: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  altText: { fontSize: 11, flex: 1 },
  exNote: { fontSize: 11, marginTop: 4 },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1,
  },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26 },
  successSub: { fontSize: 15, textAlign: "center" },
});
