import { Router } from "express";
import { db, mealsTable, mealFoodItemsTable, profilesTable, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, gte, lt, desc, sql, isNotNull } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { trackEvent } from "../services/analyticsService";

const router = Router();

async function computeNutritionTargets(userId: number, profile: any, overrideCalories?: number, overrideProtein?: number) {
  const goals: string[] = profile.fitnessGoals || [];
  const isMuscleBuilding = goals.some(g => /muscle|gain|bulk/i.test(g));
  const isWeightLoss = goals.some(g => /lose|weight|cut|fat|slim/i.test(g));

  let bodyWeightKg: number | null = profile.weightKg ?? null;
  if (!bodyWeightKg) {
    const latestMeasurement = await db
      .select({ weightKg: bodyMeasurementsTable.weightKg })
      .from(bodyMeasurementsTable)
      .where(and(eq(bodyMeasurementsTable.userId, userId), isNotNull(bodyMeasurementsTable.weightKg)))
      .orderBy(desc(bodyMeasurementsTable.date))
      .limit(1);
    bodyWeightKg = latestMeasurement[0]?.weightKg ?? null;
  }

  const proteinPerKg = isMuscleBuilding ? 2.2 : isWeightLoss ? 2.0 : 1.8;
  const computedProtein = bodyWeightKg ? Math.round(bodyWeightKg * proteinPerKg) : null;
  const defaultProtein = isMuscleBuilding ? 170 : isWeightLoss ? 160 : 150;

  const proteinGoal = overrideProtein
    ?? (profile.dailyProteinGoal || computedProtein || defaultProtein);

  let calorieGoal = overrideCalories ?? profile.dailyCalorieGoal ?? null;
  if (!calorieGoal) {
    const w = bodyWeightKg;
    const h = profile.heightCm ?? null;
    const a = profile.age ?? 30;
    const gender = profile.gender ?? "male";

    if (w && h) {
      const bmr = gender === "female"
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
      const activityMap: Record<string, number> = {
        sedentary: 1.2, lightly_active: 1.375,
        moderately_active: 1.55, very_active: 1.725, extra_active: 1.9,
      };
      const tdee = Math.round(bmr * (activityMap[profile.activityLevel ?? "moderately_active"] ?? 1.55));
      calorieGoal = isMuscleBuilding ? tdee + 300 : isWeightLoss ? Math.max(tdee - 400, 1400) : tdee;
    } else {
      calorieGoal = isMuscleBuilding ? 2600 : isWeightLoss ? 1800 : 2200;
    }
  }

  const goalContext = isMuscleBuilding
    ? "muscle building (calorie surplus, high protein)"
    : isWeightLoss
    ? "fat loss (calorie deficit, high protein to preserve muscle)"
    : "general fitness / body recomposition";

  return { proteinGoal, calorieGoal, bodyWeightKg, goalContext };
}

router.post("/barcode-lookup", requireAuth, async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode || typeof barcode !== "string" || !/^\d{4,14}$/.test(barcode.trim())) {
      res.status(400).json({ error: "A valid barcode (4-14 digits) is required" });
      return;
    }

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode.trim())}.json`,
      {
        headers: { "User-Agent": "FitLog/1.0 (fitness-tracker-app)" },
      }
    );

    if (!response.ok) {
      res.status(502).json({ error: "Could not reach food database. Try again later." });
      return;
    }

    const data: any = await response.json();
    if (data.status !== 1 || !data.product) {
      res.status(404).json({ error: "Product not found. Try adding manually or use the photo scanner." });
      return;
    }

    const p = data.product;
    const nutriments = p.nutriments || {};
    const servingSize = p.serving_size || p.quantity || "100g";
    const servingG = parseFloat(p.serving_quantity) || 100;

    const hasServingData = nutriments["energy-kcal_serving"] != null;
    const scale = hasServingData ? 1 : servingG / 100;
    const kcalRaw = hasServingData ? nutriments["energy-kcal_serving"] : (nutriments["energy-kcal_100g"] ?? 0);
    const protRaw = hasServingData ? nutriments.proteins_serving : (nutriments.proteins_100g ?? 0);
    const carbRaw = hasServingData ? nutriments.carbohydrates_serving : (nutriments.carbohydrates_100g ?? 0);
    const fatRaw = hasServingData ? nutriments.fat_serving : (nutriments.fat_100g ?? 0);

    const food = {
      name: p.product_name || p.product_name_en || "Unknown product",
      brand: p.brands || null,
      servingSize,
      servingG: Math.round(servingG),
      calories: Math.round((Number(kcalRaw) || 0) * scale),
      proteinG: Math.round((Number(protRaw) || 0) * scale),
      carbsG: Math.round((Number(carbRaw) || 0) * scale),
      fatG: Math.round((Number(fatRaw) || 0) * scale),
      imageUrl: p.image_front_small_url || p.image_url || null,
    };

    res.json({ food });
  } catch (err: any) {
    console.error("Barcode lookup error:", err?.message);
    res.status(500).json({ error: "Failed to look up barcode" });
  }
});

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
    const user = getUser(req) as any;
    const { getActiveSubscription } = await import("../services/subscriptionService");
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    if (!sub.plan.features.aiPhotoAnalysis) {
      res.status(403).json({
        error: "AI meal photo analysis is a Premium feature",
        feature: "aiPhotoAnalysis",
        upgradeAvailable: true,
      });
      return;
    }

    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      res.status(400).json({ error: "mimeType must be one of: image/jpeg, image/png, image/gif, image/webp" });
      return;
    }

    // Base64-encoded ~4 MB image ≈ 5.5 MB of base64 text. Reject if over 6 MB string length.
    if (typeof imageBase64 !== "string" || imageBase64.length > 6 * 1024 * 1024) {
      res.status(413).json({ error: "Image too large. Maximum size is 4 MB." });
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

If the image clearly does NOT contain food, or the content is unrecognizable as food, return exactly:
{"mealName": "", "foods": [], "notFood": true}
Do NOT guess or invent foods that are not visible. Only identify items you can confidently recognize as food.

Rules:
- Identify each distinct food item separately (e.g. chicken breast, rice, broccoli)
- Estimate portion sizes visually (common units: grams, oz, cups, pieces, servings, ml)
- Estimate calories and macros per portion shown
- All numbers must be integers or decimals, never strings
- Return at minimum 1 food item when food is present`;

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

    if (parsed.notFood) {
      res.json({ notFood: true, mealName: "", foods: [], totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 } });
      return;
    }

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
        lt(mealsTable.date, endDate)
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

router.get("/food-search", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) {
      res.json({ results: [] });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity`,
        { headers: { "User-Agent": "FitLog/1.0 (fitness-tracker-app)" }, signal: controller.signal }
      );
    } catch (e: any) {
      clearTimeout(timeout);
      res.status(504).json({ error: "Food database timed out" });
      return;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({ error: "Could not reach food database" });
      return;
    }

    const data: any = await response.json();
    const products: any[] = data.products || [];

    const results = products
      .filter((p: any) => p.product_name || p.product_name_en)
      .map((p: any) => {
        const n = p.nutriments || {};
        return {
          name: p.product_name || p.product_name_en || "Unknown",
          brand: p.brands || null,
          servingSize: p.serving_size || "100g",
          calories: Math.round(Number(n["energy-kcal_100g"]) || 0),
          proteinG: Math.round(Number(n.proteins_100g) || 0),
          carbsG: Math.round(Number(n.carbohydrates_100g) || 0),
          fatG: Math.round(Number(n.fat_100g) || 0),
        };
      })
      .slice(0, 8);

    res.json({ results });
  } catch (err: any) {
    console.error("food-search error:", err?.message);
    res.status(500).json({ error: "Failed to search foods" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const meal = await getMealWithFoodItems(parseInt(req.params.id as string), user.id);
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
      await db.insert(mealFoodItemsTable).values(
        foodItems.map((item: any) => ({
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

    const fullMeal = await getMealWithFoodItems(meal.id, user.id);

    void trackEvent(user.id, "meal.logged", {
      category: meal.category,
      foodItemCount: foodItems?.length ?? 0,
      hasPhoto: !!meal.photoUrl,
    });

    res.status(201).json(fullMeal);
  } catch (err) {
    console.error("Create meal error:", err);
    res.status(500).json({ error: "Failed to create meal" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const mealId = parseInt(req.params.id as string);
    
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
      if (foodItems.length > 0) {
        await db.insert(mealFoodItemsTable).values(
          foodItems.map((item: any) => ({
            mealId,
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
    const mealId = parseInt(req.params.id as string);
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
    const mealId = parseInt(req.params.id as string);
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

router.post("/generate-plan", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const { getActiveSubscription } = await import("../services/subscriptionService");
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    if (!sub.plan.features.aiPhotoAnalysis) {
      res.status(403).json({ error: "AI meal plan generation is a Premium feature" });
      return;
    }

    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    const profile = profiles[0] || {};

    const { proteinGoal, calorieGoal, bodyWeightKg, goalContext } = await computeNutritionTargets(
      user.id, profile, req.body.calorieGoal, req.body.proteinGoalG
    );
    const preferences: string[] = req.body.preferences ?? [];
    const prefStr = preferences.length > 0 ? preferences.join(", ") : "no specific preferences";
    const weightNote = bodyWeightKg ? `- Body weight: ${bodyWeightKg} kg` : "";

    const prompt = `You are a precision nutrition coach. Generate a one-day meal plan tailored to this person:
- Goal: ${goalContext}
${weightNote}
- Daily calorie target: ${calorieGoal} kcal
- Daily protein target: ${proteinGoal}g (CRITICAL — every meal must be high in protein; total MUST reach ${proteinGoal}g)
- Dietary preferences: ${prefStr}

Choose protein-dense foods: chicken breast, lean beef, eggs, Greek yogurt, cottage cheese, fish, tofu, legumes.
Distribute protein across all meals — do not load it only into dinner.

Return EXACTLY a JSON array (no markdown, no extra text) with 4 to 5 meal objects. Each object must have:
- name: string (meal name)
- description: string (1 short sentence describing the meal and its main protein source)
- category: one of "Breakfast", "Lunch", "Dinner", "Snacks"
- calories: number (integer)
- proteinG: number (integer, must be high — aim for ${Math.round(proteinGoal / 4)}g+ per meal)
- carbsG: number (integer)
- fatG: number (integer)

The sum of calories must be close to ${calorieGoal}. The sum of proteinG MUST be at least ${proteinGoal}g. Return only the JSON array.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? "";
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      res.status(500).json({ error: "Failed to parse meal plan from AI" });
      return;
    }
    const meals = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    res.json({ meals });
  } catch (err) {
    console.error("generate-plan error:", err);
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

router.post("/generate-week-plan", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const { getActiveSubscription } = await import("../services/subscriptionService");
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    if (!sub.plan.features.aiPhotoAnalysis) {
      res.status(403).json({ error: "AI weekly meal plan is a Premium feature" });
      return;
    }

    const profiles = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);
    const profile = profiles[0] || {};

    const { proteinGoal, calorieGoal, bodyWeightKg, goalContext } = await computeNutritionTargets(
      user.id, profile, req.body.calorieGoal, req.body.proteinGoalG
    );
    const preferences: string[] = req.body.preferences ?? [];
    const prefStr = preferences.length > 0 ? preferences.join(", ") : "no specific preferences";
    const weightNote = bodyWeightKg ? `- Body weight: ${bodyWeightKg} kg` : "";

    const today = new Date();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }

    const prompt = `You are a precision nutrition coach. Generate a 7-day meal plan tailored to this person:
- Goal: ${goalContext}
${weightNote}
- Daily calorie target: ${calorieGoal} kcal
- Daily protein target: ${proteinGoal}g (CRITICAL — total protein per day MUST be at least ${proteinGoal}g)
- Dietary preferences: ${prefStr}

Choose protein-dense foods: chicken breast, lean beef, ground turkey, eggs, Greek yogurt, cottage cheese, fish, shrimp, tofu, edamame, lentils.
Distribute protein evenly across all 4 meals — do not load it only into dinner.

Return EXACTLY a JSON object (no markdown, no extra text) with this structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "name": "string",
          "description": "string (1 short sentence including main protein source)",
          "category": "Breakfast" | "Lunch" | "Dinner" | "Snacks",
          "calories": number,
          "proteinG": number,
          "carbsG": number,
          "fatG": number
        }
      ]
    }
  ]
}

The 7 dates must be: ${days.join(", ")}.
Each day must have exactly 4 meals (Breakfast, Lunch, Dinner, Snacks).
The sum of calories per day must be close to ${calorieGoal}.
The sum of proteinG per day MUST be at least ${proteinGoal}g — aim for ${Math.round(proteinGoal / 4)}g+ per meal.
Vary the meals across the week — do not repeat the same meal on consecutive days.
Return only the JSON object.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      res.status(500).json({ error: "Failed to parse weekly meal plan from AI" });
      return;
    }
    const plan = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    res.json(plan);
  } catch (err) {
    console.error("generate-week-plan error:", err);
    res.status(500).json({ error: "Failed to generate weekly meal plan" });
  }
});

router.post("/generate-grocery-list", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const { getActiveSubscription } = await import("../services/subscriptionService");
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    if (!sub.plan.features.aiPhotoAnalysis) {
      res.status(403).json({ error: "Grocery list generation is a Premium feature" });
      return;
    }

    const { meals } = req.body;
    if (!Array.isArray(meals) || meals.length === 0) {
      res.status(400).json({ error: "Meals array is required" });
      return;
    }

    const mealList = meals
      .map((m: any, i: number) => `${i + 1}. ${m.name} — ${m.description || ""}`)
      .join("\n");

    const prompt = `You are a helpful grocery shopping assistant. Given the following meal plan, generate a consolidated grocery list grouped by aisle/category. Combine duplicate ingredients and estimate reasonable quantities for one person.

Meals:
${mealList}

Return EXACTLY a JSON object (no markdown, no extra text) with this structure:
{
  "categories": [
    {
      "name": "string (e.g. Produce, Proteins, Dairy, Grains, Pantry, Frozen, Other)",
      "items": [
        {
          "name": "string (ingredient name)",
          "quantity": "string (e.g. 2 lbs, 1 dozen, 500g)"
        }
      ]
    }
  ]
}

Be practical — combine similar items, use standard grocery quantities, and sort categories logically (Produce first, then Proteins, Dairy, etc.). Return only the JSON object.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      res.status(500).json({ error: "Failed to parse grocery list from AI" });
      return;
    }
    const groceryList = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    res.json(groceryList);
  } catch (err) {
    console.error("generate-grocery-list error:", err);
    res.status(500).json({ error: "Failed to generate grocery list" });
  }
});

export default router;
