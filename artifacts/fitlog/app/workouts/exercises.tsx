import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rtlIcon } from "@/lib/rtl";
import { EXERCISES, EXERCISE_CATEGORIES, exerciseNameKey } from "@/lib/exerciseLibrary";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function muscleKey(name: string): string {
  return "exercises.muscle_" + name.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "_");
}

function translateMuscle(name: string, t: (key: string) => string): string {
  const key = muscleKey(name);
  const translated = t(key);
  return translated === key ? name : translated;
}

const CATEGORY_ICONS: Record<string, string> = {
  chest: "heart",
  back: "arrow-down-left",
  shoulders: "chevrons-up",
  biceps: "trending-up",
  triceps: "trending-down",
  legs: "navigation",
  glutes: "circle",
  abs: "target",
  forearms: "minus",
  cardio: "zap",
  bodyweight: "user",
};

export default function ExercisesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("chest");
  const [customMuscle, setCustomMuscle] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");

  const { data: customData } = useQuery({
    queryKey: ["customExercises"],
    queryFn: api.getCustomExercises,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createCustomExercise({
      name: customName.trim(),
      category: customCategory,
      primaryMuscle: customMuscle.trim() || customCategory,
      equipment: customEquipment.trim() || "bodyweight",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customExercises"] });
      setShowCreateModal(false);
      setCustomName("");
      setCustomMuscle("");
      setCustomEquipment("");
    },
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const customExercises: any[] = customData?.exercises ?? [];

  const showCategoryGrid = !search && !selectedCategory;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of EXERCISES) {
      counts[ex.category] = (counts[ex.category] || 0) + 1;
    }
    return counts;
  }, []);

  const allExercises = useMemo(() => {
    const custom = customExercises.map((ce: any) => ({
      id: `custom-${ce.id}`,
      name: ce.name,
      category: ce.category,
      primaryMuscle: ce.primaryMuscle || ce.category,
      secondaryMuscles: ce.secondaryMuscles || [],
      difficulty: "Beginner",
      equipment: ce.equipment || "bodyweight",
      instructions: ce.instructions || [],
      commonMistakes: [],
      isCustom: true,
    }));
    return [...custom, ...EXERCISES];
  }, [customExercises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q) {
      return allExercises.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscle.toLowerCase().includes(q) ||
          e.category.includes(q)
      );
    }
    if (selectedCategory) {
      return allExercises.filter((e) => e.category === selectedCategory);
    }
    return allExercises;
  }, [search, selectedCategory, allExercises]);

  const diffColors: Record<string, string> = {
    Beginner: theme.primary,
    Intermediate: theme.secondary,
    Advanced: theme.warning || "#ffab40",
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name={rtlIcon("arrow-left")} size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {t("exercises.exercisesTitle")}
        </Text>
        <Pressable onPress={() => setShowCreateModal(true)} hitSlop={10}>
          <Feather name="plus" size={22} color={theme.primary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Feather name="search" size={15} color={theme.textMuted} />
        <TextInput
          value={search}
          onChangeText={(v) => { setSearch(v); setSelectedCategory(null); }}
          placeholder={t("exercises.searchPlaceholder")}
          placeholderTextColor={theme.textMuted}
          style={{ flex: 1, color: theme.text, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 0 }}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Category chips */}
      {!search && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={{ flexGrow: 0, flexShrink: 0 }}
        >
          <Pressable
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.chip,
              selectedCategory === null
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={{
              fontFamily: "Inter_600SemiBold", fontSize: 12,
              color: selectedCategory === null ? "#0f0f1a" : theme.text,
            }}>{t("exercises.allCategories")}</Text>
          </Pressable>
          {EXERCISE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              style={[
                styles.chip,
                selectedCategory === cat.id
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Feather
                name={(CATEGORY_ICONS[cat.id] || cat.icon) as any}
                size={12}
                color={selectedCategory === cat.id ? "#0f0f1a" : theme.textMuted}
              />
              <Text style={{
                fontFamily: "Inter_600SemiBold", fontSize: 12,
                color: selectedCategory === cat.id ? "#0f0f1a" : theme.text,
              }}>
                {t(`exercises.category${cat.id.charAt(0).toUpperCase()}${cat.id.slice(1)}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Category cards grid (default view) */}
      {showCategoryGrid ? (
        <FlatList
          data={EXERCISE_CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={{ flex: 1 }}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item: cat }) => {
            const icon = CATEGORY_ICONS[cat.id] || cat.icon;
            const count = categoryCounts[cat.id] || 0;
            return (
              <Pressable
                onPress={() => setSelectedCategory(cat.id)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: theme.primary + "18" }]}>
                  <Feather name={icon as any} size={22} color={theme.primary} />
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                  numberOfLines={1}
                >
                  {t(`exercises.category${cat.id.charAt(0).toUpperCase()}${cat.id.slice(1)}`)}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                  }}
                >
                  {count}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : (
        /* Exercise list (filtered view) */
        <View style={{ flex: 1 }}>
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: ex }) => {
            const dColor = diffColors[ex.difficulty] || theme.primary;
            const catIcon = CATEGORY_ICONS[ex.category] || (EXERCISE_CATEGORIES.find((c) => c.id === ex.category)?.icon ?? "activity");
            return (
              <Pressable
                onPress={() => router.push({ pathname: "/workouts/exercise/[id]" as any, params: { id: ex.id } })}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: dColor + "18" }]}>
                  <Feather name={catIcon as any} size={15} color={dColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {(ex as any).isCustom ? ex.name : t(exerciseNameKey(ex.id), { defaultValue: ex.name })}
                    </Text>
                    {(ex as any).isCustom && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.secondary + "20" }}>
                        <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 9 }}>
                          {t("exercises.custom", { defaultValue: "CUSTOM" })}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 }} numberOfLines={1}>
                      {translateMuscle(ex.primaryMuscle, t)}
                    </Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: dColor + "18" }}>
                      <Text style={{ color: dColor, fontFamily: "Inter_500Medium", fontSize: 10 }}>{t(`exercises.difficulty${ex.difficulty}`)}</Text>
                    </View>
                  </View>
                </View>
                <Feather name={rtlIcon("chevron-right")} size={14} color={theme.textMuted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={32} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 12, fontSize: 14 }}>
                {t("exercises.noExercisesFound")}
              </Text>
            </View>
          }
        />
        </View>
      )}

      {/* Create Custom Exercise Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                {t("exercises.createCustom", { defaultValue: "Create Exercise" })}
              </Text>
              <Pressable onPress={() => setShowCreateModal(false)} hitSlop={10}>
                <Feather name="x" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>{t("exercises.exerciseName", { defaultValue: "Exercise Name" })}</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                placeholder={t("exercises.nameExample", { defaultValue: "e.g. Cable Fly" })}
                placeholderTextColor={theme.textMuted}
                value={customName}
                onChangeText={setCustomName}
                maxLength={60}
              />

              <Text style={[styles.modalLabel, { color: theme.text }]}>{t("exercises.categoryLabel", { defaultValue: "Category" })}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCustomCategory(cat.id)}
                      style={[styles.catChip, {
                        backgroundColor: customCategory === cat.id ? theme.primary : theme.card,
                        borderColor: customCategory === cat.id ? theme.primary : theme.border,
                      }]}
                    >
                      <Text style={{ color: customCategory === cat.id ? "#0f0f1a" : theme.text, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                        {t(`exercises.category${cat.id.charAt(0).toUpperCase()}${cat.id.slice(1)}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.modalLabel, { color: theme.text }]}>{t("exercises.primaryMuscleLabel", { defaultValue: "Primary Muscle" })}</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                placeholder={t("exercises.muscleExample", { defaultValue: "e.g. Chest" })}
                placeholderTextColor={theme.textMuted}
                value={customMuscle}
                onChangeText={setCustomMuscle}
                maxLength={40}
              />

              <Text style={[styles.modalLabel, { color: theme.text }]}>{t("exercises.equipmentLabel", { defaultValue: "Equipment" })}</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                placeholder={t("exercises.equipmentExample", { defaultValue: "e.g. Cable Machine" })}
                placeholderTextColor={theme.textMuted}
                value={customEquipment}
                onChangeText={setCustomEquipment}
                maxLength={40}
              />
            </ScrollView>

            <Button
              title={t("exercises.createBtn", { defaultValue: "Create Exercise" })}
              onPress={() => customName.trim().length >= 2 && createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={customName.trim().length < 2}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 2 },
  title: { flex: 1, fontSize: 20 },
  count: { fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 32,
    minWidth: 60,
    borderRadius: 20,
    borderWidth: 1,
  },
  gridContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  gridRow: { gap: 12, marginBottom: 12 },
  categoryCard: {
    flex: 1,
    maxHeight: 130,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_500Medium" },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
});
