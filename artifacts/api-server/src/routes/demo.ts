/**
 * POST /auth/demo
 * One-tap demo login. Creates the demo account + seeds 60 days of rich data
 * the first time it's called, then just returns a fresh session token.
 * Safe to call repeatedly — idempotent.
 */
import { Router } from "express";
import {
  db, usersTable, sessionsTable, profilesTable, settingsTable,
  workoutsTable, workoutExercisesTable, workoutSetsTable,
  mealsTable, mealFoodItemsTable, bodyMeasurementsTable, waterLogsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateSessionId } from "../lib/auth";
import { ensureFreeSubscription } from "../services/subscriptionService";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const DEMO_EMAIL = "demo@fitlog.app";
const DEMO_PASSWORD = "Demo1234!";

const router = Router();

router.post("/", async (_req, res) => {
  try {
    // ── 1. User ───────────────────────────────────────────────────────────
    const existing = await db.select().from(usersTable)
      .where(eq(usersTable.email, DEMO_EMAIL)).limit(1);
    let userId: number;

    if (existing.length === 0) {
      const hashed = await hashPassword(DEMO_PASSWORD);
      const [u] = await db.insert(usersTable).values({
        email: DEMO_EMAIL, passwordHash: hashed,
        firstName: "Demo", lastName: "Champion",
      }).returning({ id: usersTable.id });
      userId = u.id;
    } else {
      userId = existing[0].id;
    }

    // ── 2. Profile ────────────────────────────────────────────────────────
    const profiles = await db.select().from(profilesTable)
      .where(eq(profilesTable.userId, userId)).limit(1);
    if (profiles.length === 0) {
      await db.insert(profilesTable).values({
        userId, xp: 99999,
        fitnessGoals: ["Build Muscle", "Get Stronger"],
        experienceLevel: "Advanced",
        onboardingComplete: true, coachOnboardingComplete: true,
        weeklyWorkoutDays: 5, age: 26, gender: "male",
        heightCm: 181, weightKg: 80, activityLevel: "very_active",
        dailyCalorieGoal: 2800, dailyProteinGoal: 176,
        dailyCarbsGoal: 280, dailyFatGoal: 78, dailyWaterGoalMl: 3000,
      });
    } else {
      await db.update(profilesTable)
        .set({ xp: 99999, onboardingComplete: true, coachOnboardingComplete: true })
        .where(eq(profilesTable.userId, userId));
    }

    // ── 3. Settings ───────────────────────────────────────────────────────
    const settings = await db.select().from(settingsTable)
      .where(eq(settingsTable.userId, userId)).limit(1);
    if (settings.length === 0) {
      await db.insert(settingsTable).values({ userId });
    }

    // ── 4. Subscription ───────────────────────────────────────────────────
    await ensureFreeSubscription(userId);

    // ── 5. Seed data (skip if workouts already exist) ─────────────────────
    const hasWorkouts = await db.select({ id: workoutsTable.id })
      .from(workoutsTable).where(eq(workoutsTable.userId, userId)).limit(1);

    if (hasWorkouts.length === 0) {
      const now = new Date();
      const daysAgo = (d: number) => {
        const t = new Date(now);
        t.setDate(t.getDate() - d);
        t.setHours(8, 0, 0, 0);
        return t;
      };

      // Gym workout plans: [name, [[exercise, sets, reps, weightKg], ...]]
      const plans: [string, [string, number, number, number][]][] = [
        ["Push Day A", [["Bench Press", 4, 10, 80], ["Incline Press", 3, 12, 28], ["Overhead Press", 3, 10, 52], ["Tricep Pushdown", 3, 15, 30]]],
        ["Pull Day A", [["Deadlift", 4, 6, 140], ["Barbell Row", 4, 8, 80], ["Pull-ups", 4, 8, 0], ["Bicep Curl", 3, 12, 16]]],
        ["Leg Day A", [["Squat", 5, 8, 110], ["Romanian Deadlift", 3, 10, 90], ["Leg Press", 3, 12, 160], ["Calf Raises", 4, 15, 60]]],
        ["Push Day B", [["Bench Press", 4, 8, 85], ["Dumbbell Flye", 3, 12, 20], ["Overhead Press", 4, 8, 55], ["Lateral Raise", 3, 15, 12]]],
        ["Pull Day B", [["Deadlift", 3, 5, 145], ["Weighted Pull-ups", 4, 6, 10], ["Cable Row", 3, 12, 70], ["Hammer Curl", 3, 12, 18]]],
      ];

      // 8 weeks of workouts: 4 gym + 1 run per week
      const runKms = [5, 8, 5, 10, 6, 8, 5, 10];
      let gymPlanIdx = 0;
      for (let week = 0; week < 8; week++) {
        const base = week * 7;
        // Mon/Tue/Thu/Fri = gym, Wed = run
        for (const [dayOff, isRun] of [[base + 1, false], [base + 2, false], [base + 3, true], [base + 5, false], [base + 6, false]] as [number, boolean][]) {
          if (isRun) {
            const km = runKms[week % runKms.length];
            await db.insert(workoutsTable).values({
              userId, activityType: "running", name: `${km}km Run`,
              date: daysAgo(dayOff),
              durationMinutes: Math.round(km * 5.5),
              distanceKm: km, caloriesBurned: Math.round(km * 65), mood: "good",
            });
          } else {
            const [planName, exercises] = plans[gymPlanIdx % plans.length];
            gymPlanIdx++;
            const [w] = await db.insert(workoutsTable).values({
              userId, activityType: "gym", name: planName,
              date: daysAgo(dayOff), durationMinutes: 65, caloriesBurned: 420, mood: "great",
            }).returning({ id: workoutsTable.id });

            for (let ei = 0; ei < exercises.length; ei++) {
              const [exName, sets, reps, baseWeight] = exercises[ei];
              const [ex] = await db.insert(workoutExercisesTable)
                .values({ workoutId: w.id, name: exName, order: ei })
                .returning({ id: workoutExercisesTable.id });
              const progression = week * 2.5; // ~2.5kg increase per week
              for (let si = 0; si < sets; si++) {
                await db.insert(workoutSetsTable).values({
                  exerciseId: ex.id, reps,
                  weightKg: baseWeight > 0 ? baseWeight + progression : null,
                  rpe: si === sets - 1 ? 8 : 7, completed: true, order: si,
                });
              }
            }
          }
        }
      }

      // 30 days of meals (breakfast + lunch + dinner)
      const breakfasts = [
        { name: "Oatmeal & Banana", items: [["Rolled Oats", 80, "g", 302, 10, 54, 6], ["Banana", 120, "g", 107, 1.3, 27, 0.4], ["Whey Protein", 30, "g", 120, 24, 3, 2]] as any[] },
        { name: "Eggs & Toast", items: [["Whole Eggs", 150, "g", 215, 18, 1, 15], ["Whole Grain Toast", 60, "g", 152, 6, 28, 2], ["Avocado", 50, "g", 80, 1, 4, 7]] as any[] },
        { name: "Greek Yogurt Bowl", items: [["Greek Yogurt", 200, "g", 130, 22, 9, 0], ["Mixed Berries", 100, "g", 57, 0.7, 13, 0.3], ["Granola", 30, "g", 134, 3, 22, 4]] as any[] },
      ];
      const lunches = [
        { name: "Chicken & Rice", items: [["Chicken Breast", 200, "g", 330, 62, 0, 7], ["White Rice", 200, "g", 260, 5, 57, 0.5], ["Broccoli", 100, "g", 34, 2.8, 7, 0.4]] as any[] },
        { name: "Salmon Bowl", items: [["Salmon Fillet", 180, "g", 374, 40, 0, 23], ["Brown Rice", 180, "g", 234, 5, 49, 2], ["Spinach", 60, "g", 14, 1.7, 2, 0.2]] as any[] },
        { name: "Turkey Wrap", items: [["Turkey Breast", 150, "g", 165, 35, 0, 2], ["Whole Wheat Wrap", 60, "g", 180, 6, 35, 3], ["Hummus", 40, "g", 98, 4, 9, 5]] as any[] },
      ];
      const dinners = [
        { name: "Steak & Sweet Potato", items: [["Sirloin Steak", 220, "g", 376, 50, 0, 19], ["Sweet Potato", 200, "g", 172, 3.2, 40, 0.2], ["Vegetables", 150, "g", 78, 4, 14, 1]] as any[] },
        { name: "Pasta Bolognese", items: [["Whole Wheat Pasta", 120, "g", 430, 18, 82, 3], ["Beef Mince", 150, "g", 298, 38, 0, 16], ["Tomato Sauce", 100, "g", 50, 2, 10, 0.5]] as any[] },
        { name: "Chicken Stir-Fry", items: [["Chicken Thigh", 200, "g", 294, 38, 0, 16], ["Jasmine Rice", 180, "g", 234, 5, 52, 0.4], ["Mixed Veg", 200, "g", 80, 4, 14, 0.8]] as any[] },
      ];

      for (let d = 0; d < 30; d++) {
        for (const [cat, opts, hour] of [["breakfast", breakfasts, 8], ["lunch", lunches, 13], ["dinner", dinners, 19]] as [string, typeof breakfasts, number][]) {
          const meal = opts[d % opts.length];
          const mealDate = daysAgo(d);
          mealDate.setHours(hour, 0, 0, 0);
          const [m] = await db.insert(mealsTable)
            .values({ userId, name: meal.name, category: cat, date: mealDate })
            .returning({ id: mealsTable.id });
          for (const [name, portion, unit, cal, prot, carbs, fat] of meal.items) {
            await db.insert(mealFoodItemsTable).values({
              mealId: m.id, name, portionSize: portion, unit,
              calories: cal, proteinG: prot, carbsG: carbs, fatG: fat,
            });
          }
        }
      }

      // Weekly body measurements (gaining ~2kg over 8 weeks)
      for (let d = 0; d <= 56; d += 7) {
        await db.insert(bodyMeasurementsTable).values({
          userId, date: daysAgo(d),
          weightKg: parseFloat((78 + (56 - d) * 0.036).toFixed(1)),
        });
      }

      // Daily water logs (3L/day for 60 days)
      for (let d = 0; d < 60; d++) {
        for (const [hour, ml] of [[8, 500], [10, 500], [13, 750], [16, 500], [19, 750]] as [number, number][]) {
          const t = daysAgo(d);
          t.setHours(hour, 0, 0, 0);
          await db.insert(waterLogsTable).values({ userId, amountMl: ml, loggedAt: t });
        }
      }
    }

    // ── 6. Session ────────────────────────────────────────────────────────
    const sessionId = generateSessionId();
    await db.insert(sessionsTable).values({
      id: sessionId, userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, createdAt: user.createdAt },
      token: sessionId,
    });
  } catch (err: any) {
    console.error("[demo] failed:", err?.message ?? err);
    res.status(500).json({ error: "Demo login failed: " + (err?.message ?? "unknown error") });
  }
});

export default router;
