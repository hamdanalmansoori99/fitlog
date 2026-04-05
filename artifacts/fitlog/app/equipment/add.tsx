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
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "react-i18next";

const EQUIPMENT_IDS = [
  { id: "dumbbells", labelKey: "equipment.dumbbells", icon: "zap" as const },
  { id: "barbell", labelKey: "equipment.barbell", icon: "minus" as const },
  { id: "bench", labelKey: "equipment.bench", icon: "layout" as const },
  { id: "pullup_bar", labelKey: "equipment.pullupBar", icon: "chevrons-up" as const },
  { id: "resistance_bands", labelKey: "equipment.resistanceBands", icon: "link" as const },
  { id: "kettlebells", labelKey: "equipment.kettlebells", icon: "disc" as const },
  { id: "cable_machine", labelKey: "equipment.cableMachine", icon: "anchor" as const },
  { id: "smith_machine", labelKey: "equipment.smithMachine", icon: "sliders" as const },
  { id: "leg_press", labelKey: "equipment.legPress", icon: "chevron-down" as const },
  { id: "treadmill", labelKey: "equipment.treadmill", icon: "activity" as const },
  { id: "stationary_bike", labelKey: "equipment.stationaryBike", icon: "wind" as const },
  { id: "rowing_machine", labelKey: "equipment.rowingMachine", icon: "navigation" as const },
  { id: "jump_rope", labelKey: "equipment.jumpRope", icon: "repeat" as const },
  { id: "swimming_pool", labelKey: "equipment.swimmingPool", icon: "droplet" as const },
];

export default function AddEquipmentScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
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
      showToast(t("equipment.equipmentAdded"), "success");
      router.back();
    },
    onError: () => showToast(t("equipment.failedToAdd"), "error"),
  });

  const selectedOption = EQUIPMENT_IDS.find(o => o.id === category);

  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 17 }}>{t("equipment.addEquipment")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Input label={t("equipment.customName")} value={name} onChangeText={setName} placeholder={t("equipment.customNamePlaceholder")} />

        <View>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 }}>
            {t("equipment.equipmentType")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EQUIPMENT_IDS.map(opt => {
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
                    {t(opt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input label={t("equipment.notesOptional")} value={notes} onChangeText={setNotes} placeholder={t("equipment.notesPlaceholder")} />

        <Button
          title={t("equipment.addEquipment")}
          onPress={() => {
            if (!category) return;
            mutation.mutate({
              name: name.trim() || (selectedOption ? t(selectedOption.labelKey) : category),
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
