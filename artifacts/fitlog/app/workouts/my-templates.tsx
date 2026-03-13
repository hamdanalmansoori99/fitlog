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
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";

const ACTIVITY_COLORS: Record<string, string> = {
  cycling: "secondary", running: "primary", walking: "cyan",
  gym: "purple", swimming: "secondary", tennis: "warning", yoga: "pink", other: "textMuted",
};
const ACTIVITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cycling: "wind", running: "activity", walking: "navigation",
  gym: "zap", swimming: "droplet", tennis: "circle", yoga: "heart", other: "activity",
};
const ACTIVITY_TYPES = [
  { id: "gym", label: "Gym / Weights", icon: "zap" as const },
  { id: "running", label: "Running", icon: "activity" as const },
  { id: "cycling", label: "Cycling", icon: "wind" as const },
  { id: "walking", label: "Walking", icon: "navigation" as const },
  { id: "swimming", label: "Swimming", icon: "droplet" as const },
  { id: "yoga", label: "Yoga", icon: "heart" as const },
  { id: "tennis", label: "Tennis", icon: "circle" as const },
  { id: "other", label: "Other", icon: "more-horizontal" as const },
];

export default function MyTemplatesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newActivity, setNewActivity] = useState("gym");

  const { data, isLoading } = useQuery({
    queryKey: ["userTemplates"],
    queryFn: api.getUserTemplates,
  });

  const templates: any[] = data?.templates || [];
  const favorites = templates.filter((t) => t.isFavorite);
  const rest = templates.filter((t) => !t.isFavorite);

  const createMutation = useMutation({
    mutationFn: () => api.createUserTemplate({ name: newName.trim() || "My Template", activityType: newActivity }),
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
    Alert.alert("Delete Template?", `"${tmpl.name}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(tmpl.id) },
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
          <Feather name="chevron-right" size={16} color={theme.textMuted} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: topPad + 8, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>My Templates</Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={[styles.createBtn, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={20} color="#0f0f1a" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
      >
        {/* Create new template inline form */}
        {showCreate && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card style={{ gap: 12 }}>
              <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>New Template</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Template name (e.g. Push Day A)"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, fontFamily: "Inter_400Regular" }]}
                autoFocus
              />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>Activity type</Text>
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
                          {act.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold" }}>
                    {createMutation.isPending ? "Creating…" : "Create"}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}

        {isLoading && (
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20 }}>
            Loading…
          </Text>
        )}

        {/* Starred */}
        {favorites.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ gap: 8 }}>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.5 }}>
              FAVOURITES
            </Text>
            {favorites.map((tmpl) => <TemplateRow key={tmpl.id} tmpl={tmpl} />)}
          </Animated.View>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ gap: 8 }}>
            {favorites.length > 0 && (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.5 }}>
                ALL TEMPLATES
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
              No templates yet
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Save any workout as a template so you can quickly reuse it later.
            </Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.createEmptyBtn, { backgroundColor: theme.secondaryDim, borderColor: theme.secondary + "50" }]}
            >
              <Feather name="plus" size={14} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Create Template</Text>
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
  navTitle: { flex: 1, fontSize: 20, marginHorizontal: 8 },
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
