import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const TYPES = ["Cardio", "Strength", "Flexibility", "Accessory", "Other"];

export default function AddEquipmentScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const mutation = useMutation({
    mutationFn: api.createEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      router.back();
    },
  });

  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 17 }}>Add Equipment</Text>
      </View>
      <View style={{ padding: 20, gap: 14 }}>
        <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Barbell" />
        <Input label="Brand (optional)" value={brand} onChangeText={setBrand} placeholder="e.g. Rogue" />
        <View>
          <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TYPES.map(t => (
              <Pressable key={t} onPress={() => setType(type === t ? "" : t)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: type === t ? theme.primary : theme.border, backgroundColor: type === t ? theme.primaryDim : "transparent" }}>
                <Text style={{ color: type === t ? theme.primary : theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Purchase date, condition..." />
        <Button title="Add Equipment" onPress={() => mutation.mutate({ name, type: type || "Other", brand: brand || undefined, notes: notes || undefined })} loading={mutation.isPending} />
      </View>
    </View>
  );
}
