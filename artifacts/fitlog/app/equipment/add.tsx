import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const EQUIPMENT_OPTIONS = [
  { id: "dumbbells", label: "Dumbbells", icon: "zap" as const },
  { id: "barbell", label: "Barbell", icon: "minus" as const },
  { id: "bench", label: "Bench", icon: "layout" as const },
  { id: "pullup_bar", label: "Pull-up bar", icon: "chevrons-up" as const },
  { id: "resistance_bands", label: "Resistance bands", icon: "link" as const },
  { id: "kettlebells", label: "Kettlebells", icon: "disc" as const },
  { id: "cable_machine", label: "Cable machine", icon: "anchor" as const },
  { id: "smith_machine", label: "Smith machine", icon: "sliders" as const },
  { id: "leg_press", label: "Leg press", icon: "chevron-down" as const },
  { id: "treadmill", label: "Treadmill", icon: "activity" as const },
  { id: "stationary_bike", label: "Stationary bike", icon: "wind" as const },
  { id: "rowing_machine", label: "Rowing machine", icon: "navigation" as const },
  { id: "yoga_mat", label: "Yoga mat", icon: "heart" as const },
  { id: "jump_rope", label: "Jump rope", icon: "repeat" as const },
  { id: "tennis_racket", label: "Tennis racket", icon: "circle" as const },
  { id: "swimming_pool", label: "Swimming pool", icon: "droplet" as const },
];

export default function AddEquipmentScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  const mutation = useMutation({
    mutationFn: api.createEquipment,
    onSuccess: async () => {
      const existing: string[] = profileData?.availableEquipment ?? [];
      if (category && !existing.includes(category)) {
        await api.updateProfile({ availableEquipment: [...existing, category] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      router.back();
    },
  });

  const selectedOption = EQUIPMENT_OPTIONS.find(o => o.id === category);

  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 17 }}>Add Equipment</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Input label="Custom name (optional)" value={name} onChangeText={setName} placeholder="e.g. My Rogue Barbell" />

        <View>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 }}>
            Equipment type *
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EQUIPMENT_OPTIONS.map(opt => {
              const selected = category === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setCategory(selected ? "" : opt.id)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: 20, borderWidth: 1.5,
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected ? theme.primaryDim : "transparent",
                  }}
                >
                  <Feather name={opt.icon} size={13} color={selected ? theme.primary : theme.textMuted} />
                  <Text style={{ color: selected ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Purchase date, condition..." />

        <Button
          title="Add Equipment"
          onPress={() => {
            if (!category) return;
            mutation.mutate({
              name: name.trim() || selectedOption?.label || category,
              category,
              notes: notes || undefined,
            });
          }}
          disabled={!category}
          loading={mutation.isPending}
        />
      </ScrollView>
    </View>
  );
}
