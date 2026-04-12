/**
 * Demo account seed script.
 * Creates demo@ordeal.app at The Infinite rank (99999 XP).
 *
 * Usage (from artifacts/api-server/):
 *   PORT=3001 npx tsx src/seed-demo.ts
 *
 * The server does NOT need to be running — this script writes directly to the DB.
 */

import { db } from "@workspace/db";
import { profilesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth.js";

const DEMO_EMAIL = "demo@ordeal.app";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_XP = 500; // Cinder Acolyte rank

async function seed() {
  console.log("🌱 Seeding demo account…");

  // Check if user already exists
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_EMAIL),
  });

  let userId: number;

  if (existing) {
    console.log(`ℹ️  User ${DEMO_EMAIL} already exists (id: ${existing.id}) — updating XP only.`);
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
    console.log(`✅ Created user ${DEMO_EMAIL} (id: ${userId})`);
  }

  // Upsert profile with max XP
  const existingProfile = await db.query.profilesTable.findFirst({
    where: eq(profilesTable.userId, userId),
  });

  if (existingProfile) {
    await db
      .update(profilesTable)
      .set({
        xp: DEMO_XP,
        fitnessGoals: ["Build muscle", "Get stronger"],
        experienceLevel: "Advanced",
        onboardingComplete: true,
        coachOnboardingComplete: true,
        weeklyWorkoutDays: 5,
      })
      .where(eq(profilesTable.userId, userId));
    console.log(`✅ Updated profile: XP set to ${DEMO_XP}`);
  } else {
    await db.insert(profilesTable).values({
      userId,
      xp: DEMO_XP,
      fitnessGoals: ["Build muscle", "Get stronger"],
      experienceLevel: "Advanced",
      onboardingComplete: true,
      coachOnboardingComplete: true,
      weeklyWorkoutDays: 5,
    });
    console.log(`✅ Created profile: XP set to ${DEMO_XP}`);
  }

  console.log("\n─────────────────────────────────");
  console.log("  DEMO ACCOUNT READY");
  console.log("─────────────────────────────────");
  console.log(`  Email    : ${DEMO_EMAIL}`);
  console.log(`  Password : ${DEMO_PASSWORD}`);
  console.log(`  Rank     : The Infinite (${DEMO_XP} XP)`);
  console.log("─────────────────────────────────\n");
  console.log("Run with: npx tsx src/seed-demo.ts (from artifacts/api-server/)");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
