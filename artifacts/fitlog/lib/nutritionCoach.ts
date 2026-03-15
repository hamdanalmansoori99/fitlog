import i18n from "@/i18n";

export interface NutritionContext {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calorieGoal: number | null;
  proteinGoalG: number | null;
  fitnessGoals: string[];
  trainedToday: boolean;
  workoutType: string | null;
  workoutDurationMinutes: number | null;
  lastMealTime: Date | null;
  lastMealCalories: number;
  mealCount: number;
  currentHour: number;
}

export interface NutritionInsight {
  id: string;
  icon: string;
  headline: string;
  detail: string;
  type: "success" | "warning" | "info" | "tip";
  priority: number;
}

const wantsToLoseWeight = (goals: string[]) =>
  goals.some((g) => /lose weight|weight loss|fat loss|slim/i.test(g));

const wantsMuscle = (goals: string[]) =>
  goals.some((g) => /muscle|strength|bulk|gain/i.test(g));

const wantsEndurance = (goals: string[]) =>
  goals.some((g) => /endurance|cardio|running|stamina/i.test(g));

const t = (key: string, opts?: Record<string, any>) => i18n.t(key, opts);

export function getNutritionInsights(ctx: NutritionContext): NutritionInsight[] {
  const insights: NutritionInsight[] = [];

  const {
    calories,
    proteinG,
    carbsG,
    fatG,
    calorieGoal,
    proteinGoalG,
    fitnessGoals,
    trainedToday,
    workoutType,
    workoutDurationMinutes,
    lastMealTime,
    lastMealCalories,
    mealCount,
    currentHour,
  } = ctx;

  const calGoal = calorieGoal ?? 2000;
  const protGoal = proteinGoalG ?? (wantsMuscle(fitnessGoals) ? 160 : 120);
  const calPct = calGoal > 0 ? calories / calGoal : 0;
  const protPct = protGoal > 0 ? proteinG / protGoal : 0;

  const isGymSession = workoutType === "gym" || workoutType === "strength";
  const isCardioSession =
    workoutType === "running" || workoutType === "cycling" || workoutType === "swimming";
  const isHardSession =
    trainedToday && (workoutDurationMinutes ?? 0) >= 45;

  if (mealCount === 0 && currentHour >= 10) {
    insights.push({
      id: "no-meals",
      icon: "coffee",
      headline: t("nutritionCoach.noMealsHeadline"),
      detail: t("nutritionCoach.noMealsDetail"),
      type: "info",
      priority: 50,
    });
  }

  if (trainedToday && proteinG < protGoal * 0.5 && mealCount > 0) {
    const shortfall = Math.round(protGoal - proteinG);
    insights.push({
      id: "protein-low-post-workout",
      icon: "zap",
      headline: t("nutritionCoach.proteinLowPostWorkoutHeadline"),
      detail: t("nutritionCoach.proteinLowPostWorkoutDetail", { shortfall }),
      type: "warning",
      priority: 90,
    });
  } else if (!trainedToday && wantsMuscle(fitnessGoals) && protPct < 0.6 && mealCount > 0) {
    const shortfall = Math.round(protGoal - proteinG);
    insights.push({
      id: "protein-low-muscle",
      icon: "trending-up",
      headline: t("nutritionCoach.proteinLowMuscleHeadline"),
      detail: t("nutritionCoach.proteinLowMuscleDetail", { shortfall }),
      type: "tip",
      priority: 60,
    });
  } else if (mealCount > 0 && protPct >= 0.9 && trainedToday) {
    insights.push({
      id: "protein-good",
      icon: "check-circle",
      headline: t("nutritionCoach.proteinGoodHeadline"),
      detail: wantsMuscle(fitnessGoals)
        ? t("nutritionCoach.proteinGoodMuscle")
        : t("nutritionCoach.proteinGoodGeneral"),
      type: "success",
      priority: 40,
    });
  }

  if (trainedToday && calPct < 0.5 && mealCount > 0 && currentHour >= 14) {
    insights.push({
      id: "cals-low-post-workout",
      icon: "alert-triangle",
      headline: t("nutritionCoach.calsLowPostWorkoutHeadline"),
      detail: t("nutritionCoach.calsLowPostWorkoutDetail", { calories }),
      type: "warning",
      priority: 95,
    });
  } else if (!trainedToday && calPct < 0.45 && mealCount > 0 && currentHour >= 16) {
    insights.push({
      id: "cals-very-low",
      icon: "alert-circle",
      headline: t("nutritionCoach.calsVeryLowHeadline"),
      detail: t("nutritionCoach.calsVeryLowDetail", { calories }),
      type: "info",
      priority: 55,
    });
  }

  if (mealCount > 0 && calPct >= 0.85 && calPct <= 1.1) {
    insights.push({
      id: "cals-on-track",
      icon: "target",
      headline: t("nutritionCoach.calsOnTrackHeadline"),
      detail: wantsToLoseWeight(fitnessGoals)
        ? t("nutritionCoach.calsOnTrackLoss", { pct: Math.round(calPct * 100) })
        : t("nutritionCoach.calsOnTrackGeneral", { pct: Math.round(calPct * 100) }),
      type: "success",
      priority: 45,
    });
  }

  if (wantsToLoseWeight(fitnessGoals) && calPct > 1.15 && mealCount > 0) {
    const over = Math.round(calories - calGoal);
    insights.push({
      id: "cals-over-goal",
      icon: "info",
      headline: t("nutritionCoach.calsOverGoalHeadline"),
      detail: t("nutritionCoach.calsOverGoalDetail", { over }),
      type: "info",
      priority: 65,
    });
  }

  if (
    lastMealCalories >= 700 &&
    lastMealTime != null &&
    Date.now() - lastMealTime.getTime() > 20 * 60 * 1000 &&
    Date.now() - lastMealTime.getTime() < 90 * 60 * 1000 &&
    currentHour >= 17
  ) {
    insights.push({
      id: "post-meal-walk",
      icon: "navigation",
      headline: t("nutritionCoach.postMealWalkHeadline"),
      detail: t("nutritionCoach.postMealWalkDetail"),
      type: "tip",
      priority: 70,
    });
  }

  if (isHardSession && mealCount > 0 && protPct < 0.7 && currentHour >= 18) {
    insights.push({
      id: "recovery-nutrition",
      icon: "heart",
      headline: t("nutritionCoach.recoveryNutritionHeadline"),
      detail: t("nutritionCoach.recoveryNutritionDetail"),
      type: "tip",
      priority: 75,
    });
  }

  if (isCardioSession && carbsG < 100 && mealCount > 0) {
    insights.push({
      id: "carbs-cardio",
      icon: "activity",
      headline: t("nutritionCoach.carbsCardioHeadline"),
      detail: t("nutritionCoach.carbsCardioDetail", { carbs: carbsG }),
      type: "tip",
      priority: 55,
    });
  }

  const macroTotal = proteinG + carbsG + fatG;
  if (macroTotal > 50) {
    const fatPct = fatG / macroTotal;
    const protPctMacro = proteinG / macroTotal;
    const carbPctMacro = carbsG / macroTotal;

    if (fatPct > 0.55) {
      insights.push({
        id: "fat-heavy",
        icon: "pie-chart",
        headline: t("nutritionCoach.fatHeavyHeadline"),
        detail: t("nutritionCoach.fatHeavyDetail"),
        type: "info",
        priority: 35,
      });
    } else if (
      protPctMacro >= 0.2 && protPctMacro <= 0.45 &&
      carbPctMacro >= 0.3 && carbPctMacro <= 0.55 &&
      fatPct >= 0.15 && fatPct <= 0.35 &&
      mealCount >= 2
    ) {
      insights.push({
        id: "macros-balanced",
        icon: "check-circle",
        headline: t("nutritionCoach.macrosBalancedHeadline"),
        detail: t("nutritionCoach.macrosBalancedDetail", {
          protein: Math.round(protPctMacro * 100),
          carbs: Math.round(carbPctMacro * 100),
          fat: Math.round(fatPct * 100),
        }),
        type: "success",
        priority: 38,
      });
    }
  }

  if (calPct > 1.2 && mealCount > 0 && !trainedToday) {
    const over = Math.round(calories - calGoal);
    insights.push({
      id: "over-goal-activity",
      icon: "navigation",
      headline: t("nutritionCoach.overGoalActivityHeadline"),
      detail: t("nutritionCoach.overGoalActivityDetail", { over }),
      type: "tip",
      priority: 68,
    });
  }

  if (wantsToLoseWeight(fitnessGoals) && mealCount > 0 && calPct < 0.75 && currentHour < 17) {
    insights.push({
      id: "deficit-on-track",
      icon: "trending-down",
      headline: t("nutritionCoach.deficitOnTrackHeadline"),
      detail: t("nutritionCoach.deficitOnTrackDetail"),
      type: "success",
      priority: 50,
    });
  }

  if (wantsMuscle(fitnessGoals) && calPct < 0.8 && currentHour >= 20 && mealCount > 0) {
    insights.push({
      id: "muscle-cals-low",
      icon: "bar-chart-2",
      headline: t("nutritionCoach.muscleCalsLowHeadline"),
      detail: t("nutritionCoach.muscleCalsLowDetail"),
      type: "tip",
      priority: 60,
    });
  }

  if (
    !trainedToday &&
    mealCount === 0 &&
    currentHour >= 6 &&
    currentHour <= 11
  ) {
    insights.push({
      id: "pre-workout-fuel",
      icon: "sun",
      headline: t("nutritionCoach.preWorkoutFuelHeadline"),
      detail: t("nutritionCoach.preWorkoutFuelDetail"),
      type: "tip",
      priority: 45,
    });
  }

  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}
