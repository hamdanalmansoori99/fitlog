import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Animated as RNAnimated,
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

function AnimatedSkeleton({ theme, placeholderId, t }: { theme: any; placeholderId: string; t: (key: string) => string }) {
  const pulse = useRef(new RNAnimated.Value(0.3)).current;
  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <RNAnimated.View
      style={[styles.animPlaceholder, { backgroundColor: theme.card, borderColor: theme.border, opacity: pulse }]}
      accessibilityLabel={`animation-${placeholderId}`}
    >
      <View style={[styles.animIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="play-circle" size={32} color={theme.primary} />
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
        {t("exercises.animationComingSoon")}
      </Text>
      <Text style={{ color: theme.textMuted + "60", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" }}>
        {placeholderId}
      </Text>
    </RNAnimated.View>
  );
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        <Animated.View entering={FadeInDown.duration(350)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <View style={[styles.badge, { backgroundColor: dColor + "20" }]}>
            <Text style={[styles.badgeText, { color: dColor }]}>{t(`exercises.difficulty${exercise.difficulty}`)}</Text>
          </View>
          {catMeta && (
            <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <Feather name={catMeta.icon as any} size={11} color={theme.textMuted} />
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>{t(`exercises.category${catMeta.id.charAt(0).toUpperCase()}${catMeta.id.slice(1)}`)}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(350)}>
          <AnimatedSkeleton theme={theme} placeholderId={exercise.animationPlaceholder} t={t} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.formInstructions")}</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {exercise.instructions.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={[styles.stepDot, { backgroundColor: theme.primary }]}>
                  <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 10 }}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: theme.textMuted }]}>{step}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.commonMistakes")}</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {exercise.commonMistakes.map((mistake, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={[styles.warningDot, { backgroundColor: (theme.warning || "#ffab40") + "20" }]}>
                  <Feather name="alert-triangle" size={11} color={theme.warning || "#ffab40"} />
                </View>
                <Text style={[styles.stepText, { color: theme.textMuted }]}>{mistake}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t("exercises.musclesWorked")}</Text>
          <View style={{ gap: 12, marginTop: 4 }}>
            <View>
              <Text style={[styles.muscleLabel, { color: theme.textMuted }]}>{t("exercises.primary")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                <View style={[styles.muscleChip, { backgroundColor: theme.primary + "18" }]}>
                  <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{exercise.primaryMuscle}</Text>
                </View>
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

        {exercise.equipment.length > 0 && exercise.equipment[0] !== "none" ? (
          <Animated.View entering={FadeInDown.delay(200).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(350)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
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
  stepDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  warningDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 0,
  },
  stepText: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, flex: 1,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  notFound: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  animPlaceholder: {
    borderRadius: 16, borderWidth: 1, padding: 28,
    alignItems: "center", justifyContent: "center", gap: 12,
    height: 160,
  },
  animIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
});
