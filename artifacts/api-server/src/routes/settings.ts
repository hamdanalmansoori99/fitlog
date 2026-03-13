import { Router } from "express";
import { db, settingsTable, workoutsTable, mealsTable, bodyMeasurementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const settings = await db.select().from(settingsTable)
      .where(eq(settingsTable.userId, user.id)).limit(1);
    
    if (settings.length === 0) {
      const [newSettings] = await db.insert(settingsTable).values({ userId: user.id }).returning();
      res.json(newSettings);
      return;
    }
    res.json(settings[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { darkMode, unitSystem, notificationsEnabled } = req.body;
    
    const existing = await db.select().from(settingsTable)
      .where(eq(settingsTable.userId, user.id)).limit(1);
    
    if (existing.length === 0) {
      const [newSettings] = await db.insert(settingsTable).values({
        userId: user.id,
        darkMode: darkMode ?? true,
        unitSystem: unitSystem ?? "metric",
        notificationsEnabled: notificationsEnabled ?? true,
      }).returning();
      res.json(newSettings);
      return;
    }
    
    const [updated] = await db.update(settingsTable)
      .set({
        ...(darkMode !== undefined && { darkMode }),
        ...(unitSystem !== undefined && { unitSystem }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        updatedAt: new Date(),
      })
      .where(eq(settingsTable.userId, user.id))
      .returning();
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/export", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const workouts = await db.select().from(workoutsTable).where(eq(workoutsTable.userId, user.id));
    const meals = await db.select().from(mealsTable).where(eq(mealsTable.userId, user.id));
    const measurements = await db.select().from(bodyMeasurementsTable).where(eq(bodyMeasurementsTable.userId, user.id));
    res.json({ workouts, meals, measurements });
  } catch (err) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
