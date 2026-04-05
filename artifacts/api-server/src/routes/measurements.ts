import { Router } from "express";
import { db, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const rawDays = parseInt(req.query.days as string);
    const days = (!isNaN(rawDays) && rawDays > 0) ? Math.min(rawDays, 365) : 30;
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

    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const numericFields: Record<string, unknown> = { weightKg, bodyFatPercent, chestCm, waistCm, hipsCm, armsCm };
    for (const [field, val] of Object.entries(numericFields)) {
      if (val !== undefined && (typeof val !== "number" || !isFinite(val) || val < 0)) {
        res.status(400).json({ error: `${field} must be a non-negative number` });
        return;
      }
    }

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

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const measureId = parseInt(req.params.id as string);
    if (isNaN(measureId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [measurement] = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.id, measureId), eq(bodyMeasurementsTable.userId, user.id)))
      .limit(1);
    if (!measurement) { res.status(404).json({ error: "Measurement not found" }); return; }
    res.json(measurement);
  } catch (err) {
    res.status(500).json({ error: "Failed to get measurement" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const measureId = parseInt(req.params.id as string);
    if (isNaN(measureId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const existing = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.id, measureId), eq(bodyMeasurementsTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Measurement not found" }); return; }
    const { weightKg, bodyFatPercent, chestCm, waistCm, hipsCm, armsCm } = req.body;
    const [updated] = await db.update(bodyMeasurementsTable)
      .set({
        ...(weightKg !== undefined && { weightKg }),
        ...(bodyFatPercent !== undefined && { bodyFatPercent }),
        ...(chestCm !== undefined && { chestCm }),
        ...(waistCm !== undefined && { waistCm }),
        ...(hipsCm !== undefined && { hipsCm }),
        ...(armsCm !== undefined && { armsCm }),
        updatedAt: new Date(),
      })
      .where(eq(bodyMeasurementsTable.id, measureId))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update measurement" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const measureId = parseInt(req.params.id as string);
    if (isNaN(measureId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const existing = await db.select().from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.id, measureId), eq(bodyMeasurementsTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Measurement not found" }); return; }
    await db.delete(bodyMeasurementsTable).where(and(eq(bodyMeasurementsTable.id, measureId), eq(bodyMeasurementsTable.userId, user.id)));
    res.json({ message: "Measurement deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete measurement" });
  }
});

export default router;
