import React, { useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, Platform, Modal, Share, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as ExpoSharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useTheme } from "@/hooks/useTheme";
import { rtlIcon } from "@/lib/rtl";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { SkeletonBox } from "@/components/SkeletonBox";
import { WeeklyBarChart, type DayStat } from "@/components/WeeklyBarChart";
import { ShareCard } from "@/components/ShareCard";

const isWeb = Platform.OS === "web";
const WEB_TOP = 67;

function DeltaBadge({ prev, curr, unit = "" }: { prev: number; curr: number; unit?: string }) {
  const { theme } = useTheme();
  if (!prev || !curr) return null;
  const delta = curr - prev;
  const better = delta >= 0;
  const color = better ? theme.primary : theme.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
      <Feather name={better ? "arrow-up-right" : "arrow-down-right"} size={10} color={color} />
      <Text style={{ color, fontFamily: "Inter_500Medium", fontSize: 10 }}>
        {better ? "+" : ""}{Math.round(delta)}{unit} vs last week
      </Text>
    </View>
  );
}

function StatTile({
  label, value, unit = "", prev, theme, accent,
}: {
  label: string; value: number | null; unit?: string; prev?: number; theme: any; accent?: string;
}) {
  const color = accent ?? theme.primary;
  if (value === null || value === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, gap: 3 }}>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{label}</Text>
        <Text style={{ color: theme.textMuted, fontFamily: "Inter_700Bold", fontSize: 22 }}>—</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, gap: 3 }}>
      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{label}</Text>
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 22 }}>
        {Math.round(value)}{unit}
      </Text>
      {prev ? <DeltaBadge prev={prev} curr={value} unit={unit} /> : null}
    </View>
  );
}

export default function WeeklyReportScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const shareCardRef = useRef<View>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["weeklyReport"],
    queryFn: api.getWeeklyReport,
    staleTime: 5 * 60 * 1000,
  });

  async function handleShare() {
    setIsSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: "png", quality: 1 });
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.download = "fitlog-weekly-report.png";
        link.href = uri;
        link.click();
      } else {
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your weekly report" });
        } else {
          await Share.share({ url: uri, title: "FitLog Weekly Report" });
        }
      }
    } catch {
    } finally {
      setIsSharing(false);
      setShareModalVisible(false);
    }
  }

  const thisWeek = data?.thisWeek;
  const lastWeek = data?.lastWeek;
  const bestLift = data?.bestLiftImprovement;
  const insights: string[] = data?.insights ?? [];
  const barData: DayStat[] = (thisWeek?.barData ?? []).map((d: any) => ({
    dayLabel: d.dayLabel,
    activeMinutes: d.activeMinutes,
    isToday: d.isToday,
    valueLabel: d.activeMinutes > 0 ? `${d.activeMinutes}m` : undefined,
  }));

  const shareStats = [
    { label: t("weeklyReport.workouts"), value: String(thisWeek?.workoutsCompleted ?? 0) },
    ...(thisWeek?.streak > 0 ? [{ label: t("weeklyReport.streakDays"), value: `${thisWeek.streak}🔥`, accent: true }] : []),
    ...(thisWeek?.avgCalories > 0 ? [{ label: t("weeklyReport.avgCalories"), value: `${thisWeek.avgCalories} kcal` }] : []),
    ...(thisWeek?.avgProtein > 0 ? [{ label: t("weeklyReport.avgProtein"), value: `${thisWeek.avgProtein}g` }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={isWeb ? [] : ["top"]}>
      <View style={{ paddingTop: isWeb ? WEB_TOP : 0, flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name={rtlIcon("chevron-left")} size={24} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, flex: 1 }}>
            {t("weeklyReport.title")}
          </Text>
          {!isLoading && data && (
            <Pressable
              onPress={() => setShareModalVisible(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.secondaryDim, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
            >
              <Feather name="share-2" size={14} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t("common.share")}</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <SkeletonBox height={80} borderRadius={14} style={{ flex: 1 }} />
                <SkeletonBox height={80} borderRadius={14} style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <SkeletonBox height={80} borderRadius={14} style={{ flex: 1 }} />
                <SkeletonBox height={80} borderRadius={14} style={{ flex: 1 }} />
              </View>
              <SkeletonBox height={170} borderRadius={14} />
              <SkeletonBox height={120} borderRadius={14} />
            </>
          ) : error ? (
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Feather name="wifi-off" size={32} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" }}>
                {t("weeklyReport.failedToLoad")}
              </Text>
              <Pressable
                onPress={() => refetch()}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: "#0f0f1a", fontFamily: "Inter_700Bold", fontSize: 14 }}>{t("common.retry")}</Text>
              </Pressable>
            </View>
          ) : !data || thisWeek?.workoutsCompleted === 0 && thisWeek?.avgCalories === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: theme.secondaryDim, alignItems: "center", justifyContent: "center" }}>
                <Feather name="bar-chart-2" size={28} color={theme.secondary} />
              </View>
              <Text style={{ color: theme.text, fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" }}>
                {t("weeklyReport.noDataTitle")}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 }}>
                {t("weeklyReport.noDataDesc")}
              </Text>
            </View>
          ) : (
            <>
              {/* Stats Grid */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatTile
                  label={t("weeklyReport.workoutsCompleted")}
                  value={thisWeek?.workoutsCompleted ?? null}
                  prev={lastWeek?.workoutsCompleted}
                  theme={theme}
                  accent={theme.primary}
                />
                <StatTile
                  label={t("weeklyReport.streakDays")}
                  value={thisWeek?.streak ?? null}
                  theme={theme}
                  accent="#ffab40"
                  unit=" days"
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatTile
                  label={t("weeklyReport.avgCalories")}
                  value={thisWeek?.avgCalories || null}
                  prev={lastWeek?.avgCalories}
                  theme={theme}
                  accent={theme.secondary}
                  unit=" kcal"
                />
                <StatTile
                  label={t("weeklyReport.avgProtein")}
                  value={thisWeek?.avgProtein || null}
                  prev={lastWeek?.avgProtein}
                  theme={theme}
                  accent={theme.secondary}
                  unit="g"
                />
              </View>

              {/* Weight change */}
              {data?.weightChangeKg !== null && data?.weightChangeKg !== undefined && (
                <Card style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name="trending-up" size={16} color={data.weightChangeKg <= 0 ? theme.primary : theme.warning} />
                    <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {t("weeklyReport.weightChange")}
                    </Text>
                  </View>
                  <Text style={{ color: data.weightChangeKg < 0 ? theme.primary : theme.warning, fontFamily: "Inter_700Bold", fontSize: 22 }}>
                    {data.weightChangeKg > 0 ? "+" : ""}{data.weightChangeKg} kg
                  </Text>
                </Card>
              )}

              {/* Best lift improvement */}
              {bestLift && (
                <Card style={{ gap: 6, borderColor: theme.primary + "30" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.primaryDim, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="award" size={15} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{t("weeklyReport.bestLiftImprovement")}</Text>
                      <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{bestLift.exerciseName}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 18 }}>+{bestLift.deltaKg.toFixed(1)}kg</Text>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 11 }}>{bestLift.prevKg} → {bestLift.newKg} kg</Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* Bar chart */}
              <Card style={{ gap: 12 }}>
                <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("weeklyReport.workoutActivity")}</Text>
                <WeeklyBarChart data={barData} emptyMessage={t("weeklyReport.noWorkoutsThisWeek")} />
              </Card>

              {/* AI Insights */}
              {insights.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.text, fontFamily: "Inter_600SemiBold", fontSize: 14, paddingHorizontal: 2 }}>
                    {t("weeklyReport.insights")}
                  </Text>
                  {insights.map((insight, i) => (
                    <Card key={i} style={{ gap: 8, flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.secondaryDim, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        <Feather name="cpu" size={14} color={theme.secondary} />
                      </View>
                      <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 }}>
                        {insight}
                      </Text>
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000000cc", alignItems: "center", justifyContent: "center" }}>
          <View style={{ alignItems: "center", gap: 20, paddingHorizontal: 20 }}>
            <ShareCard
              ref={shareCardRef}
              type="weekly"
              headline={`${thisWeek?.workoutsCompleted ?? 0} Workouts This Week`}
              subline={insights[0] ?? ""}
              date={new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              stats={shareStats}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setShareModalVisible(false)}
                style={{ backgroundColor: "#ffffff22", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 14 }}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                disabled={isSharing}
                style={{ backgroundColor: "#448aff", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="download" size={15} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>{t("weeklyReport.saveImage")}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
