import { Router } from "express";
import { db, profilesTable, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser, verifyPassword } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    
    if (profiles.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    
    const profile = profiles[0];
    res.json({
      ...profile,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const {
      firstName, lastName, age, gender, heightCm, weightKg, waistCm,
      fitnessGoals, activityLevel, dailyCalorieGoal, dailyProteinGoal,
      dailyCarbsGoal, dailyFatGoal, dailyWaterGoalMl,
      availableEquipment, workoutLocation, trainingPreferences,
      experienceLevel, preferredWorkoutDuration, weeklyWorkoutDays,
      coachOnboardingComplete, savedWeeklyPlan,
    } = req.body;

    // Validate names if provided
    if (firstName !== undefined) {
      if (typeof firstName !== "string" || firstName.trim().length < 1 || firstName.trim().length > 100) {
        res.status(400).json({ error: "First name must be 1–100 characters" });
        return;
      }
    }
    if (lastName !== undefined) {
      if (typeof lastName !== "string" || lastName.trim().length < 1 || lastName.trim().length > 100) {
        res.status(400).json({ error: "Last name must be 1–100 characters" });
        return;
      }
    }

    // Update user name — only set the fields that were actually provided
    if (firstName !== undefined || lastName !== undefined) {
      await db.update(usersTable)
        .set({
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName.trim() }),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id));
    }

    // Update profile
    const [profile] = await db.update(profilesTable)
      .set({
        age, gender, heightCm, weightKg, waistCm: waistCm ?? undefined,
        fitnessGoals: fitnessGoals || [],
        activityLevel, dailyCalorieGoal, dailyProteinGoal,
        dailyCarbsGoal, dailyFatGoal,
        dailyWaterGoalMl: dailyWaterGoalMl ?? undefined,
        availableEquipment: availableEquipment ?? undefined,
        workoutLocation: workoutLocation ?? undefined,
        trainingPreferences: trainingPreferences ?? undefined,
        experienceLevel: experienceLevel ?? undefined,
        preferredWorkoutDuration: preferredWorkoutDuration ?? undefined,
        weeklyWorkoutDays: weeklyWorkoutDays ?? undefined,
        onboardingComplete: (req.body as any).onboardingComplete ?? undefined,
        coachOnboardingComplete: coachOnboardingComplete ?? undefined,
        savedWeeklyPlan: savedWeeklyPlan ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(profilesTable.userId, user.id))
      .returning();

    res.json({
      ...profile,
      firstName: firstName ?? user.firstName,
      lastName: lastName ?? user.lastName,
    });
  } catch (err) {
    logError("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.get("/nutrition-targets", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    const profile = profiles[0];
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    const goals: string[] = (profile.fitnessGoals as string[]) || [];
    const isMuscleBuilding = goals.some(g => /muscle|gain|bulk/i.test(g));
    const isWeightLoss = goals.some(g => /lose|weight|cut|fat|slim/i.test(g));

    const w = profile.weightKg ?? null;
    const h = profile.heightCm ?? null;
    const a = profile.age ?? 30;
    const gender = profile.gender ?? "male";
    const activityMap: Record<string, number> = {
      sedentary: 1.2, lightly_active: 1.375,
      moderately_active: 1.55, very_active: 1.725, extra_active: 1.9,
    };

    let calorieGoal: number;
    let explanation: string;

    if (w && h) {
      const bmr = gender === "female"
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
      const tdee = Math.round(bmr * (activityMap[(profile.activityLevel as string) ?? "moderately_active"] ?? 1.55));
      calorieGoal = isMuscleBuilding ? tdee + 300 : isWeightLoss ? Math.max(tdee - 400, 1400) : tdee;
      const goalLabel = isMuscleBuilding ? "muscle building (+300 surplus)"
        : isWeightLoss ? "fat loss (−400 deficit)"
        : "maintenance / general fitness";
      explanation = `Based on ${w} kg, ${h} cm, ${goalLabel}: TDEE ${tdee} kcal`;
    } else {
      calorieGoal = isMuscleBuilding ? 2600 : isWeightLoss ? 1800 : 2200;
      explanation = "Default estimate (add height & weight for a personalised calculation)";
    }

    const proteinPerKg = isMuscleBuilding ? 2.2 : isWeightLoss ? 2.0 : 1.8;
    const proteinGoal = w ? Math.round(w * proteinPerKg) : (isMuscleBuilding ? 170 : isWeightLoss ? 160 : 150);
    const carbsGoal = Math.round((calorieGoal * 0.40) / 4);
    const fatGoal = Math.round((calorieGoal * 0.25) / 9);

    res.json({ calorieGoal, proteinGoal, carbsGoal, fatGoal, explanation });
  } catch (err) {
    logError("nutrition-targets error:", err);
    res.status(500).json({ error: "Failed to calculate targets" });
  }
});

router.post("/photo", requireAuth, async (req, res) => {
  const { photoUrl } = req.body;
  const user = getUser(req);

  if (!photoUrl || typeof photoUrl !== "string") {
    res.status(400).json({ error: "photoUrl is required" });
    return;
  }

  // Only allow absolute https:// URLs to prevent javascript: XSS and SSRF
  let parsed: URL;
  try {
    parsed = new URL(photoUrl);
  } catch {
    res.status(400).json({ error: "photoUrl must be a valid URL" });
    return;
  }
  if (parsed.protocol !== "https:") {
    res.status(400).json({ error: "photoUrl must use HTTPS" });
    return;
  }
  if (photoUrl.length > 2048) {
    res.status(400).json({ error: "photoUrl is too long" });
    return;
  }

  await db.update(profilesTable)
    .set({ photoUrl, updatedAt: new Date() })
    .where(eq(profilesTable.userId, user.id));

  res.json({ url: photoUrl });
});

router.delete("/delete", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { password } = req.body;

    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password is required to delete your account" });
      return;
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      res.status(403).json({ error: "Incorrect password" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
