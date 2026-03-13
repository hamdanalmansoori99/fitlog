import { Router } from "express";
import { db, workoutsTable, mealsTable, workoutExercisesTable, workoutSetsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
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
    
    // Longest workout streak (simplified)
    let longestWorkoutStreak = currentWorkoutStreak;
    
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
    
    for (const exerciseName of uniqueExercises.slice(0, 3)) {
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

export default router;
