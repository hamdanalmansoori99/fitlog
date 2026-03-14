import { Router } from "express";
import { db, waterLogsTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

// GET /water/today
router.get("/today", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [logs, profile] = await Promise.all([
      db.select()
        .from(waterLogsTable)
        .where(
          and(
            eq(waterLogsTable.userId, user.id),
            gte(waterLogsTable.loggedAt, today),
            lte(waterLogsTable.loggedAt, tomorrow)
          )
        )
        .orderBy(desc(waterLogsTable.loggedAt)),
      db.select({ dailyWaterGoalMl: profilesTable.dailyWaterGoalMl })
        .from(profilesTable)
        .where(eq(profilesTable.userId, user.id))
        .limit(1),
    ]);

    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
    const goalMl = profile[0]?.dailyWaterGoalMl ?? 2000;
    const percentage = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;

    res.json({ logs, totalMl, goalMl, percentage });
  } catch (err) {
    res.status(500).json({ error: "Failed to get water logs" });
  }
});

// POST /water/log
router.post("/log", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { amountMl, loggedAt } = req.body;

    if (!amountMl || typeof amountMl !== "number" || amountMl <= 0) {
      res.status(400).json({ error: "amountMl must be a positive number" });
      return;
    }

    const [log] = await db.insert(waterLogsTable).values({
      userId: user.id,
      amountMl: Math.round(amountMl),
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
    }).returning();

    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ error: "Failed to log water" });
  }
});

// DELETE /water/log/:id
router.delete("/log/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(waterLogsTable)
      .where(and(eq(waterLogsTable.id, id), eq(waterLogsTable.userId, user.id)));

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete water log" });
  }
});

export default router;
