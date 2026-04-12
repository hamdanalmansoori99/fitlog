/**
 * Development-only utilities. This router is only mounted when NODE_ENV !== "production".
 * POST /dev/seed-demo — creates (or resets) the demo account inside the running server process,
 * ensuring it uses the same PGlite instance as all other requests.
 */

import { Router } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";

const DEMO_EMAIL = "demo@ordeal.app";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_XP = 500; // Cinder Acolyte rank

const router = Router();

export async function seedDemoAccount() {
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_EMAIL),
  });

  let userId: number;

  if (existing) {
    userId = existing.id;
  } else {
    const hashed = await hashPassword(DEMO_PASSWORD);
    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: DEMO_EMAIL,
        passwordHash: hashed,
        firstName: "Demo",
        lastName: "Champion",
      })
      .returning({ id: usersTable.id });
    userId = newUser.id;
    console.log("[dev] Demo account created:", DEMO_EMAIL);
  }

  const existingProfile = await db.query.profilesTable.findFirst({
    where: eq(profilesTable.userId, userId),
  });

  const profileData = {
    xp: DEMO_XP,
    fitnessGoals: ["Build muscle", "Get stronger"],
    experienceLevel: "Advanced",
    onboardingComplete: true,
    coachOnboardingComplete: true,
    weeklyWorkoutDays: 5,
  };

  if (existingProfile) {
    await db.update(profilesTable).set(profileData).where(eq(profilesTable.userId, userId));
  } else {
    await db.insert(profilesTable).values({ userId, ...profileData });
  }
}

router.post("/seed-demo", async (_req, res) => {
  try {
    await seedDemoAccount();
    res.json({
      message: "Demo account ready.",
      credentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      xp: DEMO_XP,
      rank: "Cinder Acolyte",
    });
  } catch (err: any) {
    console.error("[dev] seed-demo failed:", err);
    res.status(500).json({ error: err?.message ?? "Seed failed" });
  }
});

export default router;
