import { Router } from "express";
import { db, profilesTable, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

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
      firstName, lastName, age, gender, heightCm, weightKg,
      fitnessGoals, activityLevel, dailyCalorieGoal, dailyProteinGoal,
      dailyCarbsGoal, dailyFatGoal, dailyWaterGoalMl,
      availableEquipment, workoutLocation, trainingPreferences,
      experienceLevel, preferredWorkoutDuration, weeklyWorkoutDays,
      coachOnboardingComplete, savedWeeklyPlan,
    } = req.body;

    // Update user name
    if (firstName !== undefined || lastName !== undefined) {
      await db.update(usersTable)
        .set({ firstName, lastName, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }

    // Update profile
    const [profile] = await db.update(profilesTable)
      .set({
        age, gender, heightCm, weightKg,
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
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
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
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
