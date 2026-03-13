// ─── Goal-Based Insights Engine ───────────────────────────────────────────────
// Pure computation — no API calls. Takes already-fetched data and derives
// actionable, goal-specific insight cards shown on dashboard and progress page.

export interface GoalInsight {
  id: string;
  goalKey: GoalKey;
  goalLabel: string;
  goalIcon: string;      // Feather icon for the goal group header
  icon: string;          // Feather icon for this specific insight
  headline: string;
  value: string;
  detail: string;
  progress: number;      // 0–1 for progress bar (clamped)
  progressLabel?: string;
  trend: "up" | "down" | "flat" | null;
  trendPositive: boolean; // whether "up" trend is good
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

// ─── Goal detection ────────────────────────────────────────────────────────────

const GOAL_VARIANTS: Record<GoalKey, RegExp> = {
  lose_weight: /lose weight|weight loss|fat loss|slim|cut/i,
  build_muscle: /muscle|strength|bulk|gain|lift/i,
  endurance: /endurance|cardio|running|stamina|marathon|cycling/i,
  flexibility: /flex|yoga|mobility|stretch|pilates/i,
  stay_active: /active|health|wellness|general|stay fit/i,
};

const GOAL_LABELS: Record<GoalKey, string> = {
  lose_weight: "Lose Weight",
  build_muscle: "Build Muscle",
  endurance: "Improve Endurance",
  flexibility: "Improve Flexibility",
  stay_active: "Stay Active",
};

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
  // Default: stay active
  if (keys.length === 0) keys.push("stay_active");
  return keys;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
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

function trend(current: number, previous: number): "up" | "down" | "flat" {
  if (previous === 0) return current > 0 ? "up" : "flat";
  const pct = (current - previous) / previous;
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

// ─── Insight builders ──────────────────────────────────────────────────────────

function loseWeightInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.lose_weight;
  const goalKey: GoalKey = "lose_weight";
  const goalLabel = GOAL_LABELS[goalKey];
  const goalIcon = GOAL_ICONS[goalKey];

  const calGoal = input.profile.calorieGoal ?? 2000;
  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const insights: GoalInsight[] = [];

  // 1. Calorie trend
  if (input.nutritionStats) {
    const { avg7DayCalories, avg30DayCalories, dailyCalories } = input.nutritionStats;
    const last7 = dailyCalories.slice(-7);
    const prev7 = dailyCalories.slice(-14, -7);
    const last7Avg = last7.reduce((s, d) => s + d.calories, 0) / Math.max(last7.length, 1);
    const prev7Avg = prev7.reduce((s, d) => s + d.calories, 0) / Math.max(prev7.length, 1);
    const logged = last7.filter((d) => d.calories > 0).length;
    const pct = calGoal > 0 ? last7Avg / calGoal : 0.8;
    const t = trend(last7Avg, prev7Avg);
    const deficit = calGoal - last7Avg;

    let detail: string;
    if (logged < 3) {
      detail = "Log meals consistently for accurate calorie tracking.";
    } else if (deficit > 100) {
      detail = `${fmt(deficit)} kcal below your goal — solid deficit for fat loss.`;
    } else if (deficit < -100) {
      detail = `${fmt(-deficit)} kcal above your goal — consider smaller portions.`;
    } else {
      detail = "Right at your target — precision nutrition pays off over weeks.";
    }

    insights.push({
      id: "lw_calories",
      goalKey, goalLabel, goalIcon,
      icon: "pie-chart",
      headline: "Calorie trend",
      value: logged > 0 ? `${fmt(Math.round(last7Avg))} kcal / day` : "No data yet",
      detail,
      progress: clamp(1 - pct + 0.5), // under-goal is closer to full bar
      progressLabel: `Goal: ${fmt(calGoal)} kcal`,
      trend: t,
      trendPositive: false, // lower calories (down) is positive for weight loss
      accentColor: color,
    });

    // 2. Weekly deficit estimate
    if (logged >= 3 && deficit > 0) {
      const weeklyDeficit = deficit * 7;
      const deficitProgress = clamp(weeklyDeficit / 3500); // 3500 kcal ≈ 0.5 kg
      insights.push({
        id: "lw_deficit",
        goalKey, goalLabel, goalIcon,
        icon: "minus-circle",
        headline: "Weekly deficit",
        value: `~${fmt(Math.round(weeklyDeficit))} kcal`,
        detail: `~${(weeklyDeficit / 7700).toFixed(2)} kg potential fat loss this week. (7,700 kcal = 1 kg fat)`,
        progress: deficitProgress,
        progressLabel: "3,500 kcal = ~0.5 kg",
        trend: t,
        trendPositive: false,
        accentColor: color,
      });
    }
  }

  // 3. Workout consistency
  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const activeDays = uniqueDays(thisWeek);
  const prevActiveDays = uniqueDays(lastWeek);
  insights.push({
    id: "lw_consistency",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: "Activity consistency",
    value: `${thisWeek.length} session${thisWeek.length !== 1 ? "s" : ""} this week`,
    detail:
      thisWeek.length >= weeklyTarget
        ? "Weekly goal hit — every session creates a calorie deficit."
        : `${weeklyTarget - thisWeek.length} more session${weeklyTarget - thisWeek.length !== 1 ? "s" : ""} to hit your target. Cardio burns fat most efficiently.`,
    progress: clamp(thisWeek.length / weeklyTarget),
    progressLabel: `${thisWeek.length} / ${weeklyTarget} sessions`,
    trend: trend(thisWeek.length, lastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  // 4. Cardio mix
  const cardioThisWeek = thisWeek.filter(isCardio);
  const cardioPct = thisWeek.length > 0 ? cardioThisWeek.length / thisWeek.length : 0;
  insights.push({
    id: "lw_cardio",
    goalKey, goalLabel, goalIcon,
    icon: "activity",
    headline: "Cardio support",
    value:
      thisWeek.length > 0
        ? `${Math.round(cardioPct * 100)}% cardio`
        : "No sessions logged",
    detail:
      cardioPct >= 0.5
        ? "Good cardio mix — great for sustained fat burning."
        : cardioThisWeek.length === 0
        ? "Add a cardio session (run, walk, cycle) to accelerate your deficit."
        : "A cardio-heavy week accelerates weight loss. Aim for 50%+ cardio.",
    progress: clamp(cardioPct),
    progressLabel: `${cardioThisWeek.length} of ${thisWeek.length} sessions`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

function buildMuscleInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.build_muscle;
  const goalKey: GoalKey = "build_muscle";
  const goalLabel = GOAL_LABELS[goalKey];
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const proteinGoal = input.profile.proteinGoalG ?? 150;
  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const gymThisWeek = thisWeek.filter(isGym);
  const gymLastWeek = lastWeek.filter(isGym);

  // 1. Protein consistency
  if (input.nutritionStats) {
    const { avg7DayCalories, macroSplit } = input.nutritionStats;
    const estimatedDailyProtein = (macroSplit.proteinPercentage / 100) * avg7DayCalories / 4;
    const proteinPct = proteinGoal > 0 ? estimatedDailyProtein / proteinGoal : 0.7;
    const logged = input.nutritionStats.dailyCalories.slice(-7).filter((d) => d.calories > 0).length;

    insights.push({
      id: "bm_protein",
      goalKey, goalLabel, goalIcon,
      icon: "droplet",
      headline: "Protein intake",
      value: logged > 0 ? `~${Math.round(estimatedDailyProtein)}g / day` : "No data yet",
      detail:
        logged < 3
          ? "Log your meals to track protein. Aim for 1.6–2g per kg of bodyweight."
          : estimatedDailyProtein >= proteinGoal * 0.9
          ? `Hitting your ${proteinGoal}g goal — ideal for muscle protein synthesis.`
          : `${Math.round(proteinGoal - estimatedDailyProtein)}g below target. Prioritise protein at each meal.`,
      progress: clamp(proteinPct),
      progressLabel: `Goal: ${proteinGoal}g`,
      trend: null,
      trendPositive: true,
      accentColor: color,
    });
  }

  // 2. Training frequency
  insights.push({
    id: "bm_frequency",
    goalKey, goalLabel, goalIcon,
    icon: "repeat",
    headline: "Training frequency",
    value: `${gymThisWeek.length} gym session${gymThisWeek.length !== 1 ? "s" : ""} this week`,
    detail:
      gymThisWeek.length >= weeklyTarget
        ? "Frequency is on point for hypertrophy. Keep training each muscle group 2× / week."
        : `Target ${weeklyTarget} sessions/week for consistent muscle-building stimulus.`,
    progress: clamp(gymThisWeek.length / Math.max(weeklyTarget, 1)),
    progressLabel: `${gymThisWeek.length} / ${weeklyTarget} sessions`,
    trend: trend(gymThisWeek.length, gymLastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  // 3. Weight progression (from records)
  if (input.records && input.records.length > 0) {
    const liftRecords = input.records.filter((r) => r.activityType === "gym");
    insights.push({
      id: "bm_progression",
      goalKey, goalLabel, goalIcon,
      icon: "trending-up",
      headline: "Weight progression",
      value: liftRecords.length > 0 ? `${liftRecords.length} PR${liftRecords.length !== 1 ? "s" : ""} tracked` : "Log workouts with weights",
      detail:
        liftRecords.length > 0
          ? `Latest: ${liftRecords[0].value} on ${liftRecords[0].label.replace("Best ", "")}. Progressive overload = consistent gains.`
          : "Start tracking weights in your workouts to see progression over time.",
      progress: clamp(Math.min(liftRecords.length / 5, 1)),
      progressLabel: "Up to 5 lifts tracked",
      trend: null,
      trendPositive: true,
      accentColor: color,
    });
  }

  // 4. Recovery score
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
      headline: "Recovery quality",
      value: sleepQuality != null ? `${scoreOutOf10}/10 recovery score` : "Check in to log recovery",
      detail:
        sleepQuality == null
          ? "Log your recovery daily — sleep and rest are when muscles actually grow."
          : highSore >= 3
          ? "Heavy soreness — prioritise sleep, protein, and take a rest day if needed."
          : score >= 0.7
          ? "Well-rested and ready. Perfect conditions for a productive training session."
          : "Decent recovery. Stay hydrated and get 7-9 hours tonight.",
      progress: clamp(score),
      progressLabel: `Sleep ${sleepScore}/5 · Energy ${energyScore}/5`,
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
  const goalLabel = GOAL_LABELS[goalKey];
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);

  const cardioThisWeek = thisWeek.filter(isCardio);
  const cardioLastWeek = lastWeek.filter(isCardio);
  const cardioMinsThisWeek = cardioThisWeek.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  const cardioMinsLastWeek = cardioLastWeek.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  const WHO_TARGET = 150; // WHO recommended cardio minutes per week

  // 1. Cardio minutes
  insights.push({
    id: "end_minutes",
    goalKey, goalLabel, goalIcon,
    icon: "clock",
    headline: "Weekly cardio volume",
    value: `${cardioMinsThisWeek} min this week`,
    detail:
      cardioMinsThisWeek >= WHO_TARGET
        ? `WHO target of ${WHO_TARGET} min hit! Every extra minute builds your aerobic base.`
        : `${WHO_TARGET - cardioMinsThisWeek} min away from the 150 min/week target.`,
    progress: clamp(cardioMinsThisWeek / WHO_TARGET),
    progressLabel: `${cardioMinsThisWeek} / ${WHO_TARGET} min`,
    trend: trend(cardioMinsThisWeek, cardioMinsLastWeek),
    trendPositive: true,
    accentColor: color,
  });

  // 2. Active cardio days
  const cardioDays = uniqueDays(cardioThisWeek);
  insights.push({
    id: "end_days",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: "Active days",
    value: `${cardioDays} cardio day${cardioDays !== 1 ? "s" : ""} this week`,
    detail:
      cardioDays >= 4
        ? "4+ cardio days per week builds serious endurance. Keep the frequency up."
        : "Aim for 4+ cardio sessions per week for consistent aerobic gains.",
    progress: clamp(cardioDays / 5),
    progressLabel: `${cardioDays} / 5 target days`,
    trend: trend(cardioDays, uniqueDays(cardioLastWeek)),
    trendPositive: true,
    accentColor: color,
  });

  // 3. Cardio variety
  const cardioTypes = [...new Set(cardioThisWeek.map((w) => w.activityType))];
  const varietyLabel = cardioTypes.length === 0 ? "No cardio this week" : cardioTypes.join(", ");
  insights.push({
    id: "end_variety",
    goalKey, goalLabel, goalIcon,
    icon: "shuffle",
    headline: "Activity variety",
    value: varietyLabel.charAt(0).toUpperCase() + varietyLabel.slice(1),
    detail:
      cardioTypes.length >= 2
        ? "Cross-training reduces injury risk and builds balanced endurance."
        : cardioTypes.length === 1
        ? "Mix in a second cardio type to build more balanced aerobic fitness."
        : "Log a run, cycle or swim to start building your aerobic base.",
    progress: clamp(cardioTypes.length / 3),
    progressLabel: `${cardioTypes.length} activity type${cardioTypes.length !== 1 ? "s" : ""}`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  // 4. Monthly volume
  const cardioThisMonth = thisMonth.filter(isCardio);
  const cardioMinsThisMonth = cardioThisMonth.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  insights.push({
    id: "end_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "bar-chart-2",
    headline: "Monthly cardio total",
    value: `${cardioMinsThisMonth} min this month`,
    detail:
      cardioMinsThisMonth >= 600
        ? "600+ min/month is elite endurance territory. Your aerobic base is building fast."
        : `${600 - cardioMinsThisMonth} min to reach the 600 min/month benchmark.`,
    progress: clamp(cardioMinsThisMonth / 600),
    progressLabel: `${cardioMinsThisMonth} / 600 min`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

function flexibilityInsights(input: GoalInsightsInput): GoalInsight[] {
  const color = GOAL_COLORS.flexibility;
  const goalKey: GoalKey = "flexibility";
  const goalLabel = GOAL_LABELS[goalKey];
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);

  const flexThisWeek = thisWeek.filter(isFlexibility);
  const flexLastWeek = lastWeek.filter(isFlexibility);
  const flexThisMonth = thisMonth.filter(isFlexibility);
  const FLEX_TARGET = 3;

  // 1. Weekly mobility sessions
  insights.push({
    id: "fl_weekly",
    goalKey, goalLabel, goalIcon,
    icon: "rotate-cw",
    headline: "Mobility sessions",
    value: `${flexThisWeek.length} session${flexThisWeek.length !== 1 ? "s" : ""} this week`,
    detail:
      flexThisWeek.length >= FLEX_TARGET
        ? "3+ sessions per week builds lasting flexibility and joint health."
        : flexThisWeek.length > 0
        ? `${FLEX_TARGET - flexThisWeek.length} more session${FLEX_TARGET - flexThisWeek.length !== 1 ? "s" : ""} to hit your weekly target. Even 10-minute stretches count.`
        : "Add a yoga or stretching session — 10 minutes daily improves flexibility significantly.",
    progress: clamp(flexThisWeek.length / FLEX_TARGET),
    progressLabel: `${flexThisWeek.length} / ${FLEX_TARGET} sessions`,
    trend: trend(flexThisWeek.length, flexLastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  // 2. Consistency (days with flexibility this week)
  const flexDays = uniqueDays(flexThisWeek);
  insights.push({
    id: "fl_consistency",
    goalKey, goalLabel, goalIcon,
    icon: "check-circle",
    headline: "Stretching consistency",
    value: `${flexDays} day${flexDays !== 1 ? "s" : ""} this week`,
    detail:
      flexDays >= 4
        ? "Daily mobility practice is the fastest path to lasting flexibility gains."
        : "Daily short stretching sessions beat long infrequent ones — try 5–10 min daily.",
    progress: clamp(flexDays / 5),
    progressLabel: `${flexDays} / 5 target days`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  // 3. Monthly total
  insights.push({
    id: "fl_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "calendar",
    headline: "Monthly total",
    value: `${flexThisMonth.length} session${flexThisMonth.length !== 1 ? "s" : ""} this month`,
    detail:
      flexThisMonth.length >= 12
        ? "12+ sessions per month is excellent. Your mobility and injury resistance improve measurably."
        : `${Math.max(0, 12 - flexThisMonth.length)} more to reach 12 sessions this month.`,
    progress: clamp(flexThisMonth.length / 12),
    progressLabel: `${flexThisMonth.length} / 12 sessions`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  // 4. Recovery synergy (flexibility helps recovery)
  if (input.recovery) {
    const { soreness = {} } = input.recovery;
    const totalSore = Object.values(soreness).reduce((s, v) => s + v, 0);
    const high = Object.values(soreness).filter((v) => v >= 2).length;
    insights.push({
      id: "fl_recovery",
      goalKey, goalLabel, goalIcon,
      icon: "wind",
      headline: "Soreness & mobility",
      value: high > 0 ? `${high} area${high !== 1 ? "s" : ""} needing attention` : "Feeling fresh",
      detail:
        high >= 2
          ? "Targeted stretching of sore areas speeds recovery and maintains flexibility."
          : high === 1
          ? "A focused 15-min stretch session will ease soreness and improve range of motion."
          : "No significant soreness — ideal time for deep stretching to expand your range.",
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
  const goalLabel = GOAL_LABELS[goalKey];
  const goalIcon = GOAL_ICONS[goalKey];
  const insights: GoalInsight[] = [];

  const weeklyTarget = input.profile.weeklyWorkoutDays ?? 3;
  const thisWeek = workoutsThisWeek(input.workouts);
  const lastWeek = workoutsLastWeek(input.workouts);
  const thisMonth = workoutsThisMonth(input.workouts);
  const activeDays = uniqueDays(thisWeek);

  // 1. Days active this week
  insights.push({
    id: "sa_days",
    goalKey, goalLabel, goalIcon,
    icon: "sun",
    headline: "Active days this week",
    value: `${activeDays} of 7 days`,
    detail:
      activeDays >= weeklyTarget
        ? "Consistent movement this week. This is the habit that stacks up over months."
        : `${weeklyTarget - activeDays} more active day${weeklyTarget - activeDays !== 1 ? "s" : ""} to hit your target. Any movement counts.`,
    progress: clamp(activeDays / 7),
    progressLabel: `${activeDays} / 7 days`,
    trend: trend(activeDays, uniqueDays(lastWeek)),
    trendPositive: true,
    accentColor: color,
  });

  // 2. Week-over-week
  insights.push({
    id: "sa_wow",
    goalKey, goalLabel, goalIcon,
    icon: "bar-chart",
    headline: "Week over week",
    value: `${thisWeek.length} vs ${lastWeek.length} last week`,
    detail:
      thisWeek.length > lastWeek.length
        ? "More active than last week — momentum is building."
        : thisWeek.length === lastWeek.length
        ? "Same pace as last week. Consistency is the foundation of fitness."
        : "Fewer sessions than last week. Even a short walk counts — keep the streak alive.",
    progress: clamp(thisWeek.length / Math.max(lastWeek.length + 1, weeklyTarget)),
    progressLabel: `+${thisWeek.length - lastWeek.length} vs last week`,
    trend: trend(thisWeek.length, lastWeek.length),
    trendPositive: true,
    accentColor: color,
  });

  // 3. Activity variety
  const activityTypes = [...new Set(thisMonth.map((w) => w.activityType))];
  insights.push({
    id: "sa_variety",
    goalKey, goalLabel, goalIcon,
    icon: "grid",
    headline: "Activity variety",
    value: `${activityTypes.length} type${activityTypes.length !== 1 ? "s" : ""} this month`,
    detail:
      activityTypes.length >= 3
        ? `${activityTypes.slice(0, 3).join(", ")} — great mix. Variety prevents boredom and trains different systems.`
        : activityTypes.length > 0
        ? `${activityTypes.join(", ")}. Try a new activity to keep things fresh and work different muscles.`
        : "Log your first workout to start tracking your activity mix.",
    progress: clamp(activityTypes.length / 4),
    progressLabel: `${activityTypes.length} different activities`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  // 4. Monthly total
  insights.push({
    id: "sa_monthly",
    goalKey, goalLabel, goalIcon,
    icon: "award",
    headline: "Monthly total",
    value: `${thisMonth.length} session${thisMonth.length !== 1 ? "s" : ""} this month`,
    detail:
      thisMonth.length >= weeklyTarget * 4
        ? `${thisMonth.length} sessions in 30 days — you're nailing your monthly target consistently.`
        : `${weeklyTarget * 4 - thisMonth.length} more sessions to hit your monthly target of ${weeklyTarget * 4}.`,
    progress: clamp(thisMonth.length / (weeklyTarget * 4)),
    progressLabel: `${thisMonth.length} / ${weeklyTarget * 4} sessions`,
    trend: null,
    trendPositive: true,
    accentColor: color,
  });

  return insights;
}

// ─── Public API ────────────────────────────────────────────────────────────────

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

export { GOAL_LABELS, GOAL_ICONS, GOAL_COLORS };
