import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { rtlIcon } from "@/lib/rtl";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const TYPE_ICONS: Record<string, string> = { streak: "zap", volume: "trending-up", consistency: "target" };

export default function ChallengeDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["challenges", id],
    queryFn: () => api.getChallenge(parseInt(id, 10)),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.joinChallenge(parseInt(id, 10)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenges", id] }),
    onError: (err: any) => Alert.alert(t("common.error"), err.message),
  });

  const challenge = data?.challenge;
  const leaderboard: any[] = data?.leaderboard ?? [];
  const isParticipant = data?.isParticipant ?? false;
  const isActive = challenge?.status === "active";
  const daysLeft = challenge ? Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000)) : 0;
  const totalDays = challenge ? Math.max(1, Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / 86400000)) : 1;
  const progressPct = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100));

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="alert-circle" size={48} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted, marginTop: 12, fontFamily: "Inter_500Medium" }}>
          {t("challenges.notFound", { defaultValue: "Challenge not found" })}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name={rtlIcon("arrow-left")} size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>{challenge.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Challenge Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={[styles.typeIcon, { backgroundColor: theme.primaryDim }]}>
              <Feather name={(TYPE_ICONS[challenge.type] ?? "flag") as any} size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeTitle, { color: theme.text }]}>{challenge.title}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                {t(`challenges.type.${challenge.type}`, { defaultValue: challenge.type })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? theme.primary + "20" : theme.border + "40" }]}>
              <Text style={{ color: isActive ? theme.primary : theme.textMuted, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                {isActive ? t("challenges.active", { defaultValue: "Active" }) : t(`challenges.status.${challenge.status}`, { defaultValue: challenge.status })}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.progressRow}>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                {t("challenges.progress", { defaultValue: "Progress" })}
              </Text>
              <Text style={{ color: theme.text, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{progressPct}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                {t("challenges.target", { defaultValue: "Target" })}
              </Text>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: "Inter_700Bold" }}>{challenge.target_value}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                {t("challenges.daysLeftLabel", { defaultValue: "Days Left" })}
              </Text>
              <Text style={{ color: isActive ? theme.primary : theme.textMuted, fontSize: 18, fontFamily: "Inter_700Bold" }}>{daysLeft}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                {t("challenges.participants", { defaultValue: "Participants" })}
              </Text>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: "Inter_700Bold" }}>{leaderboard.length}</Text>
            </View>
          </View>
        </Card>

        {/* Join Button (if not participant) */}
        {!isParticipant && isActive && (
          <Button
            title={t("challenges.join", { defaultValue: "Join Challenge" })}
            onPress={() => joinMutation.mutate()}
            loading={joinMutation.isPending}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Leaderboard */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("challenges.leaderboard", { defaultValue: "Leaderboard" })}
        </Text>
        {leaderboard.length === 0 ? (
          <Card style={{ padding: 24, alignItems: "center" }}>
            <Feather name="users" size={32} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8 }}>
              {t("challenges.noParticipants", { defaultValue: "No participants yet" })}
            </Text>
          </Card>
        ) : (
          leaderboard.map((entry: any, index: number) => {
            const isTop3 = index < 3;
            const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];
            return (
              <Card key={entry.userId ?? index} style={styles.leaderRow}>
                <View style={styles.leaderInner}>
                  <View style={[styles.rankCircle, { backgroundColor: isTop3 ? medals[index] + "30" : theme.card }]}>
                    <Text style={{ color: isTop3 ? medals[index] : theme.textMuted, fontSize: 14, fontFamily: "Inter_700Bold" }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={[styles.avatar, { backgroundColor: theme.primaryDim }]}>
                    <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                      {entry.firstName?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {entry.firstName} {entry.lastName}
                    </Text>
                  </View>
                  <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    {entry.progressValue ?? 0}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  infoCard: { padding: 16, marginBottom: 16 },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  challengeTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", marginTop: 16 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 32, alignSelf: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  leaderRow: { marginBottom: 6, padding: 12 },
  leaderInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
