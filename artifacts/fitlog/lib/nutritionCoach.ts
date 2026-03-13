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

  // ─── 1. No meals logged yet (and it's a reasonable hour) ─────────────────
  if (mealCount === 0 && currentHour >= 10) {
    insights.push({
      id: "no-meals",
      icon: "coffee",
      headline: "No meals logged yet today",
      detail:
        "Logging meals helps you track your nutrition and hit your goals. Even a quick entry helps.",
      type: "info",
      priority: 50,
    });
  }

  // ─── 2. Protein very low after training ──────────────────────────────────
  if (trainedToday && proteinG < protGoal * 0.5 && mealCount > 0) {
    const shortfall = Math.round(protGoal - proteinG);
    insights.push({
      id: "protein-low-post-workout",
      icon: "zap",
      headline: "You're low on protein today",
      detail: `You trained today and your body needs protein to recover. Aim for another ~${shortfall}g — a chicken breast, Greek yoghurt, or protein shake would help.`,
      type: "warning",
      priority: 90,
    });
  } else if (!trainedToday && wantsMuscle(fitnessGoals) && protPct < 0.6 && mealCount > 0) {
    // Building muscle but protein behind target on rest day
    const shortfall = Math.round(protGoal - proteinG);
    insights.push({
      id: "protein-low-muscle",
      icon: "trending-up",
      headline: "Protein is below your muscle-building target",
      detail: `You need ~${shortfall}g more to reach your daily goal. Spreading protein across meals — not just dinner — makes the biggest difference.`,
      type: "tip",
      priority: 60,
    });
  } else if (mealCount > 0 && protPct >= 0.9 && trainedToday) {
    // Protein on track after a session
    insights.push({
      id: "protein-good",
      icon: "check-circle",
      headline: "Great protein intake today",
      detail:
        wantsMuscle(fitnessGoals)
          ? "You're fuelling muscle recovery well. Keep it up — consistency is what drives long-term gains."
          : "Your protein is on track, which supports energy levels and satiety throughout the day.",
      type: "success",
      priority: 40,
    });
  }

  // ─── 3. Calories very low — recovery risk ────────────────────────────────
  if (trainedToday && calPct < 0.5 && mealCount > 0 && currentHour >= 14) {
    insights.push({
      id: "cals-low-post-workout",
      icon: "alert-triangle",
      headline: "Low calories may affect recovery",
      detail: `You trained today but have only logged ${calories} kcal so far. Under-eating after a session can slow muscle repair and leave you tired tomorrow.`,
      type: "warning",
      priority: 95,
    });
  } else if (!trainedToday && calPct < 0.45 && mealCount > 0 && currentHour >= 16) {
    // Just generally very low
    insights.push({
      id: "cals-very-low",
      icon: "alert-circle",
      headline: "Energy intake is quite low today",
      detail: `You've logged ${calories} kcal — well below your goal. Consistent under-eating can affect your energy and progress over time.`,
      type: "info",
      priority: 55,
    });
  }

  // ─── 4. Calories close to goal — celebrate ───────────────────────────────
  if (mealCount > 0 && calPct >= 0.85 && calPct <= 1.1) {
    insights.push({
      id: "cals-on-track",
      icon: "target",
      headline: "You're close to your calorie goal",
      detail: wantsToLoseWeight(fitnessGoals)
        ? `You've reached ${Math.round(calPct * 100)}% of your daily target — great pacing for weight loss.`
        : `You've hit ${Math.round(calPct * 100)}% of your daily calorie goal. Well done — consistency like this drives results.`,
      type: "success",
      priority: 45,
    });
  }

  // ─── 5. Calories over goal (trying to lose weight) ───────────────────────
  if (wantsToLoseWeight(fitnessGoals) && calPct > 1.15 && mealCount > 0) {
    const over = Math.round(calories - calGoal);
    insights.push({
      id: "cals-over-goal",
      icon: "info",
      headline: "Over your calorie goal today",
      detail: `You're about ${over} kcal over target. One day won't derail your progress — just keep tomorrow balanced. A short walk can also help.`,
      type: "info",
      priority: 65,
    });
  }

  // ─── 6. Large last meal → suggest a walk ─────────────────────────────────
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
      headline: "A short walk could help after dinner",
      detail:
        "A 10–15 min walk after a big meal improves digestion and helps regulate blood sugar. It also counts as active recovery.",
      type: "tip",
      priority: 70,
    });
  }

  // ─── 7. Trained hard today → recovery nutrition ───────────────────────────
  if (isHardSession && mealCount > 0 && protPct < 0.7 && currentHour >= 18) {
    insights.push({
      id: "recovery-nutrition",
      icon: "heart",
      headline: "You trained hard today — recovery nutrition matters",
      detail:
        "After an intense session your muscles need protein and carbs to repair. A balanced meal or snack before bed supports overnight recovery.",
      type: "tip",
      priority: 75,
    });
  }

  // ─── 8. Cardio day — carbs matter ────────────────────────────────────────
  if (isCardioSession && carbsG < 100 && mealCount > 0) {
    insights.push({
      id: "carbs-cardio",
      icon: "activity",
      headline: "Carbs fuel cardio performance",
      detail: `You ran today but carb intake is low (${carbsG}g). Carbohydrates are your primary fuel for endurance — fruit, oats, or rice are great sources.`,
      type: "tip",
      priority: 55,
    });
  }

  // ─── 9. Macros very skewed / balanced ────────────────────────────────────
  const macroTotal = proteinG + carbsG + fatG;
  if (macroTotal > 50) {
    const fatPct = fatG / macroTotal;
    const protPctMacro = proteinG / macroTotal;
    const carbPctMacro = carbsG / macroTotal;

    if (fatPct > 0.55) {
      insights.push({
        id: "fat-heavy",
        icon: "pie-chart",
        headline: "Your macros are high in fat today",
        detail:
          "Fat is essential, but a very high fat intake can crowd out protein and carbs your body needs for energy and recovery.",
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
        headline: "Your macros look well balanced",
        detail: `Protein ${Math.round(protPctMacro * 100)}%, carbs ${Math.round(carbPctMacro * 100)}%, fat ${Math.round(fatPct * 100)}% — a good distribution for energy and recovery.`,
        type: "success",
        priority: 38,
      });
    }
  }

  // ─── 9b. Calories significantly over goal → suggest light activity ────────
  if (calPct > 1.2 && mealCount > 0 && !trainedToday) {
    const over = Math.round(calories - calGoal);
    insights.push({
      id: "over-goal-activity",
      icon: "navigation",
      headline: "A short walk could help offset today",
      detail: `You're about ${over} kcal over your goal. A 20–30 min walk burns ~100–150 kcal and improves digestion — no pressure, just an option.`,
      type: "tip",
      priority: 68,
    });
  }

  // ─── 10. Goal-aligned meal suggestion ────────────────────────────────────
  if (wantsToLoseWeight(fitnessGoals) && mealCount > 0 && calPct < 0.75 && currentHour < 17) {
    insights.push({
      id: "deficit-on-track",
      icon: "trending-down",
      headline: "You're in a good calorie deficit",
      detail:
        "You're below your target with time left in the day. Prioritise protein-rich meals now to stay satisfied and protect muscle.",
      type: "success",
      priority: 50,
    });
  }

  // ─── 11. Muscle building — total daily nutrition check ───────────────────
  if (wantsMuscle(fitnessGoals) && calPct < 0.8 && currentHour >= 20 && mealCount > 0) {
    insights.push({
      id: "muscle-cals-low",
      icon: "bar-chart-2",
      headline: "Calorie intake may limit muscle gains",
      detail:
        "Building muscle requires a slight calorie surplus. You're currently below your target — a protein-rich bedtime snack (e.g. cottage cheese or casein) can help.",
      type: "tip",
      priority: 60,
    });
  }

  // ─── 12. Pre-workout fuel warning ────────────────────────────────────────
  // Show this in morning hours if calories very low and a workout seems likely
  if (
    !trainedToday &&
    mealCount === 0 &&
    currentHour >= 6 &&
    currentHour <= 11
  ) {
    insights.push({
      id: "pre-workout-fuel",
      icon: "sun",
      headline: "Fuel up before your workout",
      detail:
        "Training on an empty stomach is fine for light sessions, but a small carb-protein meal 1–2 hours before improves performance in most workouts.",
      type: "tip",
      priority: 45,
    });
  }

  // Sort by priority descending, cap at 3 to keep the dashboard clean
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}
