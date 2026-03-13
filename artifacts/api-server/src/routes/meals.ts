import { Router } from "express";
import { db, mealsTable, mealFoodItemsTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

async function getMealWithFoodItems(mealId: number, userId: number) {
  const meals = await db.select().from(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, userId)))
    .limit(1);
  
  if (meals.length === 0) return null;
  const meal = meals[0];
  
  const foodItems = await db.select().from(mealFoodItemsTable)
    .where(eq(mealFoodItemsTable.mealId, mealId));
  
  const totalCalories = foodItems.reduce((s, f) => s + f.calories, 0);
  const totalProteinG = foodItems.reduce((s, f) => s + f.proteinG, 0);
  const totalCarbsG = foodItems.reduce((s, f) => s + f.carbsG, 0);
  const totalFatG = foodItems.reduce((s, f) => s + f.fatG, 0);
  
  return { ...meal, foodItems, totalCalories, totalProteinG, totalCarbsG, totalFatG };
}

router.post("/analyze-photo", requireAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const prompt = `You are a nutrition expert analyzing a meal photo. Identify every food item visible and estimate nutrition.

Return ONLY valid JSON in this exact structure — no markdown, no explanation:
{
  "mealName": "descriptive name of the overall meal",
  "foods": [
    {
      "name": "specific food item name",
      "portionSize": 150,
      "unit": "grams",
      "calories": 250,
      "proteinG": 20,
      "carbsG": 30,
      "fatG": 8
    }
  ]
}

Rules:
- Identify each distinct food item separately (e.g. chicken breast, rice, broccoli)
- Estimate portion sizes visually (common units: grams, oz, cups, pieces, servings, ml)
- Estimate calories and macros per portion shown
- All numbers must be integers or decimals, never strings
- If you cannot identify a food, use your best guess
- Return at minimum 1 food item`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as any,
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(422).json({ error: "Could not parse AI response", raw });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const foods = (parsed.foods || []).map((f: any) => ({
      name: String(f.name || "Unknown food"),
      portionSize: Number(f.portionSize) || 100,
      unit: String(f.unit || "grams"),
      calories: Math.round(Number(f.calories) || 0),
      proteinG: Math.round(Number(f.proteinG) || 0),
      carbsG: Math.round(Number(f.carbsG) || 0),
      fatG: Math.round(Number(f.fatG) || 0),
    }));

    const totals = foods.reduce(
      (acc: any, f: any) => ({
        calories: acc.calories + f.calories,
        proteinG: acc.proteinG + f.proteinG,
        carbsG: acc.carbsG + f.carbsG,
        fatG: acc.fatG + f.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    res.json({ mealName: parsed.mealName || "AI-analyzed meal", foods, totals });
  } catch (err: any) {
    console.error("Photo analysis error:", err?.message);
    res.status(500).json({ error: "Failed to analyze photo" });
  }
});

router.get("/stats/nutrition", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const now = new Date();
    
    const profile = await db.select().from(profilesTable)
      .where(eq(profilesTable.userId, user.id)).limit(1);
    const calorieGoal = profile[0]?.dailyCalorieGoal || null;
    
    // Last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMeals = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, thirtyDaysAgo)));
    
    const mealWithItems = await Promise.all(
      recentMeals.map(async m => {
        const items = await db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, m.id));
        return { ...m, foodItems: items };
      })
    );
    
    // Daily calories over 30 days
    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }
    
    mealWithItems.forEach(m => {
      const dateKey = new Date(m.date).toISOString().split("T")[0];
      if (dailyMap[dateKey] !== undefined) {
        const cal = m.foodItems.reduce((s, f) => s + f.calories, 0);
        dailyMap[dateKey] += cal;
      }
    });
    
    const dailyCalories = Object.entries(dailyMap).map(([date, calories]) => ({
      date,
      calories,
      goal: calorieGoal,
    }));
    
    // Averages
    const last7Days = dailyCalories.slice(-7);
    const avg7DayCalories = last7Days.reduce((s, d) => s + d.calories, 0) / 7;
    const avg30DayCalories = dailyCalories.reduce((s, d) => s + d.calories, 0) / 30;
    
    // Macro split
    let totalProtein = 0, totalCarbs = 0, totalFat = 0;
    mealWithItems.forEach(m => {
      m.foodItems.forEach(f => {
        totalProtein += f.proteinG;
        totalCarbs += f.carbsG;
        totalFat += f.fatG;
      });
    });
    
    const macroTotal = totalProtein + totalCarbs + totalFat;
    const macroSplit = macroTotal > 0 ? {
      proteinPercentage: Math.round((totalProtein / macroTotal) * 100),
      carbsPercentage: Math.round((totalCarbs / macroTotal) * 100),
      fatPercentage: Math.round((totalFat / macroTotal) * 100),
    } : { proteinPercentage: 33, carbsPercentage: 34, fatPercentage: 33 };
    
    res.json({ avg7DayCalories, avg30DayCalories, macroSplit, dailyCalories });
  } catch (err) {
    res.status(500).json({ error: "Failed to get nutrition stats" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const dateStr = req.query.date as string;
    
    let startDate: Date, endDate: Date;
    if (dateStr) {
      startDate = new Date(dateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const meals = await db.select().from(mealsTable)
      .where(and(
        eq(mealsTable.userId, user.id),
        gte(mealsTable.date, startDate),
        lte(mealsTable.date, endDate)
      ))
      .orderBy(mealsTable.date);
    
    const mealsWithItems = await Promise.all(
      meals.map(async m => {
        const foodItems = await db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, m.id));
        const totalCalories = foodItems.reduce((s, f) => s + f.calories, 0);
        const totalProteinG = foodItems.reduce((s, f) => s + f.proteinG, 0);
        const totalCarbsG = foodItems.reduce((s, f) => s + f.carbsG, 0);
        const totalFatG = foodItems.reduce((s, f) => s + f.fatG, 0);
        return { ...m, foodItems, totalCalories, totalProteinG, totalCarbsG, totalFatG };
      })
    );
    
    const dailyTotals = mealsWithItems.reduce((acc, m) => ({
      calories: acc.calories + m.totalCalories,
      proteinG: acc.proteinG + m.totalProteinG,
      carbsG: acc.carbsG + m.totalCarbsG,
      fatG: acc.fatG + m.totalFatG,
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    
    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    
    res.json({
      date: dateStr || new Date().toISOString().split("T")[0],
      meals: mealsWithItems,
      dailyTotals,
      calorieGoal: profiles[0]?.dailyCalorieGoal || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get meals" });
  }
});

router.get("/recent-foods", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 50);
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const foods = await db
      .select({
        name: mealFoodItemsTable.name,
        unit: mealFoodItemsTable.unit,
        avgCalories: sql<number>`round(avg(${mealFoodItemsTable.calories}))`,
        avgProteinG: sql<number>`round(avg(${mealFoodItemsTable.proteinG}), 1)`,
        avgCarbsG: sql<number>`round(avg(${mealFoodItemsTable.carbsG}), 1)`,
        avgFatG: sql<number>`round(avg(${mealFoodItemsTable.fatG}), 1)`,
        avgPortion: sql<number>`round(avg(${mealFoodItemsTable.portionSize}), 0)`,
        useCount: sql<number>`count(*)`,
      })
      .from(mealFoodItemsTable)
      .innerJoin(mealsTable, eq(mealFoodItemsTable.mealId, mealsTable.id))
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, since)))
      .groupBy(mealFoodItemsTable.name, mealFoodItemsTable.unit)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

    res.json({ foods });
  } catch (err) {
    console.error("recent-foods error:", err);
    res.status(500).json({ error: "Failed to get recent foods" });
  }
});

router.get("/frequent", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);

    const result = await db.execute(sql`
      SELECT
        m.name,
        m.category,
        count(*)::int AS use_count,
        round(avg(COALESCE(sub.total_calories, 0)))::int AS avg_calories,
        round(avg(COALESCE(sub.total_protein_g, 0)), 1)::float AS avg_protein_g,
        round(avg(COALESCE(sub.total_carbs_g, 0)), 1)::float AS avg_carbs_g,
        round(avg(COALESCE(sub.total_fat_g, 0)), 1)::float AS avg_fat_g,
        max(m.id)::int AS latest_meal_id
      FROM meals m
      LEFT JOIN (
        SELECT meal_id,
          sum(calories) AS total_calories,
          sum(protein_g) AS total_protein_g,
          sum(carbs_g) AS total_carbs_g,
          sum(fat_g) AS total_fat_g
        FROM meal_food_items
        GROUP BY meal_id
      ) sub ON sub.meal_id = m.id
      WHERE m.user_id = ${user.id}
      GROUP BY m.name, m.category
      ORDER BY count(*) DESC
      LIMIT ${limit}
    `);

    const rows = (result as any).rows ?? Array.from(result as any);
    res.json({ meals: rows });
  } catch (err) {
    console.error("frequent meals error:", err);
    res.status(500).json({ error: "Failed to get frequent meals" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const meal = await getMealWithFoodItems(parseInt(req.params.id), user.id);
    if (!meal) {
      res.status(404).json({ error: "Meal not found" });
      return;
    }
    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: "Failed to get meal" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { name, category, date, photoUrl, notes, foodItems } = req.body;

    const [meal] = await db.insert(mealsTable).values({
      userId: user.id,
      name,
      category,
      date: new Date(date),
      photoUrl,
      notes,
    }).returning();

    if (foodItems && foodItems.length > 0) {
      for (const item of foodItems) {
        await db.insert(mealFoodItemsTable).values({
          mealId: meal.id,
          name: item.name,
          portionSize: item.portionSize,
          unit: item.unit,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        });
      }
    }

    const fullMeal = await getMealWithFoodItems(meal.id, user.id);
    res.status(201).json(fullMeal);
  } catch (err) {
    console.error("Create meal error:", err);
    res.status(500).json({ error: "Failed to create meal" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const mealId = parseInt(req.params.id);
    
    const existing = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, user.id))).limit(1);
    
    if (existing.length === 0) {
      res.status(404).json({ error: "Meal not found" });
      return;
    }
    
    const { name, category, date, photoUrl, notes, foodItems } = req.body;

    await db.update(mealsTable).set({ name, category, date: new Date(date), photoUrl, notes, updatedAt: new Date() })
      .where(eq(mealsTable.id, mealId));
    
    if (foodItems) {
      await db.delete(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, mealId));
      for (const item of foodItems) {
        await db.insert(mealFoodItemsTable).values({
          mealId,
          name: item.name,
          portionSize: item.portionSize,
          unit: item.unit,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
        });
      }
    }

    const fullMeal = await getMealWithFoodItems(mealId, user.id);
    res.json(fullMeal);
  } catch (err) {
    res.status(500).json({ error: "Failed to update meal" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const mealId = parseInt(req.params.id);
    const existing = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Meal not found" }); return; }
    await db.delete(mealsTable).where(eq(mealsTable.id, mealId));
    res.json({ message: "Meal deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

router.post("/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const mealId = parseInt(req.params.id);
    const { targetDate } = req.body;

    const original = await getMealWithFoodItems(mealId, user.id);
    if (!original) {
      res.status(404).json({ error: "Meal not found" });
      return;
    }

    const date = targetDate
      ? new Date(targetDate + "T12:00:00")
      : (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })();

    const [newMeal] = await db.insert(mealsTable).values({
      userId: user.id,
      name: original.name,
      category: original.category,
      date,
      notes: original.notes ?? undefined,
    }).returning();

    if (original.foodItems.length > 0) {
      await db.insert(mealFoodItemsTable).values(
        original.foodItems.map((fi) => ({
          mealId: newMeal.id,
          name: fi.name,
          portionSize: fi.portionSize,
          unit: fi.unit,
          calories: fi.calories,
          proteinG: fi.proteinG,
          carbsG: fi.carbsG,
          fatG: fi.fatG,
        }))
      );
    }

    const full = await getMealWithFoodItems(newMeal.id, user.id);
    res.json(full);
  } catch (err) {
    console.error("duplicate meal error:", err);
    res.status(500).json({ error: "Failed to duplicate meal" });
  }
});

export default router;
