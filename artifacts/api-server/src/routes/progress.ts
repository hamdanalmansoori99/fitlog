import { Router } from "express";
import { db, workoutsTable, mealsTable, workoutExercisesTable, workoutSetsTable, profilesTable } from "@workspace/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function calcStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateDays = [...new Set(sorted.map(d => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  }))].sort((a, b) => b - a);
  
  let streak = 0;
  let currentDay = today.getTime();
  
  for (const dayTime of dateDays) {
    if (dayTime === currentDay || dayTime === currentDay - 86400000) {
      streak++;
      currentDay = dayTime - 86400000;
    } else {
      break;
    }
  }
  
  return streak;
}

function calcLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const dateDays = [...new Set(dates.map(d => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  }))].sort((a, b) => a - b);

  if (dateDays.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dateDays.length; i++) {
    if (dateDays[i] - dateDays[i - 1] === 86400000) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

router.get("/streaks", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    
    const workouts = await db.select({ date: workoutsTable.date })
      .from(workoutsTable).where(eq(workoutsTable.userId, user.id));
    
    const meals = await db.select({ date: mealsTable.date })
      .from(mealsTable).where(eq(mealsTable.userId, user.id));
    
    const workoutDates = workouts.map(w => w.date);
    const mealDates = meals.map(m => m.date);
    
    const currentWorkoutStreak = calcStreak(workoutDates);
    const currentMealStreak = calcStreak(mealDates);
    const longestWorkoutStreak = Math.max(calcLongestStreak(workoutDates), currentWorkoutStreak);
    
    res.json({ currentWorkoutStreak, longestWorkoutStreak, currentMealStreak });
  } catch (err) {
    res.status(500).json({ error: "Failed to get streaks" });
  }
});

router.get("/records", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    
    const allWorkouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date));
    
    const records = [];
    
    // Best lifts - find max weight for common exercises
    const exercises = await db.select({ 
      name: workoutExercisesTable.name,
    }).from(workoutExercisesTable)
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(eq(workoutsTable.userId, user.id));
    
    const uniqueExercises = [...new Set(exercises.map(e => e.name))];
    
    for (const exerciseName of uniqueExercises) {
      const exerciseRows = await db.select().from(workoutExercisesTable)
        .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
        .where(and(eq(workoutsTable.userId, user.id), eq(workoutExercisesTable.name, exerciseName)))
        .limit(50);
      
      let maxWeight = 0;
      let maxDate: Date | null = null;
      
      for (const row of exerciseRows) {
        const sets = await db.select().from(workoutSetsTable)
          .where(eq(workoutSetsTable.exerciseId, row.workout_exercises.id));
        for (const set of sets) {
          if (set.weightKg && set.weightKg > maxWeight) {
            maxWeight = set.weightKg;
            maxDate = row.workouts.date;
          }
        }
      }
      
      if (maxWeight > 0) {
        records.push({
          label: `Best ${exerciseName}`,
          value: `${maxWeight} kg`,
          date: maxDate?.toISOString() || null,
          activityType: "gym",
        });
      }
    }
    
    // Longest run
    const runs = allWorkouts.filter(w => w.activityType === "running" && w.distanceKm);
    if (runs.length > 0) {
      const longestRun = runs.reduce((max, w) => (w.distanceKm! > (max.distanceKm || 0) ? w : max), runs[0]);
      records.push({
        label: "Longest Run",
        value: `${longestRun.distanceKm?.toFixed(1)} km`,
        date: longestRun.date.toISOString(),
        activityType: "running",
      });
    }
    
    // Fastest pace
    const runsWithPace = allWorkouts.filter(w => w.activityType === "running" && w.distanceKm && w.durationMinutes);
    if (runsWithPace.length > 0) {
      const fastest = runsWithPace.reduce((min, w) => {
        const pace = w.durationMinutes! / w.distanceKm!;
        const minPace = min.durationMinutes! / min.distanceKm!;
        return pace < minPace ? w : min;
      }, runsWithPace[0]);
      const paceVal = fastest.durationMinutes! / fastest.distanceKm!;
      const paceMin = Math.floor(paceVal);
      const paceSec = Math.round((paceVal - paceMin) * 60);
      records.push({
        label: "Fastest Pace",
        value: `${paceMin}:${paceSec.toString().padStart(2, "0")} /km`,
        date: fastest.date.toISOString(),
        activityType: "running",
      });
    }
    
    // Longest ride
    const rides = allWorkouts.filter(w => w.activityType === "cycling" && w.distanceKm);
    if (rides.length > 0) {
      const longestRide = rides.reduce((max, w) => (w.distanceKm! > (max.distanceKm || 0) ? w : max), rides[0]);
      records.push({
        label: "Longest Ride",
        value: `${longestRide.distanceKm?.toFixed(1)} km`,
        date: longestRide.date.toISOString(),
        activityType: "cycling",
      });
    }
    
    res.json({ records });
  } catch (err) {
    console.error("Records error:", err);
    res.status(500).json({ error: "Failed to get personal records" });
  }
});

router.get("/exercise-history", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const namesParam = (req.query["names"] as string) || "";
    const limit = Math.min(parseInt((req.query["limit"] as string) || "5"), 20);

    if (!namesParam.trim()) {
      res.json({ exercises: [] });
      return;
    }

    const names = namesParam.split(",").map((n) => n.trim()).filter(Boolean);

    const result: any[] = [];

    for (const name of names) {
      const exerciseRows = await db
        .select({
          exercise: workoutExercisesTable,
          workoutDate: workoutsTable.date,
          workoutId: workoutsTable.id,
        })
        .from(workoutExercisesTable)
        .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
        .where(and(eq(workoutsTable.userId, user.id), eq(workoutExercisesTable.name, name)))
        .orderBy(desc(workoutsTable.date))
        .limit(limit);

      const sessions = await Promise.all(
        exerciseRows.map(async (row) => {
          const sets = await db
            .select()
            .from(workoutSetsTable)
            .where(eq(workoutSetsTable.exerciseId, row.exercise.id))
            .orderBy(workoutSetsTable.order);
          return {
            date: row.workoutDate.toISOString(),
            sets: sets.map((s) => ({
              reps: s.reps,
              weightKg: s.weightKg,
              rpe: s.rpe,
              completed: s.completed,
            })),
          };
        })
      );

      result.push({ name, sessions });
    }

    res.json({ exercises: result });
  } catch (err) {
    console.error("exercise-history error:", err);
    res.status(500).json({ error: "Failed to get exercise history" });
  }
});

router.get("/cardio-history", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const type = (req.query["type"] as string) || "";
    const limit = Math.min(parseInt((req.query["limit"] as string) || "10"), 30);

    if (!type.trim()) {
      res.json({ sessions: [] });
      return;
    }

    const workouts = await db
      .select({
        date: workoutsTable.date,
        distanceKm: workoutsTable.distanceKm,
        durationMinutes: workoutsTable.durationMinutes,
        paceMinPerKm: workoutsTable.paceMinPerKm,
      })
      .from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.activityType, type)))
      .orderBy(desc(workoutsTable.date))
      .limit(limit);

    const sessions = workouts.map((w) => {
      let pace = w.paceMinPerKm;
      if (!pace && w.distanceKm && w.durationMinutes && w.distanceKm > 0) {
        pace = w.durationMinutes / w.distanceKm;
      }
      return {
        date: w.date.toISOString(),
        distanceKm: w.distanceKm ?? undefined,
        durationMinutes: w.durationMinutes ?? undefined,
        paceMinPerKm: pace ?? undefined,
      };
    });

    res.json({ sessions });
  } catch (err) {
    console.error("cardio-history error:", err);
    res.status(500).json({ error: "Failed to get cardio history" });
  }
});

router.get("/consistency", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentWorkouts = await db
      .select({ date: workoutsTable.date })
      .from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, twoWeeksAgo)));

    const [profile] = await db
      .select({ weeklyWorkoutDays: profilesTable.weeklyWorkoutDays })
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id))
      .limit(1);

    const weeklyGoal = profile?.weeklyWorkoutDays ?? 3;

    const now = Date.now();
    const weekMs = 7 * 86400000;
    const thisWeek = recentWorkouts.filter((w) => now - new Date(w.date).getTime() < weekMs).length;
    const lastWeek = recentWorkouts.filter((w) => {
      const age = now - new Date(w.date).getTime();
      return age >= weekMs && age < 2 * weekMs;
    }).length;

    const ratio = weeklyGoal > 0 ? thisWeek / weeklyGoal : 0;
    let level: string;
    let recommendation: string;
    let shouldDeload: boolean;

    if (ratio >= 1) {
      level = "high";
      recommendation =
        thisWeek > weeklyGoal
          ? "Outstanding week — you exceeded your goal. Consider adding more challenge or a deload day."
          : "You hit your weekly goal. Keep building this habit — consistency compounds.";
      shouldDeload = thisWeek >= weeklyGoal + 2;
    } else if (ratio >= 0.5) {
      level = "medium";
      recommendation = `You're at ${thisWeek}/${weeklyGoal} sessions this week. ${weeklyGoal - thisWeek} more to hit your goal.`;
      shouldDeload = false;
    } else {
      level = "low";
      recommendation =
        lastWeek >= weeklyGoal
          ? "Great last week, lighter this week. A short session now builds momentum."
          : "Even a 15-minute session counts. Start small, show up consistently.";
      shouldDeload = false;
    }

    res.json({ workoutsThisWeek: thisWeek, workoutsLastWeek: lastWeek, weeklyGoal, level, recommendation, shouldDeload });
  } catch (err) {
    console.error("consistency error:", err);
    res.status(500).json({ error: "Failed to get consistency data" });
  }
});

export default router;
