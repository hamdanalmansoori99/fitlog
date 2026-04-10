import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const ACTIVITY_COLORS: Record<string, string> = {
  cycling: "secondary", running: "primary", walking: "cyan",
  gym: "purple", swimming: "secondary", tennis: "warning", yoga: "pink", other: "textMuted",
};
const ACTIVITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cycling: "wind", running: "activity", walking: "navigation",
  gym: "zap", swimming: "droplet", tennis: "circle", yoga: "heart", other: "activity",
};

export default function UserTemplateScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["userTemplates"],
    queryFn: api.getUserTemplates,
    staleTime: 300_000,
  });

  const templates = data?.templates || [];
  const template = templates.find((t: any) => String(t.id) === String(params.id));

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateUserTemplate(Number(params.id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      setEditing(false);
    },
    onError: () => Alert.alert(t("common.error"), t("workouts.failedToUpdate")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUserTemplate(Number(params.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      router.back();
    },
    onError: () => Alert.alert(t("common.error"), t("workouts.failedToDeleteTemplate")),
  });

  const toggleFavMutation = useMutation({
    mutationFn: () => api.toggleTemplateFavorite(Number(params.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userTemplates"] }),
    onError: () => Alert.alert(t("common.error"), t("workouts.failedToUpdateFavourite")),
  });

  const useMutation2 = useMutation({
    mutationFn: () => api.markTemplateUsed(Number(params.id)),
  });

  function handleStartWorkout() {
    if (!template) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useMutation2.mutate();
    const prefillExercises = template.exercises?.length > 0
      ? JSON.stringify(template.exercises)
      : undefined;
    router.push({
      pathname: "/workouts/log" as any,
      params: {
        prefillType: template.activityType,
        prefillExercises,
        prefillName: template.name,
      },
    });
  }

  function handleEdit() {
    if (!template) return;
    setEditName(template.name);
    setEditDescription(template.description ?? "");
    setEditMinutes(template.estimatedMinutes ? String(template.estimatedMinutes) : "");
    setEditing(true);
  }

  function handleSaveEdit() {
    updateMutation.mutate({
      name: editName.trim() || template?.name,
      description: editDescription.trim() || null,
      estimatedMinutes: editMinutes ? parseInt(editMinutes) : null,
    });
  }

  function handleDelete() {
    Alert.alert(t("workouts.deleteTemplateTitle"), t("workouts.cannotBeUndone"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  if (isLoading || !template) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.nav, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
          <View style={{ height: 80, borderRadius: 16, backgroundColor: theme.card }} />
          <View style={{ height: 52, borderRadius: 12, backgroundColor: theme.card }} />
          <View style={{ height: 120, borderRadius: 12, backgroundColor: theme.card }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", opacity: 0 }}>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular" }}>{t("workouts.loadingText")}</Text>
        </View>
      </View>
    );
  }

  const color = (theme as any)[ACTIVITY_COLORS[template.activityType]] || theme.primary;
  const icon = ACTIVITY_ICONS[template.activityType] || "activity";
  const exercises: any[] = template.exercises || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavMutation.mutate(); }}>
            <Feather name="star" size={22} color={template.isFavorite ? theme.warning : theme.textMuted} />
          </Pressable>
          <Pressable onPress={handleEdit}>
            <Feather name="edit-2" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
      >
        {/* Hero card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={[styles.heroCard, { borderColor: color + "40" }]}>
            <View style={[styles.heroIcon, { backgroundColor: color + "20" }]}>
              <Feather name={icon} size={32} color={color} />
            </View>
            {editing ? (
              <View style={{ gap: 10, marginTop: 12 }}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t("workouts.templateName")}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_600SemiBold", fontSize: 18 }]}
                />
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder={t("workouts.descriptionOptional")}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_400Regular", fontSize: 14 }]}
                />
                <TextInput
                  value={editMinutes}
                  onChangeText={setEditMinutes}
                  placeholder={t("workouts.estDurationMinutes")}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, fontFamily: "Inter_400Regular", fontSize: 14 }]}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setEditing(false)}
                    style={[styles.editCancelBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium" }}>{t("common.cancel")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveEdit}
                    style={[styles.editSaveBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold" }}>
                      {updateMutation.isPending ? t("workouts.saving") : t("workouts.saveBtnLabel")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.heroName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {template.name}
                </Text>
                {template.description && (
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 }}>
                    {template.description}
                  </Text>
                )}
                <View style={styles.heroMeta}>
                  <View style={styles.heroMetaItem}>
                    <Feather name={icon} size={14} color={color} />
                    <Text style={{ color: color, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {template.activityType.charAt(0).toUpperCase() + template.activityType.slice(1)}
                    </Text>
                  </View>
                  {template.estimatedMinutes && (
                    <View style={styles.heroMetaItem}>
                      <Feather name="clock" size={14} color={theme.textMuted} />
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                        ~{template.estimatedMinutes} min
                      </Text>
                    </View>
                  )}
                  {template.usageCount > 0 && (
                    <View style={styles.heroMetaItem}>
                      <Feather name="repeat" size={14} color={theme.textMuted} />
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                        Used {template.usageCount}×
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        {/* Exercises */}
        {exercises.length > 0 && (
          <Animated.View entering={FadeInDown.duration(250)}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {t("workouts.exercisesLabel")} ({exercises.length})
            </Text>
            <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden", marginTop: 8 }}>
              {exercises.map((ex: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.exRow,
                    { borderBottomColor: theme.border },
                    i < exercises.length - 1 && { borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.exNum, { backgroundColor: color + "20" }]}>
                    <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 12 }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{ex.name}</Text>
                    {ex.sets?.length > 0 && (
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                        {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}
                        {ex.sets[0]?.reps ? ` · ${ex.sets[0].reps} reps` : ""}
                        {ex.sets[0]?.weightKg ? ` · ${ex.sets[0].weightKg}kg` : ""}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 10, marginTop: 8 }}>
          <Button title={t("workouts.startWorkoutBtn")} onPress={handleStartWorkout} />
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: theme.danger + "50" }]}
          >
            <Feather name="trash-2" size={16} color={theme.danger} />
            <Text style={{ color: theme.danger, fontFamily: "Inter_500Medium", fontSize: 14 }}>{t("workouts.deleteTemplateBtn")}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navTitle: { flex: 1, fontSize: 17, marginHorizontal: 8 },
  heroCard: { gap: 0, alignItems: "center", paddingVertical: 24, borderWidth: 1.5 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 22, marginTop: 12, textAlign: "center" },
  heroMeta: { flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  sectionTitle: { fontSize: 16 },
  exRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  exNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  editInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  editCancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center",
  },
  editSaveBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center",
  },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
});
