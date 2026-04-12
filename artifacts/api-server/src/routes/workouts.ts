import { Router } from "express";
import { db, workoutsTable, workoutExercisesTable, workoutSetsTable, mealsTable, mealFoodItemsTable, profilesTable, achievementsTable } from "@workspace/db";
import { eq, and, gte, lt, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { trackEvent } from "../services/analyticsService";
import { logError } from "../lib/logger";
import { computeStreaks } from "../lib/streaks";
import { getActiveSubscription } from "../services/subscriptionService";

const router = Router();

// Lightweight achievement definitions checked after workout save
const WORKOUT_ACHIEVEMENTS = [
  { key: "workouts_1",   title: "First Rep",      threshold: 1,  type: "count" },
  { key: "workouts_5",   title: "Finding Rhythm",  threshold: 5,  type: "count" },
  { key: "workouts_10",  title: "Double Digits",   threshold: 10, type: "count" },
  { key: "workouts_25",  title: "Committed",       threshold: 25, type: "count" },
  { key: "workouts_50",  title: "Halfway to 100",  threshold: 50, type: "count" },
  { key: "workouts_100", title: "The Century",     threshold: 100,type: "count" },
  { key: "workout_streak_3",  title: "Three Peat",      threshold: 3,  type: "streak" },
  { key: "workout_streak_7",  title: "Week Warrior",     threshold: 7,  type: "streak" },
  { key: "workout_streak_14", title: "Two Weeks Solid",  threshold: 14, type: "streak" },
  { key: "workout_streak_30", title: "Monthly Grind",    threshold: 30, type: "streak" },
] as const;

async function checkNewAchievements(userId: number): Promise<{ key: string; title: string }[]> {
  try {
    const [countR, earnedRows, workoutDaysR] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(workoutsTable).where(eq(workoutsTable.userId, userId)),
      db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId)),
      db.execute(sql`
        SELECT DISTINCT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
        FROM workouts WHERE user_id = ${userId}
        ORDER BY day DESC
      `),
    ]);

    const workoutCount = Number(countR[0]?.count ?? 0);
    const workoutDates = ((workoutDaysR as any).rows ?? Array.from(workoutDaysR as any)).map((r: any) => new Date(r.day + "T00:00:00Z"));
    const streakInfo = computeStreaks(workoutDates);
    const earnedKeys = new Set(earnedRows.map(e => e.key));
    const newlyEarned: { key: string; title: string }[] = [];

    for (const ach of WORKOUT_ACHIEVEMENTS) {
      if (earnedKeys.has(ach.key)) continue;
      const met = ach.type === "count" ? workoutCount >= ach.threshold : streakInfo.current >= ach.threshold;
      if (met) {
        try {
          await db.insert(achievementsTable).values({ userId, key: ach.key, title: ach.title });
          void trackEvent(userId, "achievement.earned", { key: ach.key, title: ach.title });
          newlyEarned.push({ key: ach.key, title: ach.title });
        } catch {}
      }
    }
    return newlyEarned;
  } catch {
    return [];
  }
}

async function getWorkoutWithExercises(workoutId: number, userId: number) {
  const workouts = await db.select().from(workoutsTable)
    .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, userId)))
    .limit(1);
  
  if (workouts.length === 0) return null;
  const workout = workouts[0];
  
  const exercises = await db.select().from(workoutExercisesTable)
    .where(eq(workoutExercisesTable.workoutId, workoutId))
    .orderBy(workoutExercisesTable.order);
  
  const exercisesWithSets = await Promise.all(
    exercises.map(async (ex) => {
      const sets = await db.select().from(workoutSetsTable)
        .where(eq(workoutSetsTable.exerciseId, ex.id))
        .orderBy(workoutSetsTable.order);
      return { ...ex, sets };
    })
  );
  
  return { ...workout, exercises: exercisesWithSets };
}

router.get("/stats/today", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWorkouts = await db.select().from(workoutsTable)
      .where(and(
        eq(workoutsTable.userId, user.id),
        gte(workoutsTable.date, today),
        lt(workoutsTable.date, tomorrow)
      ));

    const todayMeals = await db.select().from(mealsTable)
      .where(and(
        eq(mealsTable.userId, user.id),
        gte(mealsTable.date, today),
        lt(mealsTable.date, tomorrow)
      ));

    const caloriesBurned = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
    const activeMinutes = todayWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

    res.json({
      caloriesBurned,
      activeMinutes,
      workoutsCompleted: todayWorkouts.length,
      mealsLogged: todayMeals.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get today stats" });
  }
});

router.get("/stats/weekly", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const today = new Date();

    // Build date range: from 6 days ago to end of today
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    rangeEnd.setHours(0, 0, 0, 0);

    // Single query for the entire 7-day range
    const workouts = await db.select().from(workoutsTable)
      .where(and(
        eq(workoutsTable.userId, user.id),
        gte(workoutsTable.date, rangeStart),
        lt(workoutsTable.date, rangeEnd)
      ));

    // Group by date string in memory
    const minutesByDate = new Map<string, number>();
    for (const w of workouts) {
      const dateStr = new Date(w.date).toISOString().split("T")[0];
      minutesByDate.set(dateStr, (minutesByDate.get(dateStr) ?? 0) + (w.durationMinutes || 0));
    }

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];

      days.push({
        date: dateStr,
        dayLabel: dayLabels[date.getDay()],
        activeMinutes: minutesByDate.get(dateStr) ?? 0,
        isToday: i === 0,
      });
    }

    res.json({ days });
  } catch (err) {
    res.status(500).json({ error: "Failed to get weekly stats" });
  }
});

router.get("/stats/summary", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const now = new Date();
    
    // This week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisWeekWorkouts = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, startOfWeek)));
    
    const thisMonthWorkouts = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, startOfMonth)));

    // Weekly frequency over last 8 weeks -- single query, partition in memory
    const freqRangeStart = new Date(now);
    freqRangeStart.setDate(now.getDate() - now.getDay() - 7 * 7);
    freqRangeStart.setHours(0, 0, 0, 0);
    const freqRangeEnd = new Date(now);
    freqRangeEnd.setDate(now.getDate() - now.getDay() + 7);
    freqRangeEnd.setHours(0, 0, 0, 0);

    const freqWorkouts = await db.select({ date: workoutsTable.date }).from(workoutsTable)
      .where(and(
        eq(workoutsTable.userId, user.id),
        gte(workoutsTable.date, freqRangeStart),
        lt(workoutsTable.date, freqRangeEnd)
      ));

    // Partition workouts by week bucket
    const weekCounts = new Map<number, number>();
    for (const w of freqWorkouts) {
      const daysDiff = Math.floor((new Date(w.date).getTime() - freqRangeStart.getTime()) / 86400000);
      const weekBucket = Math.floor(daysDiff / 7);
      weekCounts.set(weekBucket, (weekCounts.get(weekBucket) ?? 0) + 1);
    }

    const weeklyFrequency = [];
    for (let i = 7; i >= 0; i--) {
      const bucket = 7 - i;
      const weekLabel = `W${8 - i}`;
      weeklyFrequency.push({ weekLabel, count: weekCounts.get(bucket) ?? 0 });
    }

    // Activity breakdown
    const allWorkouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id));
    
    const activityCounts: Record<string, number> = {};
    allWorkouts.forEach(w => {
      activityCounts[w.activityType] = (activityCounts[w.activityType] || 0) + 1;
    });
    
    const total = allWorkouts.length;
    const activityBreakdown = Object.entries(activityCounts).map(([activityType, count]) => ({
      activityType,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    res.json({
      totalThisWeek: thisWeekWorkouts.length,
      totalThisMonth: thisMonthWorkouts.length,
      weeklyFrequency,
      activityBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get workout summary" });
  }
});

router.get("/recent", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    
    const recentWorkouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(3);
    
    const recentMeals = await db.select().from(mealsTable)
      .where(eq(mealsTable.userId, user.id))
      .orderBy(desc(mealsTable.date))
      .limit(3);
    
    const resolvedMeals = await Promise.all(recentMeals.map(async m => {
      const foodItems = await db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, m.id));
      const totalCal = foodItems.reduce((s, f) => s + f.calories, 0);
      return {
        id: m.id,
        type: "meal" as const,
        name: m.name,
        date: m.date,
        activityType: m.category,
        keyStat: `${Math.round(totalCal)} kcal`,
      };
    }));
    
    const allActivities = [
      ...recentWorkouts.map(w => ({
        id: w.id,
        type: "workout" as const,
        name: w.name || w.activityType,
        date: w.date,
        activityType: w.activityType,
        keyStat: w.durationMinutes 
          ? `${w.durationMinutes} min${w.distanceKm ? ` · ${w.distanceKm.toFixed(1)} km` : ""}` 
          : w.caloriesBurned ? `${w.caloriesBurned} kcal` : null,
      })),
      ...resolvedMeals,
    ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
    
    res.json({ activities: allActivities });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

router.get("/calendar", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (isNaN(year) || year < 1900 || year > 2200) {
      res.status(400).json({ error: "year must be between 1900 and 2200" });
      return;
    }
    if (isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: "month must be between 1 and 12" });
      return;
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [workouts, meals] = await Promise.all([
      db.select({
        id: workoutsTable.id,
        name: workoutsTable.name,
        activityType: workoutsTable.activityType,
        date: workoutsTable.date,
        durationMinutes: workoutsTable.durationMinutes,
      }).from(workoutsTable)
        .where(and(
          eq(workoutsTable.userId, user.id),
          gte(workoutsTable.date, start),
          lt(workoutsTable.date, end)
        ))
        .orderBy(workoutsTable.date),

      db.select({ date: mealsTable.date })
        .from(mealsTable)
        .where(and(
          eq(mealsTable.userId, user.id),
          gte(mealsTable.date, start),
          lt(mealsTable.date, end)
        )),
    ]);

    const workoutEntries = workouts.map((w) => ({
      id: w.id,
      date: new Date(w.date).toISOString().split("T")[0],
      name: w.name,
      activityType: w.activityType,
      durationMinutes: w.durationMinutes,
    }));

    const byDate: Record<string, typeof workoutEntries> = {};
    for (const entry of workoutEntries) {
      if (!byDate[entry.date]) byDate[entry.date] = [];
      byDate[entry.date].push(entry);
    }

    const mealDays = new Set<string>();
    for (const m of meals) {
      mealDays.add(new Date(m.date).toISOString().split("T")[0]);
    }

    res.json({ year, month, workouts: workoutEntries, days: byDate, mealDays: Array.from(mealDays) });
  } catch (err) {
    res.status(500).json({ error: "Failed to get calendar data" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Fix #9: cap at 100
    const offset = parseInt(req.query.offset as string) || 0;

    const allWorkouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(limit)
      .offset(offset);

    if (allWorkouts.length === 0) {
      res.json({ workouts: [], total: 0 });
      return;
    }

    // Batch-fetch all exercises and sets in 2 queries instead of N*M+N
    const workoutIds = allWorkouts.map(w => w.id);
    const allExercises = await db.select().from(workoutExercisesTable)
      .where(inArray(workoutExercisesTable.workoutId, workoutIds))
      .orderBy(workoutExercisesTable.order);

    const exercisesWithSets = allExercises.length > 0
      ? await (async () => {
          const exerciseIds = allExercises.map(e => e.id);
          const allSets = await db.select().from(workoutSetsTable)
            .where(inArray(workoutSetsTable.exerciseId, exerciseIds))
            .orderBy(workoutSetsTable.order);

          const setsByExerciseId = new Map<number, typeof allSets>();
          for (const set of allSets) {
            const arr = setsByExerciseId.get(set.exerciseId) ?? [];
            arr.push(set);
            setsByExerciseId.set(set.exerciseId, arr);
          }
          return allExercises.map(ex => ({ ...ex, sets: setsByExerciseId.get(ex.id) ?? [] }));
        })()
      : [];

    const exercisesByWorkoutId = new Map<number, typeof exercisesWithSets>();
    for (const ex of exercisesWithSets) {
      const arr = exercisesByWorkoutId.get(ex.workoutId) ?? [];
      arr.push(ex);
      exercisesByWorkoutId.set(ex.workoutId, arr);
    }

    // Compute locked flag for free-tier data retention
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    const retentionDays = sub.plan.limits.dataRetentionDays;
    const cutoffDate = retentionDays < Infinity ? new Date(Date.now() - retentionDays * 86400000) : null;

    const workoutsWithExercises = allWorkouts.map(w => ({
      ...w,
      exercises: exercisesByWorkoutId.get(w.id) ?? [],
      locked: cutoffDate ? new Date(w.date) < cutoffDate : false,
    }));

    res.json({ workouts: workoutsWithExercises, total: workoutsWithExercises.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to get workouts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workoutId = parseInt(req.params.id as string);
    if (isNaN(workoutId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const workout = await getWorkoutWithExercises(workoutId, user.id);
    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    res.json(workout);
  } catch (err) {
    res.status(500).json({ error: "Failed to get workout" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { activityType, name, date, durationMinutes, distanceKm, caloriesBurned, mood, notes, metadata, exercises } = req.body;

    if (!activityType || typeof activityType !== "string") {
      res.status(400).json({ error: "activityType is required" });
      return;
    }
    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const numericFields: Record<string, unknown> = { durationMinutes, distanceKm, caloriesBurned };
    for (const [field, val] of Object.entries(numericFields)) {
      if (val !== undefined && (typeof val !== "number" || !isFinite(val) || val < 0)) {
        res.status(400).json({ error: `${field} must be a non-negative number` });
        return;
      }
    }

    // Filter out exercises with zero completed sets
    const validExercises = exercises?.filter(
      (ex: any) => ex.sets && Array.isArray(ex.sets) && ex.sets.length > 0
    );

    const workout = await db.transaction(async (tx: typeof db) => {
      const [w] = await tx.insert(workoutsTable).values({
        userId: user.id,
        activityType,
        name,
        date: new Date(date),
        durationMinutes,
        distanceKm,
        caloriesBurned,
        mood,
        notes,
        metadata,
      }).returning();

      if (validExercises && validExercises.length > 0) {
        for (const ex of validExercises) {
          const [exercise] = await tx.insert(workoutExercisesTable).values({
            workoutId: w.id,
            name: ex.name,
            order: ex.order,
          }).returning();

          if (ex.sets && ex.sets.length > 0) {
            for (const set of ex.sets) {
              await tx.insert(workoutSetsTable).values({
                exerciseId: exercise.id,
                reps: set.reps,
                weightKg: set.weightKg,
                order: set.order,
              });
            }
          }
        }
      }

      return w;
    });

    const fullWorkout = await getWorkoutWithExercises(workout.id, user.id);

    // Award XP for workout completion
    await db.update(profilesTable)
      .set({ xp: sql`${profilesTable.xp} + 50` })
      .where(eq(profilesTable.userId, user.id));

    // Check for newly unlocked achievements
    const newAchievements = await checkNewAchievements(user.id);

    void trackEvent(user.id, "workout.logged", {
      activityType: workout.activityType,
      durationMinutes: workout.durationMinutes,
      caloriesBurned: workout.caloriesBurned,
      exerciseCount: validExercises?.length ?? 0,
    });

    res.status(201).json({ ...fullWorkout, newAchievements });
  } catch (err) {
    logError("Create workout error:", err);
    res.status(500).json({ error: "Failed to create workout" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workoutId = parseInt(req.params.id as string);
    if (isNaN(workoutId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const existing = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)))
      .limit(1);
    
    if (existing.length === 0) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    
    const { activityType, name, date, durationMinutes, distanceKm, caloriesBurned, mood, notes, metadata } = req.body;

    await db.update(workoutsTable).set({
      activityType, name, date: new Date(date), durationMinutes, distanceKm, caloriesBurned, mood, notes, metadata, updatedAt: new Date(),
    }).where(eq(workoutsTable.id, workoutId));

    const fullWorkout = await getWorkoutWithExercises(workoutId, user.id);
    res.json(fullWorkout);
  } catch (err) {
    res.status(500).json({ error: "Failed to update workout" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workoutId = parseInt(req.params.id as string);
    if (isNaN(workoutId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const existing = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    await db.delete(workoutsTable).where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)));
    res.json({ message: "Workout deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete workout" });
  }
});

export default router;
