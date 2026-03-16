import { Router } from "express";
import { db, workoutsTable, mealsTable, workoutExercisesTable, workoutSetsTable, profilesTable, waterLogsTable, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, gte, desc, inArray, lte } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function calcStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateDays = [...new Set(dates.map(d => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  }))].sort((a, b) => b - a);
  
  let streak = 0;
  let expectedDay = today.getTime();
  
  for (const dayTime of dateDays) {
    if (dayTime === expectedDay) {
      streak++;
      expectedDay = dayTime - 86400000;
    } else if (streak === 0 && dayTime === expectedDay - 86400000) {
      streak = 1;
      expectedDay = dayTime - 86400000;
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

    const waterLogs = await db.select({ loggedAt: waterLogsTable.loggedAt })
      .from(waterLogsTable).where(eq(waterLogsTable.userId, user.id));
    
    const workoutDates = workouts.map(w => w.date);
    const mealDates = meals.map(m => m.date);
    const hydrationDates = waterLogs.map(w => new Date(w.loggedAt));
    
    const currentWorkoutStreak = calcStreak(workoutDates);
    const currentMealStreak = calcStreak(mealDates);
    const currentHydrationStreak = calcStreak(hydrationDates);
    const longestWorkoutStreak = Math.max(calcLongestStreak(workoutDates), currentWorkoutStreak);
    const longestMealStreak = Math.max(calcLongestStreak(mealDates), currentMealStreak);
    const longestHydrationStreak = Math.max(calcLongestStreak(hydrationDates), currentHydrationStreak);

    function toLocalDateStr(d: Date): string {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    const allDates = new Set<string>();
    for (const d of workoutDates) {
      allDates.add(toLocalDateStr(d));
    }
    for (const d of mealDates) {
      allDates.add(toLocalDateStr(d));
    }
    for (const d of hydrationDates) {
      allDates.add(toLocalDateStr(d));
    }
    
    res.json({
      currentWorkoutStreak, longestWorkoutStreak,
      currentMealStreak, longestMealStreak,
      currentHydrationStreak, longestHydrationStreak,
      activityDates: Array.from(allDates).sort(),
    });
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
          rawKg: maxWeight,
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
        rawKm: longestRun.distanceKm,
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
        rawPaceMinPerKm: paceVal,
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
        rawKm: longestRide.distanceKm,
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

router.get("/weekly-report", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const twoWeeksAgo = new Date(lastMonday);

    const [thisWeekWorkouts, lastWeekWorkouts] = await Promise.all([
      db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, thisMonday)))
        .orderBy(desc(workoutsTable.date)),
      db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, lastMonday), lte(workoutsTable.date, thisMonday)))
        .orderBy(desc(workoutsTable.date)),
    ]);

    const thisWeekMeals = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, thisMonday)));
    const lastWeekMeals = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, lastMonday), lte(mealsTable.date, thisMonday)));

    const measurements = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.userId, user.id), gte(bodyMeasurementsTable.date, twoWeeksAgo)))
      .orderBy(bodyMeasurementsTable.date);

    function avgNutrition(meals: any[]) {
      if (meals.length === 0) return { avgCalories: 0, avgProtein: 0 };
      const dayMap: Record<string, { calories: number; protein: number }> = {};
      for (const m of meals) {
        const d = m.date instanceof Date ? m.date.toISOString().slice(0, 10) : String(m.date).slice(0, 10);
        if (!dayMap[d]) dayMap[d] = { calories: 0, protein: 0 };
        dayMap[d].calories += m.totalCalories ?? 0;
        dayMap[d].protein += m.totalProteinG ?? 0;
      }
      const days = Object.values(dayMap);
      return {
        avgCalories: Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length),
        avgProtein: Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length),
      };
    }

    const thisNutrition = avgNutrition(thisWeekMeals);
    const lastNutrition = avgNutrition(lastWeekMeals);

    const thisWeekWeight = measurements.filter(m => new Date(m.date) >= thisMonday && m.weightKg).map(m => m.weightKg!);
    const lastWeekWeight = measurements.filter(m => new Date(m.date) >= lastMonday && new Date(m.date) < thisMonday && m.weightKg).map(m => m.weightKg!);
    let weightChangKg: number | null = null;
    if (thisWeekWeight.length > 0 && lastWeekWeight.length > 0) {
      weightChangKg = parseFloat((thisWeekWeight[thisWeekWeight.length - 1] - lastWeekWeight[0]).toFixed(1));
    }

    const thisWeekSets = await db.select({
      exerciseName: workoutExercisesTable.name,
      weightKg: workoutSetsTable.weightKg,
    }).from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.exerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, thisMonday), eq(workoutSetsTable.completed, true)));

    const lastWeekSets = await db.select({
      exerciseName: workoutExercisesTable.name,
      weightKg: workoutSetsTable.weightKg,
    }).from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.exerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, lastMonday), lte(workoutsTable.date, thisMonday), eq(workoutSetsTable.completed, true)));

    const thisMaxByExercise: Record<string, number> = {};
    for (const s of thisWeekSets) {
      if (s.weightKg && s.weightKg > (thisMaxByExercise[s.exerciseName] ?? 0)) thisMaxByExercise[s.exerciseName] = s.weightKg;
    }
    const lastMaxByExercise: Record<string, number> = {};
    for (const s of lastWeekSets) {
      if (s.weightKg && s.weightKg > (lastMaxByExercise[s.exerciseName] ?? 0)) lastMaxByExercise[s.exerciseName] = s.weightKg;
    }

    let bestLiftImprovement: { exerciseName: string; prevKg: number; newKg: number; deltaKg: number } | null = null;
    for (const [name, newKg] of Object.entries(thisMaxByExercise)) {
      const prevKg = lastMaxByExercise[name] ?? 0;
      if (prevKg > 0) {
        const delta = newKg - prevKg;
        if (delta > 0 && (!bestLiftImprovement || delta > bestLiftImprovement.deltaKg)) {
          bestLiftImprovement = { exerciseName: name, prevKg, newKg, deltaKg: delta };
        }
      }
    }

    const workoutStreak = calcStreak(thisWeekWorkouts.map(w => w.date));
    const totalStreak = calcStreak([...thisWeekWorkouts, ...lastWeekWorkouts].map(w => w.date));

    const dailyWorkoutMap: Record<string, number> = {};
    for (const w of thisWeekWorkouts) {
      const d = w.date instanceof Date ? w.date.toISOString().slice(0, 10) : String(w.date).slice(0, 10);
      dailyWorkoutMap[d] = (dailyWorkoutMap[d] ?? 0) + (w.durationMinutes ?? 30);
    }

    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const barData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(thisMonday);
      d.setDate(thisMonday.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const isToday = key === now.toISOString().slice(0, 10);
      return { dayLabel: days[i], activeMinutes: dailyWorkoutMap[key] ?? 0, isToday };
    });

    const insights: string[] = [];
    if (thisWeekWorkouts.length >= lastWeekWorkouts.length + 1) {
      insights.push(`You completed ${thisWeekWorkouts.length} workouts this week — ${thisWeekWorkouts.length - lastWeekWorkouts.length} more than last week. Keep the momentum going.`);
    } else if (thisWeekWorkouts.length === 0) {
      insights.push("No workouts logged yet this week. Even a single session resets your momentum.");
    } else {
      insights.push(`${thisWeekWorkouts.length} workout${thisWeekWorkouts.length !== 1 ? "s" : ""} logged this week. Solid consistency builds the foundation.`);
    }
    if (bestLiftImprovement) {
      insights.push(`New PR on ${bestLiftImprovement.exerciseName}: +${bestLiftImprovement.deltaKg.toFixed(1)}kg vs last week (${bestLiftImprovement.newKg}kg). Progressive overload is working.`);
    }
    if (thisNutrition.avgProtein > 0) {
      if (thisNutrition.avgProtein >= lastNutrition.avgProtein && lastNutrition.avgProtein > 0) {
        insights.push(`Avg protein up to ${thisNutrition.avgProtein}g/day vs ${lastNutrition.avgProtein}g last week. Great for recovery and muscle.`);
      } else {
        insights.push(`Avg protein: ${thisNutrition.avgProtein}g/day. Aim for 0.8–1g per lb bodyweight to maximize gains.`);
      }
    }

    res.json({
      thisWeek: {
        workoutsCompleted: thisWeekWorkouts.length,
        avgCalories: thisNutrition.avgCalories,
        avgProtein: thisNutrition.avgProtein,
        streak: totalStreak,
        barData,
      },
      lastWeek: {
        workoutsCompleted: lastWeekWorkouts.length,
        avgCalories: lastNutrition.avgCalories,
        avgProtein: lastNutrition.avgProtein,
      },
      weightChangeKg: weightChangKg,
      bestLiftImprovement,
      insights: insights.slice(0, 3),
    });
  } catch (err) {
    console.error("weekly-report error:", err);
    res.status(500).json({ error: "Failed to get weekly report" });
  }
});

export default router;
