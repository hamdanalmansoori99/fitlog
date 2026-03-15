import { Router } from "express";
import { db, settingsTable, workoutsTable, mealsTable, bodyMeasurementsTable, mealFoodItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { getActiveSubscription } from "../services/subscriptionService";

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
    const language = req.body.language && ["en", "ar"].includes(req.body.language) ? req.body.language : undefined;
    
    const existing = await db.select().from(settingsTable)
      .where(eq(settingsTable.userId, user.id)).limit(1);
    
    if (existing.length === 0) {
      const [newSettings] = await db.insert(settingsTable).values({
        userId: user.id,
        darkMode: darkMode ?? true,
        unitSystem: unitSystem ?? "metric",
        language: language ?? "en",
        notificationsEnabled: notificationsEnabled ?? true,
      }).returning();
      res.json(newSettings);
      return;
    }
    
    const [updated] = await db.update(settingsTable)
      .set({
        ...(darkMode !== undefined && { darkMode }),
        ...(unitSystem !== undefined && { unitSystem }),
        ...(language !== undefined && { language }),
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
    const user = getUser(req) as any;
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    if (!sub.plan.features.exportData) {
      res.status(403).json({
        error: "Data export is a Premium feature",
        feature: "exportData",
        upgradeAvailable: true,
      });
      return;
    }

    const rawWorkouts = await db.select().from(workoutsTable).where(eq(workoutsTable.userId, user.id));
    const rawMeals = await db.select().from(mealsTable).where(eq(mealsTable.userId, user.id));
    const rawMeasurements = await db.select().from(bodyMeasurementsTable).where(eq(bodyMeasurementsTable.userId, user.id));

    // Attach food items to each meal
    const mealsWithFoods = await Promise.all(
      rawMeals.map(async (meal) => {
        const foodItems = await db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, meal.id));
        const { userId: _uid, ...mealRest } = meal;
        return { ...mealRest, foodItems: foodItems.map(({ mealId: _mid, ...f }) => f) };
      })
    );

    // Strip internal userId and DB-internal foreign-key columns from all records
    const workouts = rawWorkouts.map(({ userId: _uid, ...w }) => w);
    const measurements = rawMeasurements.map(({ userId: _uid, ...m }) => m);

    res.setHeader("Content-Disposition", `attachment; filename="fitlog-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json({
      exportedAt: new Date().toISOString(),
      user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
      workouts,
      meals: mealsWithFoods,
      measurements,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
