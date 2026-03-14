import { Router } from "express";
import { db, favoriteMealsTable, mealsTable, mealFoodItemsTable } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

// GET /meals/favorites
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const favorites = await db.select().from(favoriteMealsTable)
      .where(eq(favoriteMealsTable.userId, user.id))
      .orderBy(desc(favoriteMealsTable.usageCount), desc(favoriteMealsTable.createdAt));
    res.json({ favorites });
  } catch {
    res.status(500).json({ error: "Failed to get favorite meals" });
  }
});

// POST /meals/favorites  (create from sourceMealId or manual)
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { name, category, foodItems, sourceMealId } = req.body;

    let resolvedName = name;
    let resolvedCategory = category ?? "Snacks";
    let resolvedItems = foodItems ?? [];

    if (sourceMealId) {
      const [meal] = await db.select().from(mealsTable)
        .where(and(eq(mealsTable.id, sourceMealId), eq(mealsTable.userId, user.id)))
        .limit(1);
      if (meal) {
        resolvedName = resolvedName || meal.name;
        resolvedCategory = meal.category;
        const items = await db.select().from(mealFoodItemsTable)
          .where(eq(mealFoodItemsTable.mealId, meal.id));
        resolvedItems = items.map((i) => ({
          name: i.name,
          portionSize: i.portionSize,
          unit: i.unit,
          calories: i.calories,
          proteinG: i.proteinG,
          carbsG: i.carbsG,
          fatG: i.fatG,
        }));
      }
    }

    const totalCalories = resolvedItems.reduce((s: number, i: any) => s + (i.calories ?? 0), 0);
    const totalProteinG = resolvedItems.reduce((s: number, i: any) => s + (i.proteinG ?? 0), 0);

    const [favorite] = await db.insert(favoriteMealsTable).values({
      userId: user.id,
      name: resolvedName || "Favourite Meal",
      category: resolvedCategory,
      foodItems: resolvedItems,
      totalCalories,
      totalProteinG,
      usageCount: 0,
    }).returning();

    res.status(201).json({ favorite });
  } catch {
    res.status(500).json({ error: "Failed to save favourite meal" });
  }
});

// DELETE /meals/favorites/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    await db.delete(favoriteMealsTable)
      .where(and(eq(favoriteMealsTable.id, id), eq(favoriteMealsTable.userId, user.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete favourite meal" });
  }
});

// POST /meals/favorites/:id/log  (quick-log to today as a new meal entry)
router.post("/:id/log", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    const { category } = req.body;

    const [fav] = await db.select().from(favoriteMealsTable)
      .where(and(eq(favoriteMealsTable.id, id), eq(favoriteMealsTable.userId, user.id)));
    if (!fav) { res.status(404).json({ error: "Favourite not found" }); return; }

    // Create the meal entry for today
    const [meal] = await db.insert(mealsTable).values({
      userId: user.id,
      name: fav.name,
      category: category ?? fav.category,
      date: new Date(),
      notes: "Logged from favourites",
    }).returning();

    // Insert food items
    if (fav.foodItems.length > 0) {
      await db.insert(mealFoodItemsTable).values(
        fav.foodItems.map((item: any) => ({
          mealId: meal.id,
          name: item.name,
          portionSize: item.portionSize,
          unit: item.unit,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        }))
      );
    }

    // Increment usage count
    await db.update(favoriteMealsTable)
      .set({ usageCount: (fav.usageCount || 0) + 1, lastUsedAt: new Date() })
      .where(eq(favoriteMealsTable.id, id));

    res.status(201).json({ meal: { ...meal, foodItems: fav.foodItems } });
  } catch {
    res.status(500).json({ error: "Failed to log favourite meal" });
  }
});

// POST /meals/duplicate-day  { fromDate: "YYYY-MM-DD", toDate?: "YYYY-MM-DD" }
router.post("/duplicate-day", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { fromDate, toDate } = req.body;

    if (!fromDate) { res.status(400).json({ error: "fromDate required" }); return; }

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const fromEnd = new Date(from);
    fromEnd.setDate(from.getDate() + 1);

    const to = toDate ? new Date(toDate) : new Date();
    to.setHours(12, 0, 0, 0);

    // Fetch source meals
    const sourceMeals = await db.select().from(mealsTable)
      .where(and(
        eq(mealsTable.userId, user.id),
        gte(mealsTable.date, from),
        lt(mealsTable.date, fromEnd)
      ));

    if (sourceMeals.length === 0) {
      res.json({ count: 0, meals: [] });
      return;
    }

    const created: any[] = [];

    for (const sourceMeal of sourceMeals) {
      const foodItems = await db.select().from(mealFoodItemsTable)
        .where(eq(mealFoodItemsTable.mealId, sourceMeal.id));

      const [newMeal] = await db.insert(mealsTable).values({
        userId: user.id,
        name: sourceMeal.name,
        category: sourceMeal.category,
        date: to,
        notes: `Copied from ${fromDate}`,
      }).returning();

      if (foodItems.length > 0) {
        await db.insert(mealFoodItemsTable).values(
          foodItems.map((item) => ({
            mealId: newMeal.id,
            name: item.name,
            portionSize: item.portionSize,
            unit: item.unit,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
          }))
        );
      }
      created.push(newMeal);
    }

    res.status(201).json({ count: created.length, meals: created });
  } catch {
    res.status(500).json({ error: "Failed to duplicate meals" });
  }
});

export default router;
