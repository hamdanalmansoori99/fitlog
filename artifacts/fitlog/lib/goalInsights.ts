import i18n from "@/i18n";
import { dateLocale } from "@/lib/rtl";

export interface GoalInsight {
  id: string;
  goalKey: GoalKey;
  goalLabel: string;
  goalIcon: string;
  icon: string;
  headline: string;
  value: string;
  detail: string;
  progress: number;
  progressLabel?: string;
  trend: "up" | "down" | "flat" | null;
  trendPositive: boolean;
  accentColor: string;
}

export type GoalKey = "lose_weight" | "build_muscle" | "endurance" | "flexibility" | "stay_active";

export interface GoalInsightsInput {
  goals: string[];
  profile: {
    calorieGoal?: number | null;
    proteinGoalG?: number | null;
    weeklyWorkoutDays?: number | null;
  };
  workouts: Array<{
    activityType: string;
    durationMinutes?: number | null;
    date: string;
    name?: string | null;
  }>;
  nutritionStats?: {
    avg7DayCalories: number;
    avg30DayCalories: number;
    macroSplit: { proteinPercentage: number; carbsPercentage: number; fatPercentage: number };
    dailyCalories: Array<{ date: string; calories: number; goal: number | null }>;
  };
  streaks?: {
    currentWorkoutStreak: number;
    longestWorkoutStreak: number;
    currentMealStreak: number;
  };
  records?: Array<{ label: string; value: string; date: string | null; activityType: string }>;
  recovery?: {
    sleepQuality?: number | null;
    energyLevel?: number | null;
    soreness?: Record<string, number>;
  };
  workoutSummary?: {
    totalThisWeek: number;
    totalThisMonth: number;
    weeklyFrequency?: Array<{ weekLabel: string; count: number }>;
    activityBreakdown?: Array<{ activityType: string; count: number; percentage: number }>;
  };
}

const t = (key: string, opts?: Record<string, any>) => i18n.t(key, opts);

const GOAL_VARIANTS: Record<GoalKey, RegExp> = {
  lose_weight: /lose weight|weight loss|fat loss|slim|cut/i,
  build_muscle: /muscle|strength|bulk|gain|lift/i,
  endurance: /endurance|cardio|running|stamina|marathon|cycling/i,
  flexibility: /flex|yoga|mobility|stretch|pilates/i,
  stay_active: /active|health|wellness|general|stay fit/i,
};

function getGoalLabel(key: GoalKey): string {
  return t(`goalInsights.goalLabels.${key}`);
}

const GOAL_ICONS: Record<GoalKey, string> = {
  lose_weight: "trending-down",
  build_muscle: "zap",
  endurance: "wind",
  flexibility: "rotate-cw",
  stay_active: "heart",
};

const GOAL_COLORS: Record<GoalKey, string> = {
  lose_weight: "#00e676",
  build_muscle: "#448aff",
  endurance: "#ff6d00",
  flexibility: "#ce93d8",
  stay_active: "#ef5350",
};

export function detectGoalKeys(goals: string[]): GoalKey[] {
  const keys: GoalKey[] = [];
  for (const [key, regex] of Object.entries(GOAL_VARIANTS) as [GoalKey, RegExp][]) {
    if (goals.some((g) => regex.test(g))) keys.push(key);
  }
  if (keys.length === 0) keys.push("stay_active");
  return keys;
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function fmt(n: number): string {
  return n.toLocaleString(dateLocale(), { maximumFractionDigits: 0 });
}

const CARDIO_TYPES = new Set(["running", "cycling", "walking", "swimming", "rowing", "hiking", "elliptical"]);
const FLEX_TYPES = new Set(["yoga", "pilates", "stretching", "mobility"]);

function isCardio(w: { activityType: string; name?: string | null }): boolean {
  return (
    CARDIO_TYPES.has(w.activityType.toLowerCase()) ||
    /yoga|pilates|cardio/i.test(w.name || "")
  );
}

function isFlexibility(w: { activityType: string; name?: string | null }): boolean {
  return (
    FLEX_TYPES.has(w.activityType.toLowerCase()) ||
    /stretch|yoga|mobil|pilates|flex/i.test(w.name || "")
  );
}

function isGym(w: { activityType: string }) {
  return w.activityType === "gym";
}

function msAgo(date: string): number {
  return Date.now() - new Date(date).getTime();
}

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function workoutsThisWeek<T extends { date: string }>(list: T[]): T[] {
  return list.filter((w) => msAgo(w.date) < WEEK_MS);
}

function workoutsLastWeek<T extends { date: string }>(list: T[]): T[] {
  const age = (w: T) => msAgo(w.date);
  return list.filter((w) => age(w) >= WEEK_MS && age(w) < 2 * WEEK_MS);
}

function workoutsThisMonth<T extends { date: string }>(list: T[]): T[] {
  return list.filter((w) => msAgo(w.date) < 30 * DAY_MS);
}

function uniqueDays<T extends { date: string }>(list: T[]): number {
  return new Set(list.map((w) => new Date(w.date).toDateString())).size;
}

function trendCalc(current: number, previous: number): "up" | "down" | "flat" {
  if (previous === 0) return current > 0 ? "up" : "flat";
  const pct = (current - previous) / previous;
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

function pluralS(n: number): string {
  return n !== 1 ? "s" : "";
}

function loseWeightInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.lose_weight;
  const goalKey: GoalKey = "lose_weight";
  const goalLabel = getGoalLabel(goalKey);
  const goalIcon = GOAL_ICONS[goalKey];

  const calGoal = input.profile.calorieGoal ?? 2000;
  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const insights: GoalInsight[] = [];

  if (input.nutritionStats) {
    const { dailyCalories } = input.nutritionStats;
    const last7 = dailyCalories.slice(-7);
    const prev7 = dailyCalories.slice(-14, -7);
    const last7Avg = last7.reduce((s, d) => s + d.calories, 0) / Math.max(last7.length, 1);
    const prev7Avg = prev7.reduce((s, d) => s + d.calories, 0) / Math.max(prev7.length, 1);
    const logged = last7.filter((d) => d.calories > 0).length;
    const pct = calGoal > 0 ? last7Avg / calGoal : 0.8;
    const tr = trendCalc(last7Avg, prev7Avg);
    const deficit = calGoal - last7Avg;

    let detail: string;
    if (logged < 3) {
      detail = t("goalInsights.lw.logMealsConsistently");
    } else if (deficit > 100) {
      detail = t("goalInsights.lw.solidDeficit", { deficit: fmt(deficit) });
    } else if (deficit < -100) {
      detail = t("goalInsights.lw.aboveGoal", { surplus: fmt(-deficit) });
    } else {
      detail = t("goalInsights.lw.rightAtTarget");
    }

    insights.push({
      id: "lw_calories",
      goalKey, goalLabel, goalIcon,
      icon: "pie-chart",
      headline: t("goalInsights.lw.calorieTrend"),
      value: logged > 0 ? t("goalInsights.lw.kcalPerDay", { value: fmt(Math.round(last7Avg)) }) : t("goalInsights.lw.noDataYet"),
      detail,
      progress: clamp(1 - pct + 0.5),
      progressLabel: t("goalInsights.lw.goalKcal", { value: fmt(calGoal) }),
      trend: tr,
      trendPositive: false,
      accentColor: color,
    });

    if (logged >= 3 && deficit > 0) {
      const weeklyDeficit = deficit * 7;
      const deficitProgress = clamp(weeklyDeficit / 3500);
      insights.push({
        id: "lw_deficit",
        goalKey, goalLabel, goalIcon,
        icon: "minus-circle",
        headline: t("goalInsights.lw.weeklyDeficit"),
        value: t("goalInsights.lw.weeklyDeficitValue", { value: fmt(Math.round(weeklyDeficit)) }),
        detail: t("goalInsights.lw.weeklyDeficitDetail", { kg: (weeklyDeficit / 7700).toFixed(2) }),
        progress: deficitProgress,
        progressLabel: t("goalInsights.lw.weeklyDeficitLabel"),
        trend: tr,
        trendPositive: false,
        accentColor: color,
      });
    }
  }

  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  insights.push({
    id: "lw_consistency",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: t("goalInsights.lw.activityConsistency"),
    value: t("goalInsights.lw.sessionsThisWeek", { count: thisWeek.length, s: pluralS(thisWeek.length) }),
    detail: thisWeek.length >= weeklyTarget
      ? t("goalInsights.lw.weeklyGoalHit")
      : t("goalInsights.lw.moreSessionsTarget", { count: weeklyTarget - thisWeek.length, s: pluralS(weeklyTarget - thisWeek.length) }),
    progress: clamp(thisWeek.length / weeklyTarget),
    progressLabel: t("goalInsights.lw.sessionsLabel", { done: thisWeek.length, target: weeklyTarget }),
    trend: trendCalc(thisWeek.length, lastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  const cardioThisWeek = thisWeek.filter(isCardio);
  const cardioPct = thisWeek.length > 0 ? cardioThisWeek.length / thisWeek.length : 0;
  insights.push({
    id: "lw_cardio",
    goalKey, goalLabel, goalIcon,
    icon: "activity",
    headline: t("goalInsights.lw.cardioSupport"),
    value: thisWeek.length > 0
      ? t("goalInsights.lw.cardioPercent", { pct: Math.round(cardioPct * 100) })
      : t("goalInsights.lw.noSessionsLogged"),
    detail: cardioPct >= 0.5
      ? t("goalInsights.lw.goodCardioMix")
      : cardioThisWeek.length === 0
      ? t("goalInsights.lw.addCardioSession")
      : t("goalInsights.lw.aimForCardio"),
    progress: clamp(cardioPct),
    progressLabel: t("goalInsights.lw.cardioLabel", { done: cardioThisWeek.length, total: thisWeek.length }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

function buildMuscleInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.build_muscle;
  const goalKey: GoalKey = "build_muscle";
  const goalLabel = getGoalLabel(goalKey);
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const proteinGoal = input.profile.proteinGoalG ?? 150;
  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const gymThisWeek = thisWeek.filter(isGym);
  const gymLastWeek = lastWeek.filter(isGym);

  if (input.nutritionStats) {
    const { avg7DayCalories, macroSplit } = input.nutritionStats;
    if (!macroSplit) return insights;
    const estimatedDailyProtein = (macroSplit.proteinPercentage / 100) * avg7DayCalories / 4;
    const proteinPct = proteinGoal > 0 ? estimatedDailyProtein / proteinGoal : 0.7;
    const logged = input.nutritionStats.dailyCalories.slice(-7).filter((d) => d.calories > 0).length;

    insights.push({
      id: "bm_protein",
      goalKey, goalLabel, goalIcon,
      icon: "droplet",
      headline: t("goalInsights.bm.proteinIntake"),
      value: logged > 0 ? t("goalInsights.bm.proteinPerDay", { value: Math.round(estimatedDailyProtein) }) : t("goalInsights.lw.noDataYet"),
      detail: logged < 3
        ? t("goalInsights.bm.logMealsProtein")
        : estimatedDailyProtein >= proteinGoal * 0.9
        ? t("goalInsights.bm.hittingProteinGoal", { goal: proteinGoal })
        : t("goalInsights.bm.belowProteinTarget", { shortfall: Math.round(proteinGoal - estimatedDailyProtein) }),
      progress: clamp(proteinPct),
      progressLabel: t("goalInsights.bm.goalProtein", { value: proteinGoal }),
      trend: null,
      trendPositive: true,
      accentColor: color,
    });
  }

  insights.push({
    id: "bm_frequency",
    goalKey, goalLabel, goalIcon,
    icon: "repeat",
    headline: t("goalInsights.bm.trainingFrequency"),
    value: t("goalInsights.bm.gymSessionsWeek", { count: gymThisWeek.length, s: pluralS(gymThisWeek.length) }),
    detail: gymThisWeek.length >= weeklyTarget
      ? t("goalInsights.bm.frequencyOnPoint")
      : t("goalInsights.bm.targetSessions", { target: weeklyTarget }),
    progress: clamp(gymThisWeek.length / Math.max(weeklyTarget, 1)),
    progressLabel: t("goalInsights.lw.sessionsLabel", { done: gymThisWeek.length, target: weeklyTarget }),
    trend: trendCalc(gymThisWeek.length, gymLastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  if (input.records && input.records.length > 0) {
    const liftRecords = input.records.filter((r) => r.activityType === "gym");
    insights.push({
      id: "bm_progression",
      goalKey, goalLabel, goalIcon,
      icon: "trending-up",
      headline: t("goalInsights.bm.weightProgression"),
      value: liftRecords.length > 0 ? t("goalInsights.bm.prsTracked", { count: liftRecords.length, s: pluralS(liftRecords.length) }) : t("goalInsights.bm.logWorkoutsWeights"),
      detail: liftRecords.length > 0
        ? t("goalInsights.bm.latestPR", { value: liftRecords[0].value, label: liftRecords[0].label.replace("Best ", "") })
        : t("goalInsights.bm.startTrackingWeights"),
      progress: clamp(Math.min(liftRecords.length / 5, 1)),
      progressLabel: t("goalInsights.bm.upToLifts"),
      trend: null,
      trendPositive: true,
      accentColor: color,
    });
  }

  if (input.recovery) {
    const { sleepQuality, energyLevel, soreness = {} } = input.recovery;
    const highSore = Object.values(soreness).filter((v) => v >= 2).length;
    const sleepScore = sleepQuality ?? 3;
    const energyScore = energyLevel ?? 3;
    const score = Math.round(((sleepScore + energyScore) / 10) * 10) / 10;
    const scoreOutOf10 = Math.round((sleepScore + energyScore));

    insights.push({
      id: "bm_recovery",
      goalKey, goalLabel, goalIcon,
      icon: "moon",
      headline: t("goalInsights.bm.recoveryQuality"),
      value: sleepQuality != null ? t("goalInsights.bm.recoveryScore", { score: scoreOutOf10 }) : t("goalInsights.bm.checkInRecovery"),
      detail: sleepQuality == null
        ? t("goalInsights.bm.logRecoveryDaily")
        : highSore >= 3
        ? t("goalInsights.bm.heavySoreness")
        : score >= 0.7
        ? t("goalInsights.bm.wellRested")
        : t("goalInsights.bm.decentRecovery"),
      progress: clamp(score),
      progressLabel: t("goalInsights.bm.sleepEnergy", { sleep: sleepScore, energy: energyScore }),
      trend: null,
      trendPositive: true,
      accentColor: color,
    });
  }

  return insights;
}

function enduranceInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.endurance;
  const goalKey: GoalKey = "endurance";
  const goalLabel = getGoalLabel(goalKey);
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);

  const cardioThisWeek = thisWeek.filter(isCardio);
  const cardioLastWeek = lastWeek.filter(isCardio);
  const cardioMinsThisWeek = cardioThisWeek.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  const cardioMinsLastWeek = cardioLastWeek.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  const WHO_TARGET = 150;

  insights.push({
    id: "end_minutes",
    goalKey, goalLabel, goalIcon,
    icon: "clock",
    headline: t("goalInsights.end.weeklyCardioVolume"),
    value: t("goalInsights.end.minThisWeek", { min: cardioMinsThisWeek }),
    detail: cardioMinsThisWeek >= WHO_TARGET
      ? t("goalInsights.end.whoTargetHit", { target: WHO_TARGET })
      : t("goalInsights.end.minAwayTarget", { min: WHO_TARGET - cardioMinsThisWeek }),
    progress: clamp(cardioMinsThisWeek / WHO_TARGET),
    progressLabel: t("goalInsights.end.minLabel", { done: cardioMinsThisWeek, target: WHO_TARGET }),
    trend: trendCalc(cardioMinsThisWeek, cardioMinsLastWeek),
    trendPositive: true,
    accentColor: color,
  });

  const cardioDays = uniqueDays(cardioThisWeek);
  insights.push({
    id: "end_days",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: t("goalInsights.end.activeDays"),
    value: t("goalInsights.end.cardioDays", { count: cardioDays, s: pluralS(cardioDays) }),
    detail: cardioDays >= 4
      ? t("goalInsights.end.fourPlusDays")
      : t("goalInsights.end.aimForFour"),
    progress: clamp(cardioDays / 5),
    progressLabel: t("goalInsights.end.targetDays", { done: cardioDays }),
    trend: trendCalc(cardioDays, uniqueDays(cardioLastWeek)),
    trendPositive: true,
    accentColor: color,
  });

  const cardioTypes = [...new Set(cardioThisWeek.map((w) => w.activityType))];
  const varietyLabel = cardioTypes.length === 0 ? t("goalInsights.end.noCardioWeek") : cardioTypes.join(", ");
  insights.push({
    id: "end_variety",
    goalKey, goalLabel, goalIcon,
    icon: "shuffle",
    headline: t("goalInsights.end.activityVariety"),
    value: varietyLabel.charAt(0).toUpperCase() + varietyLabel.slice(1),
    detail: cardioTypes.length >= 2
      ? t("goalInsights.end.crossTraining")
      : cardioTypes.length === 1
      ? t("goalInsights.end.mixSecondCardio")
      : t("goalInsights.end.logFirstCardio"),
    progress: clamp(cardioTypes.length / 3),
    progressLabel: t("goalInsights.end.activityTypes", { count: cardioTypes.length, s: pluralS(cardioTypes.length) }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  const cardioThisMonth = thisMonth.filter(isCardio);
  const cardioMinsThisMonth = cardioThisMonth.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  insights.push({
    id: "end_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "bar-chart-2",
    headline: t("goalInsights.end.monthlyCardioTotal"),
    value: t("goalInsights.end.minThisMonth", { min: cardioMinsThisMonth }),
    detail: cardioMinsThisMonth >= 600
      ? t("goalInsights.end.eliteEndurance")
      : t("goalInsights.end.minToBenchmark", { min: 600 - cardioMinsThisMonth }),
    progress: clamp(cardioMinsThisMonth / 600),
    progressLabel: t("goalInsights.end.monthlyMinLabel", { done: cardioMinsThisMonth }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

function flexibilityInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.flexibility;
  const goalKey: GoalKey = "flexibility";
  const goalLabel = getGoalLabel(goalKey);
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);

  const flexThisWeek = thisWeek.filter(isFlexibility);
  const flexLastWeek = lastWeek.filter(isFlexibility);
  const flexThisMonth = thisMonth.filter(isFlexibility);
  const FLEX_TARGET = 3;

  insights.push({
    id: "fl_weekly",
    goalKey, goalLabel, goalIcon,
    icon: "rotate-cw",
    headline: t("goalInsights.fl.mobilitySessions"),
    value: t("goalInsights.fl.sessionsWeek", { count: flexThisWeek.length, s: pluralS(flexThisWeek.length) }),
    detail: flexThisWeek.length >= FLEX_TARGET
      ? t("goalInsights.fl.threePlusSessions")
      : flexThisWeek.length > 0
      ? t("goalInsights.fl.moreSessionsTarget", { count: FLEX_TARGET - flexThisWeek.length, s: pluralS(FLEX_TARGET - flexThisWeek.length) })
      : t("goalInsights.fl.addYogaSession"),
    progress: clamp(flexThisWeek.length / FLEX_TARGET),
    progressLabel: t("goalInsights.fl.sessionsLabel", { done: flexThisWeek.length, target: FLEX_TARGET }),
    trend: trendCalc(flexThisWeek.length, flexLastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  const flexDays = uniqueDays(flexThisWeek);
  insights.push({
    id: "fl_consistency",
    goalKey, goalLabel, goalIcon,
    icon: "check-circle",
    headline: t("goalInsights.fl.stretchingConsistency"),
    value: t("goalInsights.fl.daysWeek", { count: flexDays, s: pluralS(flexDays) }),
    detail: flexDays >= 4
      ? t("goalInsights.fl.dailyMobility")
      : t("goalInsights.fl.dailyShortStretching"),
    progress: clamp(flexDays / 5),
    progressLabel: t("goalInsights.fl.targetDays", { done: flexDays }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  insights.push({
    id: "fl_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: t("goalInsights.fl.monthlyTotal"),
    value: t("goalInsights.fl.sessionsMonth", { count: flexThisMonth.length, s: pluralS(flexThisMonth.length) }),
    detail: flexThisMonth.length >= 12
      ? t("goalInsights.fl.excellentMobility")
      : t("goalInsights.fl.moreToReach", { count: Math.max(0, 12 - flexThisMonth.length) }),
    progress: clamp(flexThisMonth.length / 12),
    progressLabel: t("goalInsights.fl.monthlyLabel", { done: flexThisMonth.length }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  if (input.recovery) {
    const { soreness = {} } = input.recovery;
    const high = Object.values(soreness).filter((v) => v >= 2).length;
    insights.push({
      id: "fl_recovery",
      goalKey, goalLabel, goalIcon,
      icon: "wind",
      headline: t("goalInsights.fl.sorenessAndMobility"),
      value: high > 0 ? t("goalInsights.fl.areasNeedingAttention", { count: high, s: pluralS(high) }) : t("goalInsights.fl.feelingFresh"),
      detail: high >= 2
        ? t("goalInsights.fl.targetedStretching")
        : high === 1
        ? t("goalInsights.fl.focusedStretchSession")
        : t("goalInsights.fl.noSignificantSoreness"),
      progress: clamp(1 - high / 5),
      trend: null,
      trendPositive: false,
      accentColor: color,
    });
  }

  return insights;
}

function stayActiveInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.stay_active;
  const goalKey: GoalKey = "stay_active";
  const goalLabel = getGoalLabel(goalKey);
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);
  const activeDays = uniqueDays(thisWeek);

  insights.push({
    id: "sa_days",
    goalKey, goalLabel, goalIcon,
    icon: "sun",
    headline: t("goalInsights.sa.activeDaysWeek"),
    value: t("goalInsights.sa.ofSevenDays", { count: activeDays }),
    detail: activeDays >= weeklyTarget
      ? t("goalInsights.sa.consistentMovement")
      : t("goalInsights.sa.moreActiveDays", { count: weeklyTarget - activeDays, s: pluralS(weeklyTarget - activeDays) }),
    progress: clamp(activeDays / 7),
    progressLabel: t("goalInsights.sa.daysLabel", { done: activeDays }),
    trend: trendCalc(activeDays, uniqueDays(lastWeek)),
    trendPositive: true,
    accentColor: color,
  });

  insights.push({
    id: "sa_wow",
    goalKey, goalLabel, goalIcon,
    icon: "bar-chart",
    headline: t("goalInsights.sa.weekOverWeek"),
    value: t("goalInsights.sa.vsLastWeek", { current: thisWeek.length, last: lastWeek.length }),
    detail: thisWeek.length > lastWeek.length
      ? t("goalInsights.sa.moreActive")
      : thisWeek.length === lastWeek.length
      ? t("goalInsights.sa.samePace")
      : t("goalInsights.sa.fewerSessions"),
    progress: clamp(thisWeek.length / Math.max(lastWeek.length + 1, weeklyTarget)),
    progressLabel: t("goalInsights.sa.vsLastWeekLabel", { diff: thisWeek.length - lastWeek.length }),
    trend: trendCalc(thisWeek.length, lastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  const activityTypes = [...new Set(thisMonth.map((w) => w.activityType))];
  insights.push({
    id: "sa_variety",
    goalKey, goalLabel, goalIcon,
    icon: "grid",
    headline: t("goalInsights.sa.activityVariety"),
    value: t("goalInsights.sa.typesThisMonth", { count: activityTypes.length, s: pluralS(activityTypes.length) }),
    detail: activityTypes.length >= 3
      ? t("goalInsights.sa.greatMix", { types: activityTypes.slice(0, 3).join(", ") })
      : activityTypes.length > 0
      ? t("goalInsights.sa.tryNewActivity", { types: activityTypes.join(", ") })
      : t("goalInsights.sa.logFirstWorkout"),
    progress: clamp(activityTypes.length / 4),
    progressLabel: t("goalInsights.sa.differentActivities", { count: activityTypes.length }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  insights.push({
    id: "sa_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "award",
    headline: t("goalInsights.sa.monthlyTotal"),
    value: t("goalInsights.sa.sessionsMonth", { count: thisMonth.length, s: pluralS(thisMonth.length) }),
    detail: thisMonth.length >= weeklyTarget * 4
      ? t("goalInsights.sa.nailingTarget", { count: thisMonth.length })
      : t("goalInsights.sa.moreToTarget", { count: weeklyTarget * 4 - thisMonth.length, target: weeklyTarget * 4 }),
    progress: clamp(thisMonth.length / (weeklyTarget * 4)),
    progressLabel: t("goalInsights.sa.monthlyLabel", { done: thisMonth.length, target: weeklyTarget * 4 }),
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

export function computeGoalInsights(input: GoalInsightsInput): GoalInsight[] {
  const goalKeys = detectGoalKeys(input.goals);
  const allInsights: GoalInsight[] = [];

  for (const key of goalKeys) {
    switch (key) {
      case "lose_weight":   allInsights.push(...loseWeightInsights(input)); break;
      case "build_muscle":  allInsights.push(...buildMuscleInsights(input)); break;
      case "endurance":     allInsights.push(...enduranceInsights(input)); break;
      case "flexibility":   allInsights.push(...flexibilityInsights(input)); break;
      case "stay_active":   allInsights.push(...stayActiveInsights(input)); break;
    }
  }

  return allInsights;
}

export { getGoalLabel, GOAL_ICONS, GOAL_COLORS };
