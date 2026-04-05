import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { EXERCISES, EXERCISE_CATEGORIES } from "@/lib/exerciseLibrary";

export default function ExercisesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q) {
      return EXERCISES.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscle.toLowerCase().includes(q) ||
          e.category.includes(q)
      );
    }
    if (selectedCategory) {
      return EXERCISES.filter((e) => e.category === selectedCategory);
    }
    return EXERCISES;
  }, [search, selectedCategory]);

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
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Exercises
        </Text>
        <Text style={[styles.count, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          {filtered.length}
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Feather name="search" size={15} color={theme.textMuted} />
        <TextInput
          value={search}
          onChangeText={(v) => { setSearch(v); setSelectedCategory(null); }}
          placeholder="Search exercises, muscles…"
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
            }}>All</Text>
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
                name={cat.icon as any}
                size={12}
                color={selectedCategory === cat.id ? "#0f0f1a" : theme.textMuted}
              />
              <Text style={{
                fontFamily: "Inter_600SemiBold", fontSize: 12,
                color: selectedCategory === cat.id ? "#0f0f1a" : theme.text,
              }}>
                {cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Exercise list */}
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: ex }) => {
          const dColor = diffColors[ex.difficulty] || theme.primary;
          const catIcon = EXERCISE_CATEGORIES.find((c) => c.id === ex.category)?.icon ?? "activity";
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
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }} numberOfLines={1}>
                  {ex.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 }} numberOfLines={1}>
                    {ex.primaryMuscle}
                  </Text>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: dColor + "18" }}>
                    <Text style={{ color: dColor, fontFamily: "Inter_500Medium", fontSize: 10 }}>{ex.difficulty}</Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={14} color={theme.textMuted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={32} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 12, fontSize: 14 }}>
              No exercises found
            </Text>
          </View>
        }
      />
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
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
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
});
