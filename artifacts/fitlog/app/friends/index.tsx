import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: api.getFriends,
  });

  const addMutation = useMutation({
    mutationFn: (code: string) => api.addFriend(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setInviteCode("");
      setShowAddForm(false);
      Alert.alert(t("friends.requestSent", { defaultValue: "Friend request sent!" }));
    },
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.acceptFriend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.removeFriend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const friends = data?.friends ?? [];
  const accepted = friends.filter((f: any) => f.status === "accepted");
  const incoming = friends.filter((f: any) => f.isIncoming);
  const outgoing = friends.filter((f: any) => f.status === "pending" && !f.isIncoming);

  const renderFriend = ({ item }: { item: any }) => (
    <Card style={styles.friendCard}>
      <View style={styles.friendRow}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryDim }]}>
          <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>
            {item.firstName?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.friendName, { color: theme.text }]}>{item.firstName} {item.lastName}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.xp} XP</Text>
        </View>
        {item.status === "accepted" && (
          <Pressable onPress={() => removeMutation.mutate(item.id)} hitSlop={8}>
            <Feather name="user-minus" size={18} color={theme.danger} />
          </Pressable>
        )}
        {item.isIncoming && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => acceptMutation.mutate(item.id)} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
              <Feather name="check" size={16} color="#fff" />
            </Pressable>
            <Pressable onPress={() => removeMutation.mutate(item.id)} style={[styles.actionBtn, { backgroundColor: theme.danger }]}>
              <Feather name="x" size={16} color="#fff" />
            </Pressable>
          </View>
        )}
        {item.status === "pending" && !item.isIncoming && (
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t("friends.pending", { defaultValue: "Pending" })}</Text>
        )}
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t("friends.title", { defaultValue: "Friends" })}</Text>
        <Pressable onPress={() => setShowAddForm(!showAddForm)} hitSlop={12}>
          <Feather name="user-plus" size={22} color={theme.primary} />
        </Pressable>
      </View>

      {showAddForm && (
        <Card style={styles.addForm}>
          <Text style={[styles.addLabel, { color: theme.text }]}>{t("friends.addByCode", { defaultValue: "Add friend by invite code" })}</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              placeholder={t("friends.enterCode", { defaultValue: "Enter invite code" })}
              placeholderTextColor={theme.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Button
              title={t("friends.add", { defaultValue: "Add" })}
              onPress={() => inviteCode.trim() && addMutation.mutate(inviteCode.trim())}
              loading={addMutation.isPending}
              style={{ minWidth: 70 }}
            />
          </View>
        </Card>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[
            ...(incoming.length > 0 ? [{ type: "header", label: t("friends.incomingRequests", { defaultValue: "Incoming Requests" }) }] : []),
            ...incoming.map((f: any) => ({ type: "friend", ...f })),
            ...(outgoing.length > 0 ? [{ type: "header", label: t("friends.sentRequests", { defaultValue: "Sent Requests" }) }] : []),
            ...outgoing.map((f: any) => ({ type: "friend", ...f })),
            ...(accepted.length > 0 ? [{ type: "header", label: t("friends.myFriends", { defaultValue: "My Friends" }) }] : []),
            ...accepted.map((f: any) => ({ type: "friend", ...f })),
          ]}
          keyExtractor={(item: any, i) => item.id?.toString() ?? `header-${i}`}
          renderItem={({ item }: any) => {
            if (item.type === "header") {
              return <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{item.label}</Text>;
            }
            return renderFriend({ item });
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {t("friends.noFriendsYet", { defaultValue: "No friends yet. Share your invite code or add a friend!" })}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addForm: { marginHorizontal: 16, marginBottom: 8, padding: 16 },
  addLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8, textTransform: "uppercase" },
  friendCard: { marginBottom: 8 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  friendName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", marginTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
