import { Router } from "express";
import { db, recoveryLogsTable } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

// GET /recovery/today
router.get("/today", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { start, end } = todayRange();
    const [log] = await db.select().from(recoveryLogsTable)
      .where(and(
        eq(recoveryLogsTable.userId, user.id),
        gte(recoveryLogsTable.date, start),
        lt(recoveryLogsTable.date, end)
      ))
      .limit(1);
    res.json({ log: log ?? null });
  } catch {
    res.status(500).json({ error: "Failed to get recovery log" });
  }
});

// GET /recovery/recent  (last 7 days)
router.get("/recent", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const logs = await db.select().from(recoveryLogsTable)
      .where(and(eq(recoveryLogsTable.userId, user.id), gte(recoveryLogsTable.date, since)))
      .orderBy(desc(recoveryLogsTable.date))
      .limit(7);
    res.json({ logs });
  } catch {
    res.status(500).json({ error: "Failed to get recent recovery logs" });
  }
});

// POST /recovery/log  (upsert today)
router.post("/log", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { start, end } = todayRange();
    const { sleepHours, sleepQuality, energyLevel, stressLevel, overallFeeling, soreness, notes } = req.body;

    if (sleepHours !== undefined && (typeof sleepHours !== "number" || sleepHours < 0 || sleepHours > 24)) {
      res.status(400).json({ error: "sleepHours must be a number between 0 and 24" });
      return;
    }
    const scaleFields: Record<string, unknown> = { sleepQuality, energyLevel, stressLevel, overallFeeling };
    for (const [field, val] of Object.entries(scaleFields)) {
      if (val !== undefined && (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 10)) {
        res.status(400).json({ error: `${field} must be an integer between 1 and 10` });
        return;
      }
    }

    // Delete + insert in a transaction to avoid data-loss window
    const log = await db.transaction(async (tx: typeof db) => {
      await tx.delete(recoveryLogsTable)
        .where(and(
          eq(recoveryLogsTable.userId, user.id),
          gte(recoveryLogsTable.date, start),
          lt(recoveryLogsTable.date, end)
        ));

      const [inserted] = await tx.insert(recoveryLogsTable).values({
        userId: user.id,
        date: new Date(),
        sleepHours: sleepHours ?? null,
        sleepQuality: sleepQuality ?? null,
        energyLevel: energyLevel ?? null,
        stressLevel: stressLevel ?? null,
        overallFeeling: overallFeeling ?? null,
        soreness: soreness ?? {},
        notes: notes ?? null,
      }).returning();

      return inserted;
    });

    res.status(201).json({ log });
  } catch {
    res.status(500).json({ error: "Failed to save recovery log" });
  }
});

export default router;
