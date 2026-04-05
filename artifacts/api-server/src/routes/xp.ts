import { Router } from "express";
import { db, analyticsEventsTable } from "@workspace/db";
import { profilesTable } from "@workspace/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

export const XP_AWARDS = {
  workout: 50,
  meal_day: 30,     // all 3 meals logged in one day
  water_goal: 10,
  personal_record: 100,
  recovery: 15,
  streak_day: 20,
  onboarding: 200,
} as const;

// Map XP actions to the analytics event that proves the action happened
const ACTION_EVENT_MAP: Record<string, string> = {
  workout: "workout.logged",
  recovery: "recovery.logged",
  personal_record: "pr.set",
};

function todayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// POST /xp/award — body: { action: keyof XP_AWARDS }
router.post("/award", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { action } = req.body as { action: string };
    const amount = XP_AWARDS[action as keyof typeof XP_AWARDS];
    if (!amount) {
      res.status(400).json({ error: "Unknown action" });
      return;
    }

    // Verify the action actually happened today (where a mapping exists)
    const requiredEvent = ACTION_EVENT_MAP[action];
    if (requiredEvent) {
      const events = await db
        .select({ id: analyticsEventsTable.id })
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.userId, user.id),
            eq(analyticsEventsTable.eventType, requiredEvent),
            gte(analyticsEventsTable.createdAt, todayStart())
          )
        )
        .limit(1);

      if (events.length === 0) {
        res.status(403).json({ error: "Action not verified" });
        return;
      }
    }

    await db
      .update(profilesTable)
      .set({ xp: sql`${profilesTable.xp} + ${amount}` })
      .where(eq(profilesTable.userId, user.id));

    const profile = await db.query.profilesTable.findFirst({
      where: eq(profilesTable.userId, user.id),
      columns: { xp: true },
    });

    res.json({ xp: profile?.xp ?? 0, awarded: amount });
  } catch (err) {
    res.status(500).json({ error: "Failed to award XP" });
  }
});

// GET /xp — returns current XP
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const profile = await db.query.profilesTable.findFirst({
      where: eq(profilesTable.userId, user.id),
      columns: { xp: true },
    });
    res.json({ xp: profile?.xp ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to get XP" });
  }
});

export default router;
