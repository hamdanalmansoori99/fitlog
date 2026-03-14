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

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const measureId = parseInt(req.params.id);
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
    const measureId = parseInt(req.params.id);
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
