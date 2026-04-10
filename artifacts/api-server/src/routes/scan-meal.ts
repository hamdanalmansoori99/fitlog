import { Router } from "express";
import { db, mealsTable, mealFoodItemsTable, analyticsEventsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { visionCompletion, isAIConfigured } from "../lib/aiProvider";
import { logError } from "../lib/logger";
import { getActiveSubscription } from "../services/subscriptionService";

/** Count how many AI scans the user has performed today (UTC day boundary). */
async function getTodayScanCount(userId: number): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.userId, userId),
        eq(analyticsEventsTable.eventType, "meal_scan"),
        gte(analyticsEventsTable.createdAt, todayStart)
      )
    );

  return rows[0]?.count ?? 0;
}

/** Record that a scan was performed (regardless of whether the meal is logged). */
async function recordScan(userId: number): Promise<void> {
  await db.insert(analyticsEventsTable).values({
    userId,
    eventType: "meal_scan",
    properties: {},
  });
}

const router = Router();

/** GET /scan-meal/status — returns remaining scans for today */
router.get("/status", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const sub = await getActiveSubscription(user.id, user.role);
    const limit = sub.plan.limits.scansPerDay;
    const used = await getTodayScanCount(user.id);
    const remaining = limit === Infinity ? -1 : Math.max(0, limit - used);

    res.json({
      scansUsedToday: used,
      scansPerDay: limit === Infinity ? -1 : limit,
      remainingScans: remaining,
      isUnlimited: limit === Infinity,
    });
  } catch (err) {
    logError("Scan status error:", err);
    res.status(500).json({ error: "Failed to get scan status" });
  }
});

router.post("/analyze", requireAuth, async (req, res) => {
  try {
    if (!isAIConfigured()) {
      res.status(503).json({ error: "AI features require an API key. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY." });
      return;
    }

    const user = getUser(req);

    // ── Scan limit check ──
    const sub = await getActiveSubscription(user.id, user.role);
    const limit = sub.plan.limits.scansPerDay;
    if (limit !== Infinity) {
      const used = await getTodayScanCount(user.id);
      if (used >= limit) {
        res.status(429).json({
          error: "Daily scan limit reached. Upgrade to Premium for unlimited scans.",
          scansUsedToday: used,
          scansPerDay: limit,
          remainingScans: 0,
        });
        return;
      }
    }

    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const safeMimeType = validMimeTypes.includes(mimeType) ? mimeType : "image/jpeg";

    const ANALYZE_TIMEOUT_MS = 45000;

    const mealPrompt = `You are a certified sports nutritionist. Analyze this meal photo carefully and accurately.

ANALYSIS STRATEGY:
1. First identify the MAIN / CENTRAL food item in the image
2. Then identify side dishes, sauces, beverages, and garnishes
3. For each item, estimate portion size using the visual cues below
4. Cross-reference all nutrition values against USDA FoodData Central

PORTION ESTIMATION GUIDELINES:
- A standard dinner plate is ~25 cm (10 in) diameter — use it as a size reference
- A palm-sized portion of meat/fish is ~100-120 g
- A cupped hand of grains, rice, or pasta is ~100 g cooked
- A closed fist is ~1 cup (~240 ml) of liquid or ~150 g of chopped vegetables
- A thumb tip is ~1 tsp (~5 g) of oil/butter
- A thumb length is ~1 tbsp (~15 g)
- A deck of cards is ~85 g of meat

ACCURACY RULES:
- Prioritise accuracy over speed
- When uncertain about a portion size, estimate conservatively (round DOWN)
- Use USDA nutritional data as the primary reference for macros per 100 g
- Calories must equal approximately: (proteinG × 4) + (carbsG × 4) + (fatG × 9)
- Do NOT inflate protein or deflate fat — be honest and evidence-based

For each food item, provide:
- name: common food name in English
- portionSize: numeric portion amount
- portionUnit: unit (g, oz, cup, piece, serving, ml)
- calories: total kcal for this portion
- proteinG: protein in grams
- carbsG: carbohydrates in grams
- fatG: fat in grams

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "items": [
    {
      "name": "Food Name",
      "portionSize": 150,
      "portionUnit": "g",
      "calories": 250,
      "proteinG": 20,
      "carbsG": 30,
      "fatG": 8
    }
  ],
  "mealDescription": "Brief description of the meal"
}`;

    const analysisPromise = visionCompletion({
      prompt: mealPrompt,
      imageBase64,
      mimeType: safeMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      maxTokens: 1024,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("ANALYZE_TIMEOUT")), ANALYZE_TIMEOUT_MS)
    );

    const responseText = await Promise.race([analysisPromise, timeoutPromise]);

    let parsed: { items: any[]; mealDescription: string };
    try {
      const jsonStr = responseText.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response as JSON");
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    const items = (parsed.items || []).map((item: any) => ({
      name: String(item.name || "Unknown food"),
      portionSize: Number(item.portionSize) || 100,
      portionUnit: String(item.portionUnit || "g"),
      calories: Math.round(Number(item.calories) || 0),
      proteinG: Math.round((Number(item.proteinG) || 0) * 10) / 10,
      carbsG: Math.round((Number(item.carbsG) || 0) * 10) / 10,
      fatG: Math.round((Number(item.fatG) || 0) * 10) / 10,
    }));

    const totals = items.reduce(
      (acc: any, item: any) => ({
        calories: acc.calories + item.calories,
        proteinG: acc.proteinG + item.proteinG,
        carbsG: acc.carbsG + item.carbsG,
        fatG: acc.fatG + item.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    // Record the scan so it counts whether or not the user logs the meal
    await recordScan(user.id);

    // Compute remaining scans for the response
    const usedAfter = limit === Infinity ? 0 : (await getTodayScanCount(user.id));
    const remainingScans = limit === Infinity ? -1 : Math.max(0, limit - usedAfter);

    res.json({
      items,
      mealDescription: parsed.mealDescription || "Scanned meal",
      totals: {
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG * 10) / 10,
        carbsG: Math.round(totals.carbsG * 10) / 10,
        fatG: Math.round(totals.fatG * 10) / 10,
      },
      scansPerDay: limit === Infinity ? -1 : limit,
      remainingScans,
    });
  } catch (err: any) {
    logError("Scan meal analyze error:", err);
    if (err?.message === "ANALYZE_TIMEOUT") {
      res.status(504).json({ error: "Analysis timed out" });
    } else {
      res.status(500).json({ error: "Failed to analyze meal image" });
    }
  }
});

router.post("/log", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { items, category = "Lunch", name, photoUrl } = req.body;

    const allowedCategories = ["Breakfast", "Lunch", "Dinner", "Snacks"];
    if (category && !allowedCategories.includes(category)) {
      res.status(400).json({ error: `Invalid category. Must be one of: ${allowedCategories.join(", ")}` });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required" });
      return;
    }

    const mealName = name || `AI Scanned Meal`;

    const meal = await db.transaction(async (tx: typeof db) => {
      const [m] = await tx.insert(mealsTable).values({
        userId: user.id,
        name: mealName,
        category,
        date: new Date(),
        photoUrl: photoUrl || null,
        notes: "Logged via AI meal scanner",
      }).returning();

      await tx.insert(mealFoodItemsTable).values(
        items.map((item: any) => ({
          mealId: m.id,
          name: String(item.name),
          portionSize: Number(item.portionSize) || 100,
          unit: String(item.portionUnit || item.unit || "g"),
          calories: Number(item.calories) || 0,
          proteinG: Number(item.proteinG) || 0,
          carbsG: Number(item.carbsG) || 0,
          fatG: Number(item.fatG) || 0,
        }))
      );

      return m;
    });

    res.status(201).json({ success: true, mealId: meal.id });
  } catch (err) {
    logError("Scan meal log error:", err);
    res.status(500).json({ error: "Failed to log scanned meal" });
  }
});

export default router;
