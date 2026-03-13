import { Router } from "express";
import { db, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const measurements = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.userId, user.id), gte(bodyMeasurementsTable.date, cutoff)))
      .orderBy(desc(bodyMeasurementsTable.date));
    
    res.json({ measurements });
  } catch (err) {
    res.status(500).json({ error: "Failed to get measurements" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { date, weightKg, bodyFatPercent, chestCm, waistCm, hipsCm, armsCm } = req.body;
    
    const [measurement] = await db.insert(bodyMeasurementsTable).values({
      userId: user.id,
      date: new Date(date),
      weightKg,
      bodyFatPercent,
      chestCm,
      waistCm,
      hipsCm,
      armsCm,
    }).returning();
    
    res.status(201).json(measurement);
  } catch (err) {
    res.status(500).json({ error: "Failed to log measurement" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const measureId = parseInt(req.params.id);
    const existing = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.id, measureId), eq(bodyMeasurementsTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Measurement not found" }); return; }
    await db.delete(bodyMeasurementsTable).where(eq(bodyMeasurementsTable.id, measureId));
    res.json({ message: "Measurement deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete measurement" });
  }
});

export default router;
