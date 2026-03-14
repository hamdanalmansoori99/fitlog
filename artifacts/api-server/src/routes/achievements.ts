import { Router } from "express";
import { db } from "@workspace/db";
import {
  workoutsTable,
  mealsTable,
  waterLogsTable,
  profilesTable,
  achievementsTable,
  workoutExercisesTable,
  workoutSetsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { trackEvent } from "../services/analyticsService";

const router = Router();

const ACHIEVEMENT_DEFS = [
  // Workout count
  { key: "workouts_1",   title: "First Rep",       description: "Complete your first workout",        category: "workouts",   type: "workout_count",     threshold: 1   },
  { key: "workouts_5",   title: "Finding Rhythm",  description: "Complete 5 workouts",                category: "workouts",   type: "workout_count",     threshold: 5   },
  { key: "workouts_10",  title: "Double Digits",   description: "Complete 10 workouts",               category: "workouts",   type: "workout_count",     threshold: 10  },
  { key: "workouts_25",  title: "Committed",       description: "Complete 25 workouts",               category: "workouts",   type: "workout_count",     threshold: 25  },
  { key: "workouts_50",  title: "Halfway to 100",  description: "Complete 50 workouts",               category: "workouts",   type: "workout_count",     threshold: 50  },
  { key: "workouts_100", title: "The Century",     description: "Log 100 workouts",                   category: "workouts",   type: "workout_count",     threshold: 100 },
  // Workout streaks
  { key: "workout_streak_3",  title: "Three Peat",       description: "Train 3 days in a row",          category: "streaks", type: "workout_streak", threshold: 3  },
  { key: "workout_streak_7",  title: "Week Warrior",     description: "Train 7 days in a row",          category: "streaks", type: "workout_streak", threshold: 7  },
  { key: "workout_streak_14", title: "Two Weeks Solid",  description: "Train 14 days in a row",         category: "streaks", type: "workout_streak", threshold: 14 },
  { key: "workout_streak_30", title: "Monthly Grind",    description: "Train 30 days in a row",         category: "streaks", type: "workout_streak", threshold: 30 },
  // Meal streaks
  { key: "meal_streak_3",  title: "Tracking Habit",   description: "Log meals 3 days in a row",        category: "nutrition", type: "meal_streak", threshold: 3  },
  { key: "meal_streak_7",  title: "Nutrition Week",   description: "Log meals every day for a week",   category: "nutrition", type: "meal_streak", threshold: 7  },
  { key: "meal_streak_14", title: "Macro Master",     description: "Log meals 14 days in a row",       category: "nutrition", type: "meal_streak", threshold: 14 },
  { key: "meal_streak_30", title: "30-Day Fuel Log",  description: "Log meals every day for a month",  category: "nutrition", type: "meal_streak", threshold: 30 },
  // Hydration streaks
  { key: "hydration_streak_3",  title: "Staying Hydrated", description: "Hit water goal 3 days in a row",       category: "hydration", type: "hydration_streak", threshold: 3  },
  { key: "hydration_streak_7",  title: "Water Week",       description: "Hit water goal 7 days in a row",       category: "hydration", type: "hydration_streak", threshold: 7  },
  { key: "hydration_streak_14", title: "H2O Habit",        description: "Hit water goal 14 days in a row",      category: "hydration", type: "hydration_streak", threshold: 14 },
  { key: "hydration_streak_30", title: "Hydration Hero",   description: "Hit water goal every day for a month", category: "hydration", type: "hydration_streak", threshold: 30 },
  // PRs
  { key: "pr_first", title: "Personal Best",    description: "Set your first personal record", category: "prs", type: "pr_count", threshold: 1  },
  { key: "pr_5",     title: "Getting Stronger", description: "Set 5 personal records",         category: "prs", type: "pr_count", threshold: 5  },
  { key: "pr_10",    title: "PR Machine",       description: "Set 10 personal records",        category: "prs", type: "pr_count", threshold: 10 },
] as const;

function computeStreak(sorted: string[]): { current: number; best: number } {
  if (sorted.length === 0) return { current: 0, best: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let current = 0;
  if (sorted[0] === todayStr || sorted[0] === yesterdayStr) {
    let last = sorted[0];
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(last + "T12:00:00");
      const cur = new Date(sorted[i] + "T12:00:00");
      if (Math.round((prev.getTime() - cur.getTime()) / 86400000) === 1) {
        current++;
        last = sorted[i];
      } else break;
    }
  }

  let best = current;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const cur = new Date(sorted[i] + "T12:00:00");
    if (Math.round((prev.getTime() - cur.getTime()) / 86400000) === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  best = Math.max(best, run);
  return { current, best };
}

function parseRows(result: any): any[] {
  return (result as any).rows ?? Array.from(result as any);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const since = new Date();
    since.setDate(since.getDate() - 365);

    const [workoutR, mealR, profileR] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
        FROM workouts WHERE user_id = ${user.id} AND date >= ${since}
        ORDER BY day DESC
      `),
      db.execute(sql`
        SELECT DISTINCT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
        FROM meals WHERE user_id = ${user.id} AND date >= ${since}
        ORDER BY day DESC
      `),
      db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1),
    ]);

    const workoutDates: string[] = parseRows(workoutR).map((r: any) => r.day);
    const mealDates: string[] = parseRows(mealR).map((r: any) => r.day);
    const waterGoal = profileR[0]?.dailyWaterGoalMl ?? 2000;

    const hydrationR = await db.execute(sql`
      SELECT to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
      FROM water_logs WHERE user_id = ${user.id} AND logged_at >= ${since}
      GROUP BY day HAVING sum(amount_ml) >= ${waterGoal}
      ORDER BY day DESC
    `);
    const hydrationDates: string[] = parseRows(hydrationR).map((r: any) => r.day);

    const workoutStreak = computeStreak(workoutDates);
    const mealStreak = computeStreak(mealDates);
    const hydrationStreak = computeStreak(hydrationDates);

    const last7: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(d.toISOString().split("T")[0]);
    }
    const wSet = new Set(workoutDates);
    const mSet = new Set(mealDates);
    const hSet = new Set(hydrationDates);
    const workoutDaysWeek = last7.filter(d => wSet.has(d)).length;
    const mealDaysWeek = last7.filter(d => mSet.has(d)).length;
    const hydrationDaysWeek = last7.filter(d => hSet.has(d)).length;
    const weeklyScore = Math.round((workoutDaysWeek + mealDaysWeek + hydrationDaysWeek) / 21 * 100);

    const [countR, prR, allPrR, earnedRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(workoutsTable).where(eq(workoutsTable.userId, user.id)),
      db.execute(sql`
        WITH bests AS (
          SELECT we.name AS exercise,
            max(ws.weight_kg) AS all_time_best,
            max(CASE WHEN w.date >= NOW() - INTERVAL '30 days' THEN ws.weight_kg END) AS recent_best,
            max(w.date) AS latest_date
          FROM workout_exercises we
          JOIN workout_sets ws ON ws.exercise_id = we.id
          JOIN workouts w ON w.id = we.workout_id
          WHERE w.user_id = ${user.id} AND ws.weight_kg > 0
          GROUP BY we.name
        )
        SELECT exercise, all_time_best, recent_best, latest_date
        FROM bests
        WHERE recent_best IS NOT NULL AND recent_best >= all_time_best
        ORDER BY latest_date DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT count(DISTINCT we.name)::int AS cnt
        FROM workout_exercises we
        JOIN workout_sets ws ON ws.exercise_id = we.id
        JOIN workouts w ON w.id = we.workout_id
        WHERE w.user_id = ${user.id} AND ws.weight_kg > 0
      `),
      db.select().from(achievementsTable).where(eq(achievementsTable.userId, user.id)),
    ]);

    const workoutCount = Number(countR[0]?.count ?? 0);
    const recentPRs = parseRows(prR).map((r: any) => ({
      exercise: r.exercise,
      weightKg: Number(r.all_time_best),
      date: r.latest_date ? new Date(r.latest_date).toISOString().split("T")[0] : null,
    }));
    const totalPRCount = Number(parseRows(allPrR)[0]?.cnt ?? 0);

    const earnedKeys = new Set(earnedRows.map(e => e.key));
    const newlyEarned: string[] = [];

    const checks = [
      ...ACHIEVEMENT_DEFS.filter(d => d.type === "workout_count").map(d => ({ key: d.key, title: d.title, met: workoutCount >= d.threshold })),
      ...ACHIEVEMENT_DEFS.filter(d => d.type === "workout_streak").map(d => ({ key: d.key, title: d.title, met: workoutStreak.best >= d.threshold })),
      ...ACHIEVEMENT_DEFS.filter(d => d.type === "meal_streak").map(d => ({ key: d.key, title: d.title, met: mealStreak.best >= d.threshold })),
      ...ACHIEVEMENT_DEFS.filter(d => d.type === "hydration_streak").map(d => ({ key: d.key, title: d.title, met: hydrationStreak.best >= d.threshold })),
      ...ACHIEVEMENT_DEFS.filter(d => d.type === "pr_count").map(d => ({ key: d.key, title: d.title, met: totalPRCount >= d.threshold })),
    ];

    for (const c of checks) {
      if (c.met && !earnedKeys.has(c.key)) {
        try {
          await db.insert(achievementsTable).values({ userId: user.id, key: c.key, title: c.title });
          void trackEvent(user.id, "achievement.earned", { key: c.key, title: c.title });
          newlyEarned.push(c.key);
          earnedKeys.add(c.key);
        } catch {}
      }
    }

    const earnedFinal = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, user.id));
    const earnedKeysFinal = new Set(earnedFinal.map(e => e.key));

    const achievements = ACHIEVEMENT_DEFS.map(d => ({
      key: d.key,
      title: d.title,
      description: d.description,
      category: d.category,
      type: d.type,
      threshold: d.threshold,
      earned: earnedKeysFinal.has(d.key),
      earnedAt: earnedFinal.find(e => e.key === d.key)?.earnedAt ?? null,
      progress: (() => {
        if (d.type === "workout_count") return { current: Math.min(workoutCount, d.threshold), total: d.threshold };
        if (d.type === "workout_streak") return { current: Math.min(workoutStreak.best, d.threshold), total: d.threshold };
        if (d.type === "meal_streak") return { current: Math.min(mealStreak.best, d.threshold), total: d.threshold };
        if (d.type === "hydration_streak") return { current: Math.min(hydrationStreak.best, d.threshold), total: d.threshold };
        if (d.type === "pr_count") return { current: Math.min(totalPRCount, d.threshold), total: d.threshold };
        return null;
      })(),
    }));

    res.json({
      streaks: { workout: workoutStreak, meal: mealStreak, hydration: hydrationStreak },
      weeklyScore: {
        score: weeklyScore,
        workoutDays: workoutDaysWeek,
        mealDays: mealDaysWeek,
        hydrationDays: hydrationDaysWeek,
        days: last7,
        perDay: last7.map(d => ({
          date: d,
          workout: wSet.has(d),
          meal: mSet.has(d),
          hydration: hSet.has(d),
        })),
      },
      workoutCount,
      totalPRCount,
      achievements,
      newlyEarned,
      recentPRs,
    });
  } catch (err) {
    console.error("achievements error:", err);
    res.status(500).json({ error: "Failed to get achievements" });
  }
});

export default router;
