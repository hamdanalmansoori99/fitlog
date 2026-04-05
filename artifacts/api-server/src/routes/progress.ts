import { Router } from "express";
import { db, workoutsTable, mealsTable, workoutExercisesTable, workoutSetsTable, profilesTable, waterLogsTable, bodyMeasurementsTable, progressPhotosTable, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, lt, desc, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";
import { computeCurrentStreak, computeLongestStreak } from "../lib/streaks";

const router = Router();

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
    
    const currentWorkoutStreak = computeCurrentStreak(workoutDates);
    const currentMealStreak = computeCurrentStreak(mealDates);
    const currentHydrationStreak = computeCurrentStreak(hydrationDates);
    const longestWorkoutStreak = Math.max(computeLongestStreak(workoutDates), currentWorkoutStreak);
    const longestMealStreak = Math.max(computeLongestStreak(mealDates), currentMealStreak);
    const longestHydrationStreak = Math.max(computeLongestStreak(hydrationDates), currentHydrationStreak);

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

    // Batch-fetch all exercise rows and sets in 2 queries instead of O(exercises x workouts x sets)
    const allExerciseRows = await db.select().from(workoutExercisesTable)
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(eq(workoutsTable.userId, user.id));

    if (allExerciseRows.length > 0) {
      const exerciseIds = allExerciseRows.map(r => r.workout_exercises.id);
      const allSets = await db.select().from(workoutSetsTable)
        .where(inArray(workoutSetsTable.exerciseId, exerciseIds));

      // Group sets by exerciseId
      const setsByExerciseId = new Map<number, typeof allSets>();
      for (const set of allSets) {
        const arr = setsByExerciseId.get(set.exerciseId) ?? [];
        arr.push(set);
        setsByExerciseId.set(set.exerciseId, arr);
      }

      // Find max weight per exercise name
      const maxByName = new Map<string, { maxWeight: number; maxDate: Date | null }>();
      for (const row of allExerciseRows) {
        const name = row.workout_exercises.name;
        const sets = setsByExerciseId.get(row.workout_exercises.id) ?? [];
        for (const set of sets) {
          if (set.weightKg && set.weightKg > 0) {
            const current = maxByName.get(name);
            if (!current || set.weightKg > current.maxWeight) {
              maxByName.set(name, { maxWeight: set.weightKg, maxDate: row.workouts.date });
            }
          }
        }
      }

      for (const [exerciseName, { maxWeight, maxDate }] of maxByName) {
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
    logError("Records error:", err);
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
    logError("exercise-history error:", err);
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
    logError("cardio-history error:", err);
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
    logError("consistency error:", err);
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
    // Clamp "this week" upper bound to now to exclude future-dated entries
    const nowDate = new Date(now);

    const [thisWeekWorkouts, lastWeekWorkouts, allWorkouts] = await Promise.all([
      db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, thisMonday), lte(workoutsTable.date, nowDate)))
        .orderBy(desc(workoutsTable.date)),
      // Use lt(thisMonday) — strict less-than to avoid boundary overlap at Monday 00:00
      db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, lastMonday), lt(workoutsTable.date, thisMonday)))
        .orderBy(desc(workoutsTable.date)),
      // Full history for accurate streak calculation
      db.select({ date: workoutsTable.date }).from(workoutsTable)
        .where(eq(workoutsTable.userId, user.id)),
    ]);

    const thisWeekMeals = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, thisMonday), lte(mealsTable.date, nowDate)));
    const lastWeekMeals = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, lastMonday), lt(mealsTable.date, thisMonday)));

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

    // Weight-change: compare most-recent measurement this week vs most-recent measurement before this week
    const thisWeekWeightMeas = measurements.filter(m => new Date(m.date) >= thisMonday && m.weightKg);
    const preWeekWeightMeas = measurements.filter(m => new Date(m.date) < thisMonday && m.weightKg);
    let weightChangKg: number | null = null;
    if (thisWeekWeightMeas.length > 0 && preWeekWeightMeas.length > 0) {
      // measurements are ordered by date asc, so last element = most recent
      const latestThis = thisWeekWeightMeas[thisWeekWeightMeas.length - 1].weightKg!;
      const latestPre = preWeekWeightMeas[preWeekWeightMeas.length - 1].weightKg!;
      weightChangKg = parseFloat((latestThis - latestPre).toFixed(1));
    }

    const thisWeekSets = await db.select({
      exerciseName: workoutExercisesTable.name,
      weightKg: workoutSetsTable.weightKg,
    }).from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.exerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, thisMonday), eq(workoutSetsTable.completed, true)));

    // All-time PRs before this week (for bestLiftImprovement comparison)
    const historicalSets = await db.select({
      exerciseName: workoutExercisesTable.name,
      weightKg: workoutSetsTable.weightKg,
    }).from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.exerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutsTable.userId, user.id), lt(workoutsTable.date, thisMonday), eq(workoutSetsTable.completed, true)));

    const thisMaxByExercise: Record<string, number> = {};
    for (const s of thisWeekSets) {
      if (s.weightKg && s.weightKg > (thisMaxByExercise[s.exerciseName] ?? 0)) thisMaxByExercise[s.exerciseName] = s.weightKg;
    }
    // All-time historical PRs (pre this week)
    const historicalMaxByExercise: Record<string, number> = {};
    for (const s of historicalSets) {
      if (s.weightKg && s.weightKg > (historicalMaxByExercise[s.exerciseName] ?? 0)) historicalMaxByExercise[s.exerciseName] = s.weightKg;
    }

    let bestLiftImprovement: { exerciseName: string; prevKg: number; newKg: number; deltaKg: number } | null = null;
    for (const [name, newKg] of Object.entries(thisMaxByExercise)) {
      const prevKg = historicalMaxByExercise[name] ?? 0;
      if (prevKg > 0) {
        const delta = newKg - prevKg;
        if (delta > 0 && (!bestLiftImprovement || delta > bestLiftImprovement.deltaKg)) {
          bestLiftImprovement = { exerciseName: name, prevKg, newKg, deltaKg: delta };
        }
      }
    }

    // Use full history for accurate streak (not just 2-week window)
    const totalStreak = calcStreak(allWorkouts.map(w => w.date));

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
    logError("weekly-report error:", err);
    res.status(500).json({ error: "Failed to get weekly report" });
  }
});

// ── Progress Photos ──────────────────────────────────────────────────────────

router.get("/photos", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const photos = await db
      .select({
        id: progressPhotosTable.id,
        date: progressPhotosTable.date,
        note: progressPhotosTable.note,
        mimeType: progressPhotosTable.mimeType,
        createdAt: progressPhotosTable.createdAt,
      })
      .from(progressPhotosTable)
      .where(eq(progressPhotosTable.userId, user.id))
      .orderBy(desc(progressPhotosTable.createdAt));
    res.json({ photos });
  } catch (err) {
    logError("photos list error:", err);
    res.status(500).json({ error: "Failed to get photos" });
  }
});

// Serves the raw image bytes. Accepts token from Authorization header OR query param
// so React Native <Image> can load it as a plain URL.
router.get("/photos/:id/image", async (req, res) => {
  try {
    const queryToken = Array.isArray(req.query.token) ? req.query.token[0] : (req.query.token as string | undefined);
    const rawToken =
      (req.headers.authorization?.replace("Bearer ", "") ||
        queryToken ||
        req.cookies?.session || "").trim();
    if (!rawToken) { res.status(401).json({ error: "Not authenticated" }); return; }

    const sessions = await db
      .select({ session: sessionsTable, user: usersTable })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(eq(sessionsTable.id, rawToken))
      .limit(1);
    if (sessions.length === 0 || new Date() > sessions[0].session.expiresAt) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    const userId = sessions[0].user.id;

    const photoId = parseInt(req.params.id as string, 10);
    if (isNaN(photoId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [photo] = await db
      .select()
      .from(progressPhotosTable)
      .where(and(eq(progressPhotosTable.id, photoId), eq(progressPhotosTable.userId, userId)))
      .limit(1);

    if (!photo) { res.status(404).json({ error: "Not found" }); return; }

    const buffer = Buffer.from(photo.imageData, "base64");
    res.setHeader("Content-Type", photo.mimeType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(buffer);
  } catch (err) {
    logError("photos image error:", err);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

router.post("/photos", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { imageBase64, mimeType, date, note } = req.body;
    if (!imageBase64 || !date) {
      res.status(400).json({ error: "imageBase64 and date are required" });
      return;
    }
    const [photo] = await db
      .insert(progressPhotosTable)
      .values({
        userId: user.id,
        date,
        note: note || "",
        imageData: imageBase64,
        mimeType: mimeType || "image/jpeg",
      })
      .returning({
        id: progressPhotosTable.id,
        date: progressPhotosTable.date,
        note: progressPhotosTable.note,
        mimeType: progressPhotosTable.mimeType,
        createdAt: progressPhotosTable.createdAt,
      });
    res.json({ photo });
  } catch (err) {
    logError("photos create error:", err);
    res.status(500).json({ error: "Failed to save photo" });
  }
});

router.delete("/photos/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const photoId = parseInt(req.params.id as string, 10);
    if (isNaN(photoId)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(progressPhotosTable)
      .where(and(eq(progressPhotosTable.id, photoId), eq(progressPhotosTable.userId, user.id)));
    res.status(204).send();
  } catch (err) {
    logError("photos delete error:", err);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

export default router;
