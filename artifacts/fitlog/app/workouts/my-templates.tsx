import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { useSubscription } from "@/hooks/useSubscription";

const ACTIVITY_COLORS: Record<string, string> = {
  cycling: "secondary", running: "primary", walking: "cyan",
  gym: "purple", swimming: "secondary", tennis: "warning", yoga: "pink", other: "textMuted",
};
const ACTIVITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cycling: "wind", running: "activity", walking: "navigation",
  gym: "zap", swimming: "droplet", tennis: "circle", yoga: "heart", other: "activity",
};
const ACTIVITY_TYPES = [
  { id: "gym", labelKey: "workouts.activityLabelGym", icon: "zap" as const },
  { id: "running", labelKey: "workouts.activityLabelRunning", icon: "activity" as const },
  { id: "cycling", labelKey: "workouts.activityLabelCycling", icon: "wind" as const },
  { id: "walking", labelKey: "workouts.activityLabelWalking", icon: "navigation" as const },
  { id: "swimming", labelKey: "workouts.activityLabelSwimming", icon: "droplet" as const },
  { id: "yoga", labelKey: "workouts.activityLabelYoga", icon: "heart" as const },
  { id: "tennis", labelKey: "workouts.activityLabelTennis", icon: "circle" as const },
  { id: "other", labelKey: "workouts.activityLabelOther", icon: "more-horizontal" as const },
];

export default function MyTemplatesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { limits, isPremium } = useSubscription();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newActivity, setNewActivity] = useState("gym");

  const { data, isLoading } = useQuery({
    queryKey: ["userTemplates"],
    queryFn: api.getUserTemplates,
    staleTime: 300_000,
  });

  const templates: any[] = data?.templates || [];
  const templateLimit = isPremium ? null : (limits.maxSavedTemplates ?? 10);
  const atLimit = templateLimit !== null && templates.length >= templateLimit;
  const favorites = templates.filter((t) => t.isFavorite);
  const rest = templates.filter((t) => !t.isFavorite);

  const createMutation = useMutation({
    mutationFn: () => api.createUserTemplate({ name: newName.trim() || t("workouts.myTemplate"), activityType: newActivity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTemplates"] });
      setShowCreate(false);
      setNewName("");
      setNewActivity("gym");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteUserTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userTemplates"] }),
  });

  const toggleFavMutation = useMutation({
    mutationFn: (id: number) => api.toggleTemplateFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userTemplates"] }),
  });

  function handleDelete(tmpl: any) {
    Alert.alert(t("workouts.deleteTemplateTitle"), t("workouts.permanentlyRemoved", { name: tmpl.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteMutation.mutate(tmpl.id) },
    ]);
  }

  function TemplateRow({ tmpl }: { tmpl: any }) {
    const color = (theme as any)[ACTIVITY_COLORS[tmpl.activityType]] || theme.primary;
    const icon = ACTIVITY_ICONS[tmpl.activityType] || "activity";
    const exCount = tmpl.exercises?.length ?? 0;

    return (
      <Pressable
        onPress={() => router.push({ pathname: "/workouts/user-template" as any, params: { id: tmpl.id } })}
        style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[styles.rowIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
            {tmpl.name}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            {exCount > 0 ? `${exCount} exercise${exCount !== 1 ? "s" : ""}` : tmpl.activityType}
            {tmpl.usageCount > 0 ? ` · Used ${tmpl.usageCount}×` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavMutation.mutate(tmpl.id); }} hitSlop={8}>
            <Feather name="star" size={18} color={tmpl.isFavorite ? theme.warning : theme.textMuted} />
          </Pressable>
          <Pressable onPress={() => handleDelete(tmpl)} hitSlop={8}>
            <Feather name="trash-2" size={16} color={theme.danger} />
          </Pressable>
          <Feather name={rtlIcon("chevron-right")} size={16} color={theme.textMuted} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("workouts.myTemplates")}</Text>
          {templateLimit !== null && (
            <Text style={{ color: templates.length >= templateLimit ? theme.danger : theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>
              {templates.length} / {templateLimit} templates
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            if (atLimit) {
              router.push("/subscription" as any);
            } else {
              setShowCreate(true);
            }
          }}
          style={[styles.createBtn, { backgroundColor: atLimit ? "#448aff" : theme.primary }]}
        >
          <Feather name={atLimit ? "zap" : "plus"} size={20} color="#0f0f1a" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 40, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" as const }}
      >
        {/* Template limit warning */}
        {templateLimit !== null && templates.length >= templateLimit - 1 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Pressable
              onPress={() => router.push("/subscription" as any)}
              style={[styles.limitBanner, {
                backgroundColor: templates.length >= templateLimit ? "#ff525212" : theme.warning + "12",
                borderColor: templates.length >= templateLimit ? "#ff525244" : theme.warning + "44",
              }]}
            >
              <Feather
                name="zap"
                size={16}
                color={templates.length >= templateLimit ? "#ff5252" : theme.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: templates.length >= templateLimit ? "#ff5252" : theme.warning, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {templates.length >= templateLimit ? t("workouts.templateLimitReached") : t("workouts.almostAtLimit", { count: templates.length, limit: templateLimit })}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>
                  {t("workouts.upgradePremiumTemplates")}
                </Text>
              </View>
              <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {/* Create new template inline form */}
        {showCreate && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card style={{ gap: 12 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("workouts.newTemplate")}</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t("workouts.templateNamePlaceholder")}
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular" }]}
                autoFocus
              />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t("workouts.activityTypeLabel")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {ACTIVITY_TYPES.map((act) => {
                    const isSelected = newActivity === act.id;
                    const actColor = (theme as any)[ACTIVITY_COLORS[act.id]] || theme.primary;
                    return (
                      <Pressable
                        key={act.id}
                        onPress={() => setNewActivity(act.id)}
                        style={[styles.actChip, {
                          backgroundColor: isSelected ? actColor + "20" : theme.card,
                          borderColor: isSelected ? actColor : theme.border,
                        }]}
                      >
                        <Feather name={act.icon} size={14} color={isSelected ? actColor : theme.textMuted} />
                        <Text style={{ color: isSelected ? actColor : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                          {t(act.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium" }}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold" }}>
                    {createMutation.isPending ? t("workouts.creating") : t("workouts.createBtn")}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}

        {isLoading && (
          <View style={{ gap: 10, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ height: 72, borderRadius: 14, backgroundColor: theme.card, padding: 16, gap: 8 }}>
                <View style={{ width: 120, height: 13, borderRadius: 6, backgroundColor: theme.border }} />
                <View style={{ width: 80, height: 10, borderRadius: 5, backgroundColor: theme.border + "88" }} />
              </View>
            ))}
          </View>
        )}

        {/* Starred */}
        {favorites.length > 0 && (
          <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.5 }}>
              {t("workouts.favourites")}
            </Text>
            {favorites.map((tmpl) => <TemplateRow key={tmpl.id} tmpl={tmpl} />)}
          </Animated.View>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8 }}>
            {favorites.length > 0 && (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.5 }}>
                {t("workouts.allTemplatesLabel")}
              </Text>
            )}
            {rest.map((tmpl) => <TemplateRow key={tmpl.id} tmpl={tmpl} />)}
          </Animated.View>
        )}

        {/* Empty state */}
        {!isLoading && templates.length === 0 && !showCreate && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.secondaryDim }]}>
              <Feather name="bookmark" size={30} color={theme.secondary} />
            </View>
            <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 17, textAlign: "center" }}>
              {t("workouts.noTemplatesYet")}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {t("workouts.saveWorkoutAsTemplate")}
            </Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.createEmptyBtn, { backgroundColor: theme.secondaryDim, borderColor: theme.secondary + "50" }]}
            >
              <Feather name="plus" size={14} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("workouts.newTemplate")}</Text>
            </Pressable>
          </Animated.View>
        )}
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
  navTitle: { fontSize: 20, textAlign: "center" },
  limitBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  createBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  actChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyContainer: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyIcon: { width: 70, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  createEmptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
});
