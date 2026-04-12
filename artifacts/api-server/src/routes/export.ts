import { Router } from "express";
import { db, workoutsTable, workoutExercisesTable, workoutSetsTable, mealsTable, mealFoodItemsTable, waterLogsTable, bodyMeasurementsTable, recoveryLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";
import rateLimit from "express-rate-limit";
import archiver from "archiver";

const router = Router();

// 1 export per hour per user
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  keyGenerator: (req: any) => `export:${req.user?.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Export limit reached. You can export once per hour." },
});

function toCsv(headers: string[], rows: Record<string, any>[]): string {
  const escape = (val: any): string => {
    if (val == null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

// GET /export — generate CSV zip of all user data
router.get("/", requireAuth, exportLimiter, async (req, res) => {
  try {
    const user = getUser(req);

    // Fetch all data in parallel
    const [workouts, meals, water, measurements, recovery] = await Promise.all([
      db.select().from(workoutsTable).where(eq(workoutsTable.userId, user.id)).orderBy(desc(workoutsTable.date)),
      db.select().from(mealsTable).where(eq(mealsTable.userId, user.id)).orderBy(desc(mealsTable.date)),
      db.select().from(waterLogsTable).where(eq(waterLogsTable.userId, user.id)).orderBy(desc(waterLogsTable.loggedAt)),
      db.select().from(bodyMeasurementsTable).where(eq(bodyMeasurementsTable.userId, user.id)).orderBy(desc(bodyMeasurementsTable.date)),
      db.select().from(recoveryLogsTable).where(eq(recoveryLogsTable.userId, user.id)).orderBy(desc(recoveryLogsTable.date)),
    ]);

    // Fetch exercises and sets for workouts
    let exerciseRows: any[] = [];
    let setRows: any[] = [];
    if (workouts.length > 0) {
      exerciseRows = await db.select().from(workoutExercisesTable)
        .where(eq(workoutExercisesTable.workoutId, workouts[0]?.id ?? -1))
        .orderBy(workoutExercisesTable.order);
      // Actually fetch for all workouts
      const allExercises = [];
      const allSets = [];
      for (const w of workouts) {
        const exs = await db.select().from(workoutExercisesTable)
          .where(eq(workoutExercisesTable.workoutId, w.id))
          .orderBy(workoutExercisesTable.order);
        for (const ex of exs) {
          allExercises.push({ ...ex, workoutDate: w.date, workoutName: w.name });
          const sets = await db.select().from(workoutSetsTable)
            .where(eq(workoutSetsTable.exerciseId, ex.id))
            .orderBy(workoutSetsTable.order);
          for (const s of sets) {
            allSets.push({ ...s, exerciseName: ex.name, workoutDate: w.date });
          }
        }
      }
      exerciseRows = allExercises;
      setRows = allSets;
    }

    // Fetch food items for meals
    let foodItemRows: any[] = [];
    if (meals.length > 0) {
      for (const m of meals) {
        const items = await db.select().from(mealFoodItemsTable)
          .where(eq(mealFoodItemsTable.mealId, m.id));
        for (const item of items) {
          foodItemRows.push({ ...item, mealDate: m.date, mealCategory: m.category });
        }
      }
    }

    // Build CSV files
    const workoutsCsv = toCsv(
      ["id", "date", "name", "activityType", "durationMinutes", "mood", "notes"],
      workouts.map((w) => ({ id: w.id, date: w.date, name: w.name, activityType: w.activityType, durationMinutes: w.durationMinutes, mood: w.mood, notes: w.notes }))
    );

    const exercisesCsv = toCsv(
      ["workoutDate", "workoutName", "exerciseName", "order"],
      exerciseRows.map((e: any) => ({ workoutDate: e.workoutDate, workoutName: e.workoutName, exerciseName: e.name, order: e.order }))
    );

    const setsCsv = toCsv(
      ["workoutDate", "exerciseName", "setNumber", "reps", "weightKg", "rpe", "completed"],
      setRows.map((s: any) => ({ workoutDate: s.workoutDate, exerciseName: s.exerciseName, setNumber: s.order, reps: s.reps, weightKg: s.weightKg, rpe: s.rpe, completed: s.completed }))
    );

    const mealsCsv = toCsv(
      ["id", "date", "name", "category"],
      meals.map((m) => ({ id: m.id, date: m.date, name: m.name, category: m.category }))
    );

    const foodItemsCsv = toCsv(
      ["mealDate", "mealCategory", "name", "calories", "proteinG", "carbsG", "fatG", "quantity", "servingSize"],
      foodItemRows.map((f: any) => ({ mealDate: f.mealDate, mealCategory: f.mealCategory, name: f.name, calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, quantity: f.quantity, servingSize: f.servingSize }))
    );

    const waterCsv = toCsv(
      ["loggedAt", "amountMl"],
      water.map((w) => ({ loggedAt: w.loggedAt, amountMl: w.amountMl }))
    );

    const measurementsCsv = toCsv(
      ["date", "weightKg", "bodyFatPct", "waistCm", "chestCm", "armCm", "hipCm", "thighCm"],
      measurements.map((m: any) => ({ date: m.date, weightKg: m.weightKg, bodyFatPct: m.bodyFatPct, waistCm: m.waistCm, chestCm: m.chestCm, armCm: m.armCm, hipCm: m.hipCm, thighCm: m.thighCm }))
    );

    const recoveryCsv = toCsv(
      ["date", "sleepHours", "sleepQuality", "energyLevel", "stressLevel", "overallFeeling"],
      recovery.map((r) => ({ date: r.date, sleepHours: r.sleepHours, sleepQuality: r.sleepQuality, energyLevel: r.energyLevel, stressLevel: r.stressLevel, overallFeeling: r.overallFeeling }))
    );

    // Stream as ZIP
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ordeal-export-${new Date().toISOString().split("T")[0]}.zip"`,
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    archive.append(workoutsCsv, { name: "workouts.csv" });
    archive.append(exercisesCsv, { name: "workout_exercises.csv" });
    archive.append(setsCsv, { name: "workout_sets.csv" });
    archive.append(mealsCsv, { name: "meals.csv" });
    archive.append(foodItemsCsv, { name: "meal_food_items.csv" });
    archive.append(waterCsv, { name: "water.csv" });
    archive.append(measurementsCsv, { name: "measurements.csv" });
    archive.append(recoveryCsv, { name: "recovery.csv" });
    await archive.finalize();
  } catch (err) {
    logError("export error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to export data" });
    }
  }
});

export default router;
