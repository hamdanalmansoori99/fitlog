import { Router } from "express";
import {
  db,
  usersTable,
  sessionsTable,
  profilesTable,
  settingsTable,
  workoutsTable,
  workoutExercisesTable,
  workoutSetsTable,
  mealsTable,
  mealFoodItemsTable,
  bodyMeasurementsTable,
  userWorkoutTemplatesTable,
  achievementsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateSessionId } from "../lib/auth";
import { ensureFreeSubscription } from "../services/subscriptionService";

const router = Router();

const DEMO_EMAIL = "demo@fitlog.app";
const DEMO_PASSWORD = "demo123";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7 + Math.floor(Math.random() * 10), 0, 0, 0);
  return d;
}

async function seedDemoData(userId: number) {
  // Clear all existing demo data
  await db.delete(workoutsTable).where(eq(workoutsTable.userId, userId));
  await db.delete(mealsTable).where(eq(mealsTable.userId, userId));
  await db.delete(bodyMeasurementsTable).where(eq(bodyMeasurementsTable.userId, userId));
  await db.delete(userWorkoutTemplatesTable).where(eq(userWorkoutTemplatesTable.userId, userId));
  await db.delete(achievementsTable).where(eq(achievementsTable.userId, userId));

  // ── 7 past workouts ──────────────────────────────────────────────────────────
  const workoutSeeds = [
    {
      name: "Upper Body Power",
      activityType: "gym",
      daysAgo: 0,
      duration: 52,
      calories: 380,
      mood: "great",
      exercises: [
        { name: "Bench Press", sets: [{ reps: 8, weightKg: 80 }, { reps: 8, weightKg: 82.5 }, { reps: 7, weightKg: 85 }, { reps: 6, weightKg: 87.5 }] },
        { name: "Incline Dumbbell Press", sets: [{ reps: 10, weightKg: 32 }, { reps: 10, weightKg: 32 }, { reps: 9, weightKg: 32 }] },
        { name: "Cable Fly", sets: [{ reps: 12, weightKg: 15 }, { reps: 12, weightKg: 15 }, { reps: 10, weightKg: 17.5 }] },
        { name: "Tricep Dip", sets: [{ reps: 15 }, { reps: 14 }, { reps: 12 }] },
      ],
    },
    {
      name: "Leg Day",
      activityType: "gym",
      daysAgo: 1,
      duration: 65,
      calories: 510,
      mood: "good",
      exercises: [
        { name: "Squat", sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 105 }, { reps: 5, weightKg: 110 }, { reps: 4, weightKg: 112.5 }] },
        { name: "Romanian Deadlift", sets: [{ reps: 10, weightKg: 80 }, { reps: 10, weightKg: 80 }, { reps: 10, weightKg: 82.5 }] },
        { name: "Leg Press", sets: [{ reps: 12, weightKg: 160 }, { reps: 12, weightKg: 180 }, { reps: 10, weightKg: 200 }] },
        { name: "Calf Raise", sets: [{ reps: 20, weightKg: 50 }, { reps: 20, weightKg: 50 }, { reps: 18, weightKg: 55 }] },
      ],
    },
    {
      name: "Morning Run",
      activityType: "run",
      daysAgo: 2,
      duration: 38,
      calories: 420,
      mood: "great",
      distanceKm: 6.2,
      exercises: [],
    },
    {
      name: "Pull Day",
      activityType: "gym",
      daysAgo: 3,
      duration: 58,
      calories: 440,
      mood: "good",
      exercises: [
        { name: "Deadlift", sets: [{ reps: 5, weightKg: 120 }, { reps: 5, weightKg: 125 }, { reps: 3, weightKg: 130 }] },
        { name: "Pull Up", sets: [{ reps: 10 }, { reps: 9 }, { reps: 8 }] },
        { name: "Barbell Row", sets: [{ reps: 8, weightKg: 70 }, { reps: 8, weightKg: 72.5 }, { reps: 8, weightKg: 75 }] },
        { name: "Bicep Curl", sets: [{ reps: 12, weightKg: 16 }, { reps: 12, weightKg: 16 }, { reps: 10, weightKg: 18 }] },
        { name: "Face Pull", sets: [{ reps: 15, weightKg: 12 }, { reps: 15, weightKg: 12 }, { reps: 15, weightKg: 12 }] },
      ],
    },
    {
      name: "Push Day",
      activityType: "gym",
      daysAgo: 4,
      duration: 55,
      calories: 400,
      mood: "okay",
      exercises: [
        { name: "Overhead Press", sets: [{ reps: 6, weightKg: 60 }, { reps: 6, weightKg: 62.5 }, { reps: 6, weightKg: 65 }, { reps: 5, weightKg: 65 }] },
        { name: "Lateral Raise", sets: [{ reps: 15, weightKg: 10 }, { reps: 15, weightKg: 10 }, { reps: 12, weightKg: 12 }] },
        { name: "Chest Dip", sets: [{ reps: 12 }, { reps: 11 }, { reps: 10 }] },
        { name: "Skull Crusher", sets: [{ reps: 12, weightKg: 24 }, { reps: 12, weightKg: 24 }, { reps: 10, weightKg: 26 }] },
      ],
    },
    {
      name: "Yoga & Mobility",
      activityType: "yoga",
      daysAgo: 5,
      duration: 45,
      calories: 180,
      mood: "great",
      exercises: [],
    },
    {
      name: "Full Body Strength",
      activityType: "gym",
      daysAgo: 6,
      duration: 70,
      calories: 560,
      mood: "great",
      exercises: [
        { name: "Squat", sets: [{ reps: 5, weightKg: 105 }, { reps: 5, weightKg: 105 }, { reps: 5, weightKg: 107.5 }] },
        { name: "Bench Press", sets: [{ reps: 5, weightKg: 82.5 }, { reps: 5, weightKg: 82.5 }, { reps: 5, weightKg: 85 }] },
        { name: "Barbell Row", sets: [{ reps: 5, weightKg: 72.5 }, { reps: 5, weightKg: 72.5 }, { reps: 5, weightKg: 75 }] },
        { name: "Overhead Press", sets: [{ reps: 8, weightKg: 55 }, { reps: 8, weightKg: 57.5 }, { reps: 6, weightKg: 60 }] },
      ],
    },
  ];

  for (const w of workoutSeeds) {
    const [workout] = await db.insert(workoutsTable).values({
      userId,
      activityType: w.activityType,
      name: w.name,
      date: daysAgo(w.daysAgo),
      durationMinutes: w.duration,
      caloriesBurned: w.calories,
      mood: w.mood,
      distanceKm: (w as any).distanceKm ?? null,
    }).returning();

    for (let i = 0; i < (w.exercises || []).length; i++) {
      const ex = w.exercises[i];
      const [exercise] = await db.insert(workoutExercisesTable).values({
        workoutId: workout.id,
        name: ex.name,
        order: i,
      }).returning();

      for (let j = 0; j < ex.sets.length; j++) {
        await db.insert(workoutSetsTable).values({
          exerciseId: exercise.id,
          reps: (ex.sets[j] as any).reps,
          weightKg: (ex.sets[j] as any).weightKg ?? null,
          rpe: (ex.sets[j] as any).rpe ?? null,
          completed: true,
          order: j,
        });
      }
    }
  }

  // ── 3 workout templates ──────────────────────────────────────────────────────
  await db.insert(userWorkoutTemplatesTable).values([
    {
      userId,
      name: "Push Day A",
      activityType: "gym",
      description: "Chest, shoulders and triceps hypertrophy block",
      estimatedMinutes: 55,
      isFavorite: true,
      usageCount: 12,
      exercises: [
        { name: "Bench Press", order: 0, sets: [{ reps: 8, weightKg: 80 }, { reps: 8, weightKg: 82.5 }, { reps: 8, weightKg: 85 }, { reps: 6, weightKg: 87.5 }] },
        { name: "Incline Dumbbell Press", order: 1, sets: [{ reps: 10, weightKg: 32 }, { reps: 10, weightKg: 32 }, { reps: 9, weightKg: 34 }] },
        { name: "Cable Fly", order: 2, sets: [{ reps: 12, weightKg: 15 }, { reps: 12, weightKg: 15 }, { reps: 10, weightKg: 17.5 }] },
        { name: "Lateral Raise", order: 3, sets: [{ reps: 15, weightKg: 10 }, { reps: 15, weightKg: 10 }, { reps: 12, weightKg: 12 }] },
        { name: "Tricep Pushdown", order: 4, sets: [{ reps: 12, weightKg: 20 }, { reps: 12, weightKg: 22 }, { reps: 10, weightKg: 24 }] },
      ],
    },
    {
      userId,
      name: "Pull Day A",
      activityType: "gym",
      description: "Back, rear delts and biceps — vertical + horizontal pull",
      estimatedMinutes: 60,
      isFavorite: false,
      usageCount: 10,
      exercises: [
        { name: "Deadlift", order: 0, sets: [{ reps: 5, weightKg: 120 }, { reps: 5, weightKg: 125 }, { reps: 3, weightKg: 130 }] },
        { name: "Pull Up", order: 1, sets: [{ reps: 10 }, { reps: 9 }, { reps: 8 }] },
        { name: "Barbell Row", order: 2, sets: [{ reps: 8, weightKg: 70 }, { reps: 8, weightKg: 72.5 }, { reps: 8, weightKg: 75 }] },
        { name: "Face Pull", order: 3, sets: [{ reps: 15, weightKg: 12 }, { reps: 15, weightKg: 12 }, { reps: 15, weightKg: 12 }] },
        { name: "Bicep Curl", order: 4, sets: [{ reps: 12, weightKg: 16 }, { reps: 12, weightKg: 16 }, { reps: 10, weightKg: 18 }] },
      ],
    },
    {
      userId,
      name: "Leg Day Power",
      activityType: "gym",
      description: "Quad-focused lower body with Romanian deadlift accessory",
      estimatedMinutes: 65,
      isFavorite: true,
      usageCount: 9,
      exercises: [
        { name: "Squat", order: 0, sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 105 }, { reps: 5, weightKg: 110 }, { reps: 4, weightKg: 112.5 }] },
        { name: "Romanian Deadlift", order: 1, sets: [{ reps: 10, weightKg: 80 }, { reps: 10, weightKg: 80 }, { reps: 10, weightKg: 82.5 }] },
        { name: "Leg Press", order: 2, sets: [{ reps: 12, weightKg: 160 }, { reps: 12, weightKg: 180 }, { reps: 10, weightKg: 200 }] },
        { name: "Leg Curl", order: 3, sets: [{ reps: 12, weightKg: 45 }, { reps: 12, weightKg: 45 }, { reps: 10, weightKg: 50 }] },
        { name: "Calf Raise", order: 4, sets: [{ reps: 20, weightKg: 50 }, { reps: 20, weightKg: 50 }, { reps: 18, weightKg: 55 }] },
      ],
    },
  ]);

  // ── 4 meals (today) ──────────────────────────────────────────────────────────
  const today = new Date();
  const mealSeeds = [
    {
      name: "Breakfast",
      category: "Breakfast",
      hour: 7,
      items: [
        { name: "Oats (cooked)", portionSize: 200, unit: "g", calories: 140, proteinG: 5, carbsG: 24, fatG: 3 },
        { name: "Whey Protein", portionSize: 1, unit: "scoop", calories: 120, proteinG: 25, carbsG: 3, fatG: 1 },
        { name: "Banana", portionSize: 1, unit: "medium", calories: 89, proteinG: 1, carbsG: 23, fatG: 0 },
        { name: "Blueberries", portionSize: 80, unit: "g", calories: 46, proteinG: 1, carbsG: 11, fatG: 0 },
      ],
    },
    {
      name: "Lunch",
      category: "Lunch",
      hour: 13,
      items: [
        { name: "Chicken Breast (grilled)", portionSize: 180, unit: "g", calories: 297, proteinG: 56, carbsG: 0, fatG: 6 },
        { name: "Brown Rice (cooked)", portionSize: 150, unit: "g", calories: 165, proteinG: 4, carbsG: 35, fatG: 1 },
        { name: "Broccoli (steamed)", portionSize: 100, unit: "g", calories: 34, proteinG: 3, carbsG: 7, fatG: 0 },
        { name: "Olive Oil", portionSize: 10, unit: "ml", calories: 88, proteinG: 0, carbsG: 0, fatG: 10 },
      ],
    },
    {
      name: "Post-Workout Snack",
      category: "Snacks",
      hour: 17,
      items: [
        { name: "Greek Yogurt (0% fat)", portionSize: 200, unit: "g", calories: 118, proteinG: 20, carbsG: 9, fatG: 0 },
        { name: "Mixed Nuts", portionSize: 30, unit: "g", calories: 185, proteinG: 5, carbsG: 6, fatG: 16 },
        { name: "Apple", portionSize: 1, unit: "medium", calories: 81, proteinG: 0, carbsG: 21, fatG: 0 },
      ],
    },
    {
      name: "Dinner",
      category: "Dinner",
      hour: 20,
      items: [
        { name: "Salmon (baked)", portionSize: 200, unit: "g", calories: 412, proteinG: 40, carbsG: 0, fatG: 26 },
        { name: "Sweet Potato (baked)", portionSize: 200, unit: "g", calories: 172, proteinG: 4, carbsG: 40, fatG: 0 },
        { name: "Asparagus", portionSize: 120, unit: "g", calories: 26, proteinG: 3, carbsG: 4, fatG: 0 },
        { name: "Avocado", portionSize: 80, unit: "g", calories: 128, proteinG: 2, carbsG: 7, fatG: 12 },
      ],
    },
  ];

  for (const m of mealSeeds) {
    const mealDate = new Date(today);
    mealDate.setHours(m.hour, 0, 0, 0);
    const [meal] = await db.insert(mealsTable).values({
      userId,
      name: m.name,
      category: m.category,
      date: mealDate,
    }).returning();

    for (const item of m.items) {
      await db.insert(mealFoodItemsTable).values({
        mealId: meal.id,
        name: item.name,
        portionSize: item.portionSize,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
      });
    }
  }

  // ── Body weight entries (14 days) ────────────────────────────────────────────
  const weights = [83.8, 83.5, 83.6, 83.4, 83.3, 83.1, 83.2, 83.0, 82.9, 82.7, 82.6, 82.8, 82.5, 82.4];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(8, 0, 0, 0);
    await db.insert(bodyMeasurementsTable).values({
      userId,
      date: d,
      weightKg: weights[13 - i],
      bodyFatPercent: 14.5 - (13 - i) * 0.05,
    });
  }

  // ── 1 personal record achievement ────────────────────────────────────────────
  await db.insert(achievementsTable).values({
    userId,
    key: "pr_squat_130kg",
    title: "New PR: Squat — 130 kg",
    metadata: { exercise: "Squat", weightKg: 130, reps: 1, type: "personal_record" },
  });

  // ── Streak achievement ────────────────────────────────────────────────────────
  await db.insert(achievementsTable).values({
    userId,
    key: "streak_7_days",
    title: "7-Day Streak!",
    metadata: { streakDays: 7, type: "streak" },
  });
}

router.post("/demo-login", async (req, res) => {
  try {
    const passwordHash = hashPassword(DEMO_PASSWORD);

    // Find or create the demo user
    let demoUser = (await db.select().from(usersTable).where(eq(usersTable.email, DEMO_EMAIL)).limit(1))[0];

    if (!demoUser) {
      [demoUser] = await db.insert(usersTable).values({
        email: DEMO_EMAIL,
        passwordHash,
        firstName: "Alex",
        lastName: "Demo",
      }).returning();

      await db.insert(profilesTable).values({
        userId: demoUser.id,
        fitnessGoals: ["Build Muscle", "Improve Strength"],
        activityLevel: "moderately_active",
        experienceLevel: "intermediate",
        availableEquipment: ["barbell", "dumbbell", "cable", "rack"],
        workoutLocation: "Gym",
        weeklyWorkoutDays: 5,
        preferredWorkoutDuration: "60",
        heightCm: 178,
        weightKg: 82.5,
        age: 28,
        gender: "male",
        dailyCalorieGoal: 2800,
        dailyProteinGoal: 180,
        onboardingComplete: true,
        coachOnboardingComplete: true,
      });

      await db.insert(settingsTable).values({ userId: demoUser.id });
      await ensureFreeSubscription(demoUser.id);
    } else {
      // Reset profile to fresh state
      await db.update(profilesTable)
        .set({
          fitnessGoals: ["Build Muscle", "Improve Strength"],
          activityLevel: "moderately_active",
          experienceLevel: "intermediate",
          availableEquipment: ["barbell", "dumbbell", "cable", "rack"],
          workoutLocation: "Gym",
          weeklyWorkoutDays: 5,
          preferredWorkoutDuration: "60",
          heightCm: 178,
          weightKg: 82.5,
          age: 28,
          gender: "male",
          dailyCalorieGoal: 2800,
          dailyProteinGoal: 180,
          onboardingComplete: true,
          coachOnboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(profilesTable.userId, demoUser.id));
    }

    // Seed fresh demo data
    await seedDemoData(demoUser.id);

    // Create a new session (valid for 2 hours — intentionally short for demo)
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: demoUser.id,
      expiresAt,
    });

    res.json({
      user: {
        id: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
      },
      token: sessionId,
      isDemo: true,
    });
  } catch (err) {
    console.error("Demo login error:", err);
    res.status(500).json({ error: "Demo login failed" });
  }
});

export default router;
