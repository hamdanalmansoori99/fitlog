import { Router } from "express";
import { db, conversationsTable, messagesTable, profilesTable, workoutsTable, workoutExercisesTable, workoutSetsTable, equipmentTable, mealsTable, mealFoodItemsTable, recoveryLogsTable, settingsTable, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, lt, isNotNull, inArray, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { chatCompletion, isAIConfigured } from "../lib/aiProvider";
import { logError } from "../lib/logger";
import { getActiveSubscription } from "../services/subscriptionService";

const conversations = conversationsTable;
const messages = messagesTable;

const router = Router();

// ─── Safety layer ─────────────────────────────────────────────────────────────

const SAFETY_PATTERNS = [
  /chest.{0,10}(pain|tight|pressure|hurt)/i,
  /heart.{0,10}attack/i,
  /can'?t\s+breathe/i,
  /shortness\s+of\s+breath/i,
  /faint(ed|ing)?/i,
  /passed?\s+out/i,
  /blacked?\s+out/i,
  /lost\s+consciousness/i,
  /torn?\s+(muscle|ligament|tendon|acl|mcl|meniscus)/i,
  /can'?t\s+walk/i,
  /can'?t\s+move\s+(my\s+)?(arm|leg|knee|shoulder|back)/i,
  /broken\s+bone/i,
  /fracture/i,
  /dislocat(ed|ion)/i,
  /severe(ly)?\s+injur/i,
  /unbearable\s+pain/i,
  /don'?t\s+eat\s+(anything|at\s+all)/i,
  /stopp?(ed|ing)\s+eating/i,
  /starv(e|ing)\s+(myself|to)/i,
  /purging/i,
  /make\s+myself\s+(sick|vomit)/i,
  /throw(ing)?\s+up\s+(to\s+lose|after\s+(eating|meals?))/i,
  /inject(ing)?\s+(steroids|hgh|testosterone)/i,
  /anabolic\s+steroids/i,
  /buying\s+(steroids|hgh|sarms)/i,
];

function detectSafetyIssue(content: string): string | null {
  for (const pattern of SAFETY_PATTERNS) {
    if (pattern.test(content)) {
      return "What you're describing sounds like something that needs medical attention, not a workout plan. Please speak with a doctor or qualified medical professional before continuing. If you're in immediate distress, contact emergency services. I'm here to help with fitness once you've been cleared.";
    }
  }
  return null;
}

// ─── Recovery type ────────────────────────────────────────────────────────────

type RecoveryData = {
  sleepHours?: number | null;
  sleepQuality?: number | null;
  energyLevel?: number | null;
  stressLevel?: number | null;
  overallFeeling?: number | null;
  soreness?: Record<string, number> | null;
} | null;

// ─── Coach decision summary ───────────────────────────────────────────────────

function buildCoachSummary(
  profile: any,
  recentWorkouts: any[],
  equipment: any[],
  todayRecovery: RecoveryData
): string {
  const gear = equipment.length
    ? equipment.map((e: any) => e.name).join(", ")
    : profile?.availableEquipment?.join(", ") || "none (bodyweight only)";

  let readiness = "moderate";
  if (todayRecovery) {
    const sleep = todayRecovery.sleepHours ?? null;
    const energy = todayRecovery.energyLevel ?? null;
    const stress = todayRecovery.stressLevel ?? null;
    const lowSleep = sleep !== null && sleep < 6;
    const lowEnergy = energy !== null && energy <= 2;
    const highStress = stress !== null && stress >= 4;
    if (lowSleep || lowEnergy || highStress) {
      readiness = "low";
    } else if (
      (sleep === null || sleep >= 7.5) &&
      (energy === null || energy >= 4) &&
      (stress === null || stress <= 2)
    ) {
      readiness = "high";
    }
  }

  const msPerDay = 86400000;
  const last7 = recentWorkouts.filter(
    (w) => (Date.now() - new Date(w.date).getTime()) / msPerDay <= 7
  );
  const last2 = recentWorkouts
    .slice(0, 2)
    .map((w) => w.activityType || w.workoutName || "workout");
  const patternStr =
    last7.length === 0
      ? "no recent workouts"
      : `${last7.length} workout(s) this week — last: ${last2.join(", ")}`;

  return `
COACH DECISION SUMMARY:
- Equipment allowed: ${gear}
- Readiness today: ${readiness}
- Recent training pattern: ${patternStr}
- Instruction: avoid repeating same muscle groups from recent sessions; give one clear specific recommendation; match session intensity to readiness.`;
}

// ─── Gym performance builder ───────────────────────────────────────────────────

async function buildGymPerformanceSummary(userId: number): Promise<string> {
  const gymWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.userId, userId), eq(workoutsTable.activityType, "gym")))
    .orderBy(desc(workoutsTable.date))
    .limit(3);

  if (gymWorkouts.length === 0) return "";

  const workoutIds = gymWorkouts.map((w) => w.id);
  const allExercises = await db
    .select()
    .from(workoutExercisesTable)
    .where(inArray(workoutExercisesTable.workoutId, workoutIds))
    .orderBy(workoutExercisesTable.order);

  const exerciseIds = allExercises.map((e) => e.id);
  const allSets = exerciseIds.length > 0
    ? await db
        .select()
        .from(workoutSetsTable)
        .where(and(inArray(workoutSetsTable.exerciseId, exerciseIds), eq(workoutSetsTable.completed, true)))
        .orderBy(workoutSetsTable.order)
    : [];

  const setsByExercise = new Map<number, typeof allSets>();
  for (const s of allSets) {
    const arr = setsByExercise.get(s.exerciseId) ?? [];
    arr.push(s);
    setsByExercise.set(s.exerciseId, arr);
  }
  const exercisesByWorkout = new Map<number, typeof allExercises>();
  for (const e of allExercises) {
    const arr = exercisesByWorkout.get(e.workoutId) ?? [];
    arr.push(e);
    exercisesByWorkout.set(e.workoutId, arr);
  }

  const lines: string[] = [];
  for (const w of gymWorkouts) {
    const daysAgo = Math.round((Date.now() - new Date(w.date).getTime()) / 86400000);
    const dateLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
    const exRows = exercisesByWorkout.get(w.id) ?? [];
    const exSummaries: string[] = [];
    for (const ex of exRows) {
      const sets = setsByExercise.get(ex.id) ?? [];
      if (sets.length === 0) continue;
      const best = sets.reduce((b, s) => ((s.weightKg ?? 0) * (s.reps ?? 0)) > ((b.weightKg ?? 0) * (b.reps ?? 0)) ? s : b, sets[0]);
      const setStr = sets.map((s) => `${s.reps ?? "?"}${s.weightKg ? `×${s.weightKg}kg` : ""}`).join(", ");
      exSummaries.push(`  • ${ex.name}: ${setStr}${best.rpe ? ` @RPE${best.rpe}` : ""}`);
    }
    if (exSummaries.length > 0) {
      const moodStr = w.mood ? `, felt ${w.mood}` : "";
      lines.push(`${w.name || "Gym"} (${dateLabel}, ${w.durationMinutes ?? "?"}min${moodStr}):`);
      lines.push(...exSummaries);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

// ─── Bodyweight trend ─────────────────────────────────────────────────────────

async function buildBodyweightTrend(userId: number): Promise<string | null> {
  const rows = await db
    .select()
    .from(bodyMeasurementsTable)
    .where(and(eq(bodyMeasurementsTable.userId, userId), isNotNull(bodyMeasurementsTable.weightKg)))
    .orderBy(desc(bodyMeasurementsTable.date))
    .limit(4);

  if (rows.length === 0) return null;

  const ordered = [...rows].reverse();
  const entries = ordered.map((r) => {
    const d = new Date(r.date);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${label}: ${r.weightKg}kg`;
  });

  const newest = rows[0].weightKg!;
  const oldest = ordered[0].weightKg!;
  const delta = newest - oldest;
  const trendStr = delta < -0.5 ? " (trending down)" : delta > 0.5 ? " (trending up)" : " (stable)";

  return entries.join(" → ") + trendStr;
}

// ─── 7-day recovery trend ─────────────────────────────────────────────────────

async function buildRecoveryTrend(userId: number): Promise<string | null> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(recoveryLogsTable)
    .where(and(eq(recoveryLogsTable.userId, userId), gte(recoveryLogsTable.date, since)))
    .orderBy(desc(recoveryLogsTable.date))
    .limit(7);

  if (rows.length === 0) return null;

  const lines = rows.map((r) => {
    const d = new Date(r.date);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const parts: string[] = [];
    if (r.sleepHours != null) parts.push(`sleep ${r.sleepHours}h`);
    if (r.energyLevel != null) parts.push(`energy ${r.energyLevel}/10`);
    if (r.stressLevel != null) parts.push(`stress ${r.stressLevel}/10`);
    if (r.overallFeeling != null) parts.push(`feeling ${r.overallFeeling}/10`);
    if (r.soreness && Object.keys(r.soreness as object).length > 0) {
      const soreStr = Object.entries(r.soreness as Record<string, number>)
        .map(([part, val]) => `${part}(${val}/3)`)
        .join(" ");
      parts.push(`sore: ${soreStr}`);
    }
    return `${label}: ${parts.join(", ")}`;
  });

  // Detect patterns worth flagging
  const flags: string[] = [];
  const lowSleepDays = rows.filter((r) => r.sleepHours != null && r.sleepHours < 6).length;
  const lowEnergyDays = rows.filter((r) => r.energyLevel != null && r.energyLevel <= 3).length;
  const highStressDays = rows.filter((r) => r.stressLevel != null && r.stressLevel >= 7).length;
  if (lowSleepDays >= 3) flags.push(`${lowSleepDays} nights under 6h sleep this week`);
  if (lowEnergyDays >= 3) flags.push(`${lowEnergyDays} days with low energy this week`);
  if (highStressDays >= 3) flags.push(`${highStressDays} days with high stress this week`);

  const flagStr = flags.length > 0 ? `\nPatterns: ${flags.join("; ")}` : "";
  return lines.join("\n") + flagStr;
}

// ─── Rank tiers (mirrors frontend ranks.ts) ───────────────────────────────────

const RANK_TIERS = [
  { name: "Hollow",            minXp: 0,      maxXp: 99     },
  { name: "Ash Walker",        minXp: 100,    maxXp: 299    },
  { name: "Iron Seeker",       minXp: 300,    maxXp: 599    },
  { name: "Bronze Forger",     minXp: 600,    maxXp: 1199   },
  { name: "Stone Sentinel",    minXp: 1200,   maxXp: 2399   },
  { name: "Silver Vanguard",   minXp: 2400,   maxXp: 4799   },
  { name: "Gold Templar",      minXp: 4800,   maxXp: 9599   },
  { name: "Obsidian Titan",    minXp: 9600,   maxXp: 19199  },
  { name: "Crimson Champion",  minXp: 19200,  maxXp: 38399  },
  { name: "Arcane Sovereign",  minXp: 38400,  maxXp: 76799  },
  { name: "Eternal Ascendant", minXp: 76800,  maxXp: null   },
];

function getRankInfo(xp: number): { rankName: string; xpToNext: number | null } {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (xp >= RANK_TIERS[i].minXp) {
      const tier = RANK_TIERS[i];
      return {
        rankName: tier.name,
        xpToNext: tier.maxXp !== null ? tier.maxXp - xp + 1 : null,
      };
    }
  }
  return { rankName: RANK_TIERS[0].name, xpToNext: RANK_TIERS[0].maxXp! - xp + 1 };
}

// ─── Workout streak calculation ────────────────────────────────────────────────

async function buildWorkoutStreak(userId: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 365);

  const rows = await db.execute(sql`
    SELECT DISTINCT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
    FROM workouts WHERE user_id = ${userId} AND date >= ${since}
    ORDER BY day DESC
  `);
  const dates: string[] = ((rows as any).rows ?? Array.from(rows as any)).map((r: any) => r.day);

  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

  let streak = 1;
  let last = dates[0];
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(last + "T12:00:00");
    const cur = new Date(dates[i] + "T12:00:00");
    if (Math.round((prev.getTime() - cur.getTime()) / 86400000) === 1) {
      streak++;
      last = dates[i];
    } else break;
  }
  return streak;
}

// ─── Strain score ──────────────────────────────────────────────────────────────

// Returns a 0-10 strain score. Higher = more strained/tired.
// Based on: yesterday's workout RPE, last recovery log (sleep, energy, stress), workout frequency.
async function buildStrainScore(userId: number): Promise<{ score: number; factors: string[] }> {
  const factors: string[] = [];
  let score = 0;

  // Factor 1: Last recovery log
  const recoveryRows = await db
    .select()
    .from(recoveryLogsTable)
    .where(eq(recoveryLogsTable.userId, userId))
    .orderBy(desc(recoveryLogsTable.date))
    .limit(1);
  const recovery = recoveryRows[0] ?? null;

  if (recovery) {
    const sleepHours = recovery.sleepHours ?? 7;
    const energyLevel = recovery.energyLevel ?? 5;
    const stressLevel = recovery.stressLevel ?? 5;

    if (sleepHours < 5) { score += 3; factors.push(`Only ${sleepHours}h sleep`); }
    else if (sleepHours < 6.5) { score += 1.5; factors.push(`Light sleep (${sleepHours}h)`); }

    if (energyLevel <= 2) { score += 2; factors.push("Very low energy"); }
    else if (energyLevel <= 3) { score += 1; factors.push("Low energy"); }

    if (stressLevel >= 4) { score += 1; factors.push("High stress"); }
  }

  // Factor 2: Yesterday's workout RPE
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = new Date(yesterday);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const yesterdayWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(and(
      eq(workoutsTable.userId, userId),
      gte(workoutsTable.date, yesterdayStart),
      lte(workoutsTable.date, yesterdayEnd)
    ))
    .limit(1);
  const yesterdayWorkout = yesterdayWorkouts[0] ?? null;

  if (yesterdayWorkout) {
    const exercises = await db
      .select()
      .from(workoutExercisesTable)
      .where(eq(workoutExercisesTable.workoutId, yesterdayWorkout.id));

    if (exercises.length > 0) {
      const exerciseIds = exercises.map((e) => e.id);
      const sets = await db
        .select()
        .from(workoutSetsTable)
        .where(inArray(workoutSetsTable.exerciseId, exerciseIds));
      const allRpe = sets.map((s) => s.rpe ?? 0).filter((r) => r > 0);
      if (allRpe.length > 0) {
        const avgRpe = allRpe.reduce((a, b) => a + b, 0) / allRpe.length;
        if (avgRpe >= 9) { score += 2.5; factors.push(`Intense workout yesterday (RPE ${avgRpe.toFixed(1)})`); }
        else if (avgRpe >= 7) { score += 1; factors.push(`Hard workout yesterday (RPE ${avgRpe.toFixed(1)})`); }
      }
    }
  }

  // Factor 3: Consecutive workout days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.userId, userId), gte(workoutsTable.date, sevenDaysAgo)))
    .orderBy(desc(workoutsTable.date));

  if (recentWorkouts.length >= 6) { score += 1.5; factors.push("6+ workouts in last 7 days"); }
  else if (recentWorkouts.length >= 5) { score += 0.5; factors.push("5 workouts in last 7 days"); }

  return { score: Math.min(Math.round(score * 10) / 10, 10), factors };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  profile: any,
  recentWorkouts: any[],
  equipment: any[],
  todayNutrition?: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null,
  todayRecovery?: RecoveryData,
  gymPerformance?: string,
  bodyweightTrend?: string | null,
  recoveryTrend?: string | null,
  strain?: { score: number; factors: string[] },
  xp?: number,
  workoutStreak?: number
): string {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const goals = profile?.fitnessGoals?.length
    ? profile.fitnessGoals.join(", ")
    : "general fitness";

  const gear = equipment.length
    ? equipment.map((e: any) => e.name).join(", ")
    : profile?.availableEquipment?.join(", ") || "no equipment (bodyweight only)";

  const location = profile?.workoutLocation || "home";
  const experience = profile?.experienceLevel || "intermediate";
  const durationPref = profile?.preferredWorkoutDuration || "30–45 minutes";
  const weeklyDays = profile?.weeklyWorkoutDays || 3;
  const trainingPrefs = profile?.trainingPreferences?.join(", ") || "general training";
  const activityLevel = profile?.activityLevel || "moderately active";

  const recentStr =
    recentWorkouts.length === 0
      ? "No recent workouts logged in the past 30 days."
      : recentWorkouts
          .slice(0, 10)
          .map((w: any) => {
            const daysAgo = Math.round(
              (Date.now() - new Date(w.date).getTime()) / 86400000
            );
            const moodStr = w.mood ? `, felt ${w.mood}` : "";
            return `- ${w.activityType || w.workoutName} (${
              daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`
            }, ${w.durationMinutes} min${moodStr})`;
          })
          .join("\n");

  const availableTemplates = `
Available workout templates in FitLog:
• Beginner Full Body Bodyweight (30 min, bodyweight only)
• Calisthenics Fundamentals (35 min, bodyweight only)
• Walking Fat-Loss Plan (45 min, no equipment)
• Core + Mobility (25 min, bodyweight only)
• Jog/Walk Intervals (25 min, no equipment)
• Stretching & Cool Down (30 min, no equipment)
• Jump Rope Cardio Blast (20 min, jump rope)
• Dumbbell Full Body Beginner (40 min, dumbbells)
• Dumbbell Upper Body Strength (45 min, dumbbells)
• Dumbbell Leg Day (40 min, dumbbells)
• Dumbbell HIIT Circuit (30 min, dumbbells)
• Barbell Squat & Deadlift Day (50 min, barbell + rack)
• Barbell Push Day (45 min, barbell + bench)
• Barbell Pull Day (45 min, barbell)
• Upper Body Push (35 min, bodyweight/dumbbell)
• Upper Body Pull (35 min, bodyweight/dumbbell)
• Leg Day Bodyweight (30 min, bodyweight)
• Full Body HIIT (25 min, bodyweight)
• Kettlebell Flow (35 min, kettlebell)
• Resistance Band Full Body (30 min, resistance bands)
• Zone 2 Steady Cardio Run (45 min, outdoor)
• Sprint Interval Training (25 min, outdoor)
• Swim Technique (45 min, pool)
• Boxing / Shadow Boxing (30 min, boxing gloves optional)
• Stretch & Breathwork (20 min, no equipment)`;

  const coachSummary = buildCoachSummary(
    profile,
    recentWorkouts,
    equipment,
    todayRecovery ?? null
  );

  const gymSection = gymPerformance
    ? `\nRECENT GYM PERFORMANCE (actual sets × reps × weight logged by the user):\n${gymPerformance}\n`
    : "";

  const bodyweightSection = bodyweightTrend
    ? `\nBODYWEIGHT TREND (last 4 logged measurements):\n${bodyweightTrend}\n`
    : "";

  const recoveryTrendSection = recoveryTrend
    ? `\nRECOVERY TREND (last 7 days — sleep, energy 1-10, stress 1-10, feeling 1-10, soreness by muscle):\n${recoveryTrend}\n`
    : "";

  // Strain score section
  const strainSection = strain != null
    ? `\nSTRAIN SCORE: ${
        strain.score >= 7
          ? `HIGH (${strain.score}/10) — Factors: ${strain.factors.join(", ")}. Recommend rest or light active recovery today.`
          : strain.score >= 4
          ? `MODERATE (${strain.score}/10) — Factors: ${strain.factors.length > 0 ? strain.factors.join(", ") : "accumulated training load"}. Consider lower intensity today.`
          : `LOW (${strain.score}/10) — User is fresh and ready to push hard.`
      }\n`
    : "";

  // XP and rank section
  const rankInfo = xp != null ? getRankInfo(xp) : null;
  const xpSection = rankInfo
    ? `\nUSER RANK & XP: ${xp} XP — Current rank: ${rankInfo.rankName}${rankInfo.xpToNext != null ? ` (${rankInfo.xpToNext} XP to next rank)` : " (max rank)"}\n`
    : "";

  // Streak section
  const streakSection = workoutStreak != null && workoutStreak > 0
    ? `\nWORKOUT STREAK: ${workoutStreak} day${workoutStreak !== 1 ? "s" : ""} in a row\n`
    : "";

  return `You are the AI Coach inside FitLog, a personal fitness app. Your job is to give specific, practical, and personalized fitness advice. You feel like a knowledgeable personal trainer who knows the user well.

Today is ${dayName}, ${dateStr}.

USER PROFILE:
- Goals: ${goals}
- Experience level: ${experience}
- Activity level: ${activityLevel}
- Preferred workout duration: ${durationPref}
- Weekly workout frequency: ${weeklyDays} days/week
- Training preferences: ${trainingPrefs}
- Workout location: ${location}
- Available equipment: ${gear}

RECENT WORKOUT HISTORY (last 30 days, includes post-workout mood when logged):
${recentStr}

TODAY'S NUTRITION:
${
  todayNutrition
    ? `- Meals logged so far: ${todayNutrition.mealCount}
- Calories: ${Math.round(todayNutrition.calories)} kcal${profile?.dailyCalorieGoal ? ` / ${profile.dailyCalorieGoal} kcal goal` : ""}
- Protein: ${Math.round(todayNutrition.proteinG)}g${profile?.dailyProteinGoal ? ` / ${profile.dailyProteinGoal}g goal` : ""}
- Carbs: ${Math.round(todayNutrition.carbsG)}g  |  Fat: ${Math.round(todayNutrition.fatG)}g`
    : "No meals logged today yet."
}

TODAY'S RECOVERY:
${
  todayRecovery
    ? [
        todayRecovery.sleepHours != null
          ? `- Sleep: ${todayRecovery.sleepHours}h${todayRecovery.sleepQuality != null ? ` (quality ${todayRecovery.sleepQuality}/10)` : ""}`
          : null,
        todayRecovery.energyLevel != null
          ? `- Energy level: ${todayRecovery.energyLevel}/10`
          : null,
        todayRecovery.stressLevel != null
          ? `- Stress level: ${todayRecovery.stressLevel}/10`
          : null,
        todayRecovery.overallFeeling != null
          ? `- Overall feeling: ${todayRecovery.overallFeeling}/10`
          : null,
        todayRecovery.soreness && Object.keys(todayRecovery.soreness).length > 0
          ? `- Muscle soreness: ${Object.entries(todayRecovery.soreness)
              .map(([part, val]) => `${part} (${val}/3)`)
              .join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n") || "No recovery data logged today."
    : "No recovery data logged today."
}

${gymSection}${bodyweightSection}${recoveryTrendSection}${strainSection}${xpSection}${streakSection}
${availableTemplates}

COACHING STYLE:
- Be decisive. For "what should I do today" give ONE best recommendation — not a list of options.
- Never suggest exercises or equipment the user does not have available.
- Reference recent workout history to avoid repeating the same muscle groups back to back.
- When the user asks about their gym performance, reference exact numbers from RECENT GYM PERFORMANCE above.
- When recommending progression, compare to the actual last session numbers (e.g. "last time you did 3×8@80kg, try 3×8@82.5kg today").
- Name FitLog templates exactly as listed above when recommending one.
- Be calm, confident, and practical — like a trainer who already knows the plan.
- No long motivational speeches. No filler sentences. Get to the point.

RECOVERY-TO-TRAINING RULES (follow these strictly):
- If today's energy is 1-3/10 OR sleep was under 5h: prescribe active recovery or full rest. Name the specific reason (e.g. "Your energy is 2/10 today — pushing hard will only dig the hole deeper.").
- If today's energy is 4-5/10 OR sleep was 5-6h: recommend a lower-intensity session (Zone 2 cardio, stretching, or a light version of the planned workout at 70% weight).
- If the RECOVERY TREND shows 3+ days of poor sleep or low energy: flag cumulative fatigue explicitly before giving any recommendation. Say something like "You've had 4 nights under 6h sleep this week — your body is running on a deficit."
- If a muscle group shows soreness level 2-3/3 in today's or recent recovery data: never recommend training that muscle group. Suggest an antagonist or completely different session.
- If last session's mood was "Exhausted" or "Tough" and it was yesterday: factor that into intensity recommendation.
- If last gym session had any sets at RPE 9-10: treat that muscle group as needing 48h minimum rest.
- When the user asks "how's my recovery" or "should I rest": lead with the most important recovery number (worst signal), then give a direct yes/no on training today, then one sentence on what to do instead if resting.
- If STRAIN SCORE is HIGH (>=7): recommend rest day or light walk/mobility only. Do not suggest heavy gym sessions. Mention the specific strain factors.
- If STRAIN SCORE is MODERATE (4-6): suggest moderate intensity, lower volume (3 sets instead of 4, 70% of usual weight).
- If STRAIN SCORE is LOW (<4): user is fresh, can push hard — good time for PRs or personal bests.

GAMIFICATION & MOTIVATION RULES:
- Mention the user's current rank and XP occasionally as motivation, especially when they hit a milestone or are close to the next rank (e.g. "You're 50 XP away from Silver Vanguard").
- Reference the workout streak count when relevant (e.g. "You're on a 5-day streak — don't break it now.").
- When suggesting weight increases for exercises, always say the actual target number (e.g. "Try 70kg instead of 67.5kg").
- If the user has completed sets at their current weight for 2+ sessions in a row with good completion, tell them they're ready to increase weight by 2.5-5kg — be specific about which exercise.
- If the same workout template has been used 3+ times in the last 14 days, proactively suggest a variation to prevent adaptation plateau.

DECISIVENESS RULES (non-negotiable):
- NEVER open with filler phrases: "Great question!", "Of course!", "Absolutely!", "Sure!", "Happy to help!", "That's a great goal!", "I love that you're tracking this", "Fantastic!", or any variation.
- Lead EVERY response with a specific number from the user's data above — workouts completed, calories, protein grams, weight trend, days since last session, adherence percentage. If no data exists, start with the recommended action directly.
- Default to the fewest possible sentences. Most responses: 3–6 sentences. Only elaborate when the user explicitly asks for detail or a full program.
- One recommendation per response. Do not hedge with alternatives unless asked.

QUICK-ACTION CHIP GUIDANCE:
When the user sends one of these common prompts, respond exactly as described:
- "What should I do today?" — Open with workouts done vs. weekly goal (e.g. "You've hit 1 of 3 workouts this week."), then name one specific template and why.
- "How did I do this week?" — Open with workouts completed vs. target as a fraction and percentage (e.g. "3 of 4 workouts done — 75% adherence."), then one sentence on the key pattern and one on next focus.
- "I missed a workout" — Open with current weekly count vs. goal, then give one concrete recovery plan (reschedule or move on, not both).
- "I'm not progressing" — Open with a specific exercise number from GYM PERFORMANCE (e.g. "Your bench has been at 80kg for 3 sessions."), then diagnose the most likely cause in one sentence and give one fix.
- "Adjust my calories" — Open with today's numbers vs. goal (e.g. "You've had 1,850 kcal and 140g protein today against a 2,200 kcal / 180g target."), then give one specific adjustment.
- "Quick home workout" — Open with one number (e.g. "You have 30 minutes and bodyweight only." or the matching equipment fit), then go directly to workout name, exercises, sets, reps. No preamble.

RESPONSE RULES:
- Simple questions (tips, advice, motivation): 2–5 short paragraphs max.
- Workout recommendations must always include:
  1. Workout name
  2. Exercise list with sets, reps, and rest periods
  3. One sentence on progression (what to do differently next session)
- Never provide more than one workout option unless the user explicitly asks for alternatives.
- Keep answers mobile-readable: short sentences, blank lines between sections.

FORMATTING RULES (very important):
- Write in plain conversational text only. No markdown of any kind.
- Never use asterisks for bold (**), italic (*), or separators (***).
- Never use hash symbols (#) for headings.
- Use numbered lists (1. 2. 3.) or dashes (- item) for lists.
- Use blank lines between paragraphs for readability.
- Do not wrap text in backticks or code blocks.
- If you don't know something about the user, make a reasonable assumption based on their profile.

Remember: the user can see and navigate to any of the workout templates listed above inside the app.
${coachSummary}`;
}

// ─── AI model & rate limiting ─────────────────────────────────────────────────

/** Count how many AI coach messages a user has sent today (UTC). */
async function getTodayMessageCount(userId: number): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(
      and(
        eq(conversationsTable.userId, userId),
        eq(messagesTable.role, "user"),
        gte(messagesTable.createdAt, todayStart)
      )
    );
  return Number(result[0]?.count ?? 0);
}

/** Token limit based on plan tier. Model is handled by aiProvider. */
function getMaxTokens(planKey: string): number {
  return planKey === "premium" ? 2048 : 1024;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get("/conversation", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    let conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!conversation) {
      const [created] = await db
        .insert(conversations)
        .values({ userId: user.id, title: "AI Coach" })
        .returning();
      conversation = created;
    }

    // Return only the most recent 50 messages for the UI.
    // DESC + limit, then reversed so the client receives them in
    // chronological (oldest-first) order without loading thousands of rows.
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(50)
      .then((rows) => rows.reverse());

    res.json({ ...conversation, messages: msgs });
  } catch (err) {
    logError("getCoachConversation error:", err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversation", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    await db.delete(conversations).where(eq(conversations.userId, user.id));

    const [created] = await db
      .insert(conversations)
      .values({ userId: user.id, title: "AI Coach" })
      .returning();

    res.json({ ...created, messages: [] });
  } catch (err) {
    logError("clearCoachConversation error:", err);
    res.status(500).json({ error: "Failed to clear conversation" });
  }
});

router.post("/message", requireAuth, async (req, res) => {
  try {
    if (!isAIConfigured()) {
      res.status(503).json({ error: "AI features require an API key. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY." });
      return;
    }

    const user = getUser(req);
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    if (content.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 characters)" });
      return;
    }

    // ── Enforce daily AI message limit (atomic check + insert) ──
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    const dailyLimit = sub.plan.limits.aiRequestsPerDay;

    // Safety check — bypass AI entirely if triggered
    const safetyResponse = detectSafetyIssue(content.trim());

    // Atomic: get/create conversation, check rate limit, insert message in one transaction
    let conversation: any;
    const rateLimitResult = await db.transaction(async (tx: typeof db) => {
      // Advisory lock per user prevents concurrent requests from bypassing the limit
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${user.id})`);

      conversation = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.userId, user.id))
        .orderBy(desc(conversations.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!conversation) {
        const [created] = await tx
          .insert(conversations)
          .values({ userId: user.id, title: "AI Coach" })
          .returning();
        conversation = created;
      }

      // Count inside the transaction (serialized by advisory lock)
      const todayCount = await getTodayMessageCount(user.id);
      if (dailyLimit > 0 && todayCount >= dailyLimit) {
        return { limited: true, todayCount };
      }

      await tx.insert(messages).values({
        conversationId: conversation.id,
        role: "user",
        content: content.trim(),
      });
      return { limited: false, todayCount };
    });

    if (rateLimitResult.limited) {
      const isPremium = sub.effectivePlanKey === "premium";
      res.status(429).json({
        error: isPremium
          ? `You've reached your daily limit of ${dailyLimit} messages. Your limit resets at midnight UTC.`
          : `You've used all ${dailyLimit} free messages today. Upgrade to Premium for 25 messages/day with our smarter AI model.`,
        limitReached: true,
        used: rateLimitResult.todayCount,
        limit: dailyLimit,
        isPremium,
      });
      return;
    }

    if (safetyResponse) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        role: "assistant",
        content: safetyResponse,
      });
      res.json({ content: safetyResponse });
      return;
    }

    // Load the last 12 messages at the DB level — DESC + reverse avoids
    // fetching thousands of rows and slicing in memory.
    const trimmedHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(8)
      .then((rows) => rows.reverse());

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id))
      .limit(1);

    const recentWorkouts = await db
      .select()
      .from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(20);

    const userEquipment = await db
      .select()
      .from(equipmentTable)
      .where(and(eq(equipmentTable.userId, user.id)));

    // Today's nutrition context
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMeals = await db
      .select()
      .from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, todayStart)));

    let todayNutrition: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      mealCount: number;
    } | null = null;
    if (todayMeals.length > 0) {
      const mealIds = todayMeals.map((m) => m.id);
      const allFoodItems = await Promise.all(
        mealIds.map((id) =>
          db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, id))
        )
      );
      const flatItems = allFoodItems.flat();
      todayNutrition = {
        mealCount: todayMeals.length,
        calories: flatItems.reduce((s, f) => s + f.calories, 0),
        proteinG: flatItems.reduce((s, f) => s + f.proteinG, 0),
        carbsG: flatItems.reduce((s, f) => s + f.carbsG, 0),
        fatG: flatItems.reduce((s, f) => s + f.fatG, 0),
      };
    }

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const recoveryRows = await db
      .select()
      .from(recoveryLogsTable)
      .where(
        and(
          eq(recoveryLogsTable.userId, user.id),
          gte(recoveryLogsTable.date, todayStart),
          lt(recoveryLogsTable.date, todayEnd)
        )
      )
      .limit(1);
    const todayRecovery = recoveryRows[0] ?? null;

    const [gymPerformance, bodyweightTrend, recoveryTrend, [userSettings], strain, workoutStreak] = await Promise.all([
      buildGymPerformanceSummary(user.id),
      buildBodyweightTrend(user.id),
      buildRecoveryTrend(user.id),
      db.select().from(settingsTable).where(eq(settingsTable.userId, user.id)).limit(1),
      buildStrainScore(user.id),
      buildWorkoutStreak(user.id),
    ]);

    const userXp: number = profile?.xp ?? 0;

    let systemPrompt = buildSystemPrompt(
      profile,
      recentWorkouts,
      userEquipment,
      todayNutrition,
      todayRecovery,
      gymPerformance || undefined,
      bodyweightTrend,
      recoveryTrend,
      strain,
      userXp,
      workoutStreak
    );

    if (userSettings?.language === "ar") {
      systemPrompt +=
        "\n\nLANGUAGE: You MUST respond entirely in Arabic (العربية). All text, recommendations, template names, and coaching advice must be in Arabic. Use Arabic numerals for numbers.";
    }

    const chatMessages = trimmedHistory.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    const maxTokens = getMaxTokens(sub.effectivePlanKey);

    const fullResponse = await Promise.race([
      chatCompletion({ system: systemPrompt, messages: chatMessages, maxTokens }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 45000)),
    ]) || "I'm having trouble generating a useful response. Try asking with your goal, equipment, and time available.";

    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: fullResponse,
    });

    const remaining = dailyLimit > 0 ? Math.max(0, dailyLimit - todayCount - 1) : -1;
    res.json({ content: fullResponse, remaining, limit: dailyLimit });
  } catch (err) {
    logError("sendCoachMessage error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── Proactive opening message ────────────────────────────────────────────────

router.post("/proactive", requireAuth, async (req, res) => {
  try {
    if (!isAIConfigured()) {
      res.status(204).end();
      return;
    }

    const user = getUser(req);

    let conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!conversation) {
      const [created] = await db
        .insert(conversations)
        .values({ userId: user.id, title: "AI Coach" })
        .returning();
      conversation = created;
    }

    // If the conversation already has messages, skip — not empty anymore
    const existing = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .limit(1);
    if (existing.length > 0) {
      res.status(204).end();
      return;
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id))
      .limit(1);

    const recentWorkouts = await db
      .select()
      .from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(20);

    const userEquipment = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.userId, user.id));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMeals = await db
      .select()
      .from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, todayStart)));

    let todayNutrition: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null = null;
    if (todayMeals.length > 0) {
      const allFoodItems = await Promise.all(
        todayMeals.map((m) => db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, m.id)))
      );
      const flatItems = allFoodItems.flat();
      todayNutrition = {
        mealCount: todayMeals.length,
        calories: flatItems.reduce((s, f) => s + f.calories, 0),
        proteinG: flatItems.reduce((s, f) => s + f.proteinG, 0),
        carbsG: flatItems.reduce((s, f) => s + f.carbsG, 0),
        fatG: flatItems.reduce((s, f) => s + f.fatG, 0),
      };
    }

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const recoveryRows = await db
      .select()
      .from(recoveryLogsTable)
      .where(and(eq(recoveryLogsTable.userId, user.id), gte(recoveryLogsTable.date, todayStart), lt(recoveryLogsTable.date, todayEnd)))
      .limit(1);
    const todayRecovery = recoveryRows[0] ?? null;

    const [gymPerformance, bodyweightTrend, recoveryTrend, [userSettings], strain, workoutStreak] = await Promise.all([
      buildGymPerformanceSummary(user.id),
      buildBodyweightTrend(user.id),
      buildRecoveryTrend(user.id),
      db.select().from(settingsTable).where(eq(settingsTable.userId, user.id)).limit(1),
      buildStrainScore(user.id),
      buildWorkoutStreak(user.id),
    ]);

    const userXp: number = profile?.xp ?? 0;
    const rankInfo = getRankInfo(userXp);

    let systemPrompt = buildSystemPrompt(
      profile,
      recentWorkouts,
      userEquipment,
      todayNutrition,
      todayRecovery,
      gymPerformance || undefined,
      bodyweightTrend,
      recoveryTrend,
      strain,
      userXp,
      workoutStreak
    );

    if (userSettings?.language === "ar") {
      systemPrompt +=
        "\n\nLANGUAGE: You MUST respond entirely in Arabic (العربية). All text, recommendations, template names, and coaching advice must be in Arabic. Use Arabic numerals for numbers.";
    }

    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

    // Build enriched proactive context for the opening brief
    const strainContext = strain.score >= 7
      ? `Strain is HIGH (${strain.score}/10) — recommend rest or active recovery today.`
      : strain.score >= 4
      ? `Strain is MODERATE (${strain.score}/10) — suggest lower intensity.`
      : `Strain is LOW (${strain.score}/10) — user is fresh and ready to push.`;
    const streakContext = workoutStreak > 0 ? `Current workout streak: ${workoutStreak} day(s).` : "No active workout streak.";
    const rankContext = `User is rank ${rankInfo.rankName} with ${userXp} XP${rankInfo.xpToNext != null ? ` (${rankInfo.xpToNext} XP to next rank)` : ""}.`;
    const gymContext = gymPerformance
      ? `Recent gym performance available — reference a specific weight/exercise if relevant.`
      : "";

    const proactivePrompt = `Today is ${dayName}. Give me my opening brief — exactly 2 to 3 sentences. Lead with the single most important number from my data (workouts this week vs. goal, today's protein vs. target, days since last session, bodyweight trend, or weekly adherence %). Include one of these if relevant: ${strainContext} ${streakContext} ${rankContext} ${gymContext} End with one concrete action I should take right now. No greeting, no preamble, no sign-off. If there is no data to reference, say: "Log your first workout today — it's the only data point that matters right now."`;

    const aiResponse = await Promise.race([
      chatCompletion({
        system: systemPrompt,
        messages: [{ role: "user", content: proactivePrompt }],
        maxTokens: 512,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 45000)),
    ]);

    const content =
      aiResponse ||
      "Log your first workout today — it's the only data point that matters right now.";

    // Save ONLY the assistant message — no user message stored
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content,
    });

    res.json({ content });
  } catch (err) {
    logError("proactiveCoachMessage error:", err);
    res.status(204).end();
  }
});

export default router;
