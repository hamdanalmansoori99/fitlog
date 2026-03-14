import { Router } from "express";
import { db, workoutsTable, workoutExercisesTable, workoutSetsTable, mealsTable, mealFoodItemsTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { trackEvent } from "../services/analyticsService";

const router = Router();

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
        lte(workoutsTable.date, tomorrow)
      ));

    const todayMeals = await db.select().from(mealsTable)
      .where(and(
        eq(mealsTable.userId, user.id),
        gte(mealsTable.date, today),
        lte(mealsTable.date, tomorrow)
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
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const workouts = await db.select().from(workoutsTable)
        .where(and(
          eq(workoutsTable.userId, user.id),
          gte(workoutsTable.date, date),
          lte(workoutsTable.date, nextDay)
        ));

      const activeMinutes = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const isToday = i === 0;

      days.push({
        date: date.toISOString().split("T")[0],
        dayLabel: dayLabels[date.getDay()],
        activeMinutes,
        isToday,
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

    // Weekly frequency over last 8 weeks
    const weeklyFrequency = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekWorkouts = await db.select().from(workoutsTable)
        .where(and(
          eq(workoutsTable.userId, user.id),
          gte(workoutsTable.date, weekStart),
          lte(workoutsTable.date, weekEnd)
        ));
      
      const weekLabel = `W${8 - i}`;
      weeklyFrequency.push({ weekLabel, count: weekWorkouts.length });
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
    
    const activities = [
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
      ...recentMeals.map(async m => {
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
      })
    ];
    
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

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const allWorkouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(limit)
      .offset(offset);
    
    const workoutsWithExercises = await Promise.all(
      allWorkouts.map(async (w) => {
        const exercises = await db.select().from(workoutExercisesTable)
          .where(eq(workoutExercisesTable.workoutId, w.id))
          .orderBy(workoutExercisesTable.order);
        
        const exercisesWithSets = await Promise.all(
          exercises.map(async (ex) => {
            const sets = await db.select().from(workoutSetsTable)
              .where(eq(workoutSetsTable.exerciseId, ex.id))
              .orderBy(workoutSetsTable.order);
            return { ...ex, sets };
          })
        );
        
        return { ...w, exercises: exercisesWithSets };
      })
    );
    
    res.json({ workouts: workoutsWithExercises, total: workoutsWithExercises.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to get workouts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workout = await getWorkoutWithExercises(parseInt(req.params.id), user.id);
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

    const [workout] = await db.insert(workoutsTable).values({
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

    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const [exercise] = await db.insert(workoutExercisesTable).values({
          workoutId: workout.id,
          name: ex.name,
          order: ex.order,
        }).returning();
        
        if (ex.sets && ex.sets.length > 0) {
          for (const set of ex.sets) {
            await db.insert(workoutSetsTable).values({
              exerciseId: exercise.id,
              reps: set.reps,
              weightKg: set.weightKg,
              order: set.order,
            });
          }
        }
      }
    }

    const fullWorkout = await getWorkoutWithExercises(workout.id, user.id);

    void trackEvent(user.id, "workout.logged", {
      activityType: workout.activityType,
      durationMinutes: workout.durationMinutes,
      caloriesBurned: workout.caloriesBurned,
      exerciseCount: exercises?.length ?? 0,
    });

    res.status(201).json(fullWorkout);
  } catch (err) {
    console.error("Create workout error:", err);
    res.status(500).json({ error: "Failed to create workout" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workoutId = parseInt(req.params.id);
    
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
    const workoutId = parseInt(req.params.id);
    
    const existing = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)))
      .limit(1);
    
    if (existing.length === 0) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    
    await db.delete(workoutsTable).where(eq(workoutsTable.id, workoutId));
    res.json({ message: "Workout deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete workout" });
  }
});

export default router;
