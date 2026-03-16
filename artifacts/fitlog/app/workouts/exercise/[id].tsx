import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { getExerciseById, EXERCISE_CATEGORIES } from "@/lib/exerciseLibrary";

function difficultyColor(d: string, theme: any) {
  if (d === "Beginner") return theme.primary;
  if (d === "Intermediate") return theme.secondary;
  return theme.warning || "#ffab40";
}

function typeColor(type: string, theme: any) {
  const map: Record<string, string> = {
    strength: theme.primary,
    cardio: "#ef5350",
    flexibility: "#26c6da",
    plyometric: theme.warning || "#ffab40",
  };
  return map[type] || theme.primary;
}

export default function ExerciseDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const exercise = getExerciseById(id as string);

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.notFound}>
          <Feather name="search" size={40} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 18, marginTop: 16 }}>
            {t("exercises.exerciseNotFound")}
          </Text>
        </View>
      </View>
    );
  }

  const catMeta = EXERCISE_CATEGORIES.find((c) => c.id === exercise.category);
  const dColor = difficultyColor(exercise.difficulty, theme);
  const tColor = typeColor(exercise.type, theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }]} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, gap: 16 }}
      >
        {/* Hero Badge Row */}
        <Animated.View entering={FadeInDown.duration(350)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <View style={[styles.badge, { backgroundColor: tColor + "20" }]}>
            <Text style={[styles.badgeText, { color: tColor }]}>{exercise.type}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: dColor + "20" }]}>
            <Text style={[styles.badgeText, { color: dColor }]}>{exercise.difficulty}</Text>
          </View>
          {catMeta && (
            <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <Feather name={catMeta.icon as any} size={11} color={theme.textMuted} />
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>{catMeta.label}</Text>
            </View>
          )}
          {(exercise.sets || exercise.reps || exercise.duration) && (
            <View style={[styles.badge, { backgroundColor: theme.primaryDim }]}>
              <Feather name="target" size={11} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                {exercise.sets ? `${exercise.sets} sets` : ""}
                {exercise.sets && (exercise.reps || exercise.duration) ? " · " : ""}
                {exercise.reps ? `${exercise.reps} reps` : ""}
                {exercise.duration ? `${exercise.duration}` : ""}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.overview")}</Text>
          <Text style={[styles.cardBody, { color: theme.textMuted }]}>{exercise.description}</Text>
        </Animated.View>

        {/* Muscles */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.musclesWorked")}</Text>
          <View style={{ gap: 12, marginTop: 4 }}>
            <View>
              <Text style={[styles.muscleLabel, { color: theme.textMuted }]}>{t("exercises.primary")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {exercise.primaryMuscles.map((m) => (
                  <View key={m} style={[styles.muscleChip, { backgroundColor: theme.primary + "18" }]}>
                    <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
            {exercise.secondaryMuscles.length > 0 && (
              <View>
                <Text style={[styles.muscleLabel, { color: theme.textMuted }]}>{t("exercises.secondary")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {exercise.secondaryMuscles.map((m) => (
                    <View key={m} style={[styles.muscleChip, { backgroundColor: theme.border }]}>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Equipment */}
        {exercise.equipment.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.equipment")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {exercise.equipment.map((eq) => (
                <View key={eq} style={[styles.equipChip, { backgroundColor: theme.secondary + "18" }]}>
                  <Feather name="tool" size={11} color={theme.secondary} />
                  <Text style={{ color: theme.secondary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    {eq.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {exercise.equipment.length === 0 && (
          <Animated.View entering={FadeInDown.delay(140).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.noEquipIcon, { backgroundColor: theme.primaryDim }]}>
                <Feather name="user" size={16} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.noEquipmentNeeded")}</Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  {t("exercises.canDoAnywhere")}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Tips */}
        <Animated.View entering={FadeInDown.delay(180).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.proTips")}</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {exercise.tips.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={[styles.tipDot, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 10 }}>{i + 1}</Text>
                </View>
                <Text style={[styles.tipText, { color: theme.textMuted }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Log Workout CTA */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)}>
          <Pressable
            onPress={() => router.push("/workouts/log" as any)}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color="#0f0f1a" />
            <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 15 }}>
              {t("exercises.logThisExercise")}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 18, textAlign: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 4,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 4,
  },
  cardBody: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22,
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize",
  },
  muscleLabel: {
    fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
  },
  muscleChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  equipChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  noEquipIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  tipDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  tipText: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, flex: 1,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  notFound: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
});
