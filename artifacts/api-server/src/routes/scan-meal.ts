import { Router } from "express";
import { db, mealsTable, mealFoodItemsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const safeMimeType = validMimeTypes.includes(mimeType) ? mimeType : "image/jpeg";

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
                media_type: safeMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are a nutrition expert. Analyze this meal photo and identify all food items visible.

For each food item, estimate:
- name: common food name in English
- portionSize: numeric portion amount
- portionUnit: unit (g, oz, cup, piece, serving, ml)
- calories: total kcal for this portion
- proteinG: protein in grams
- carbsG: carbohydrates in grams
- fatG: fat in grams

Base your estimates on standard USDA nutritional data and common serving sizes visible in the image.

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
}`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    let parsed: { items: any[]; mealDescription: string };
    try {
      const jsonStr = content.text.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response as JSON");
      parsed = JSON.parse(jsonMatch[0]);
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

    res.json({
      items,
      mealDescription: parsed.mealDescription || "Scanned meal",
      totals: {
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG * 10) / 10,
        carbsG: Math.round(totals.carbsG * 10) / 10,
        fatG: Math.round(totals.fatG * 10) / 10,
      },
    });
  } catch (err) {
    console.error("Scan meal analyze error:", err);
    res.status(500).json({ error: "Failed to analyze meal image" });
  }
});

router.post("/log", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { items, category = "Lunch", name, photoUrl } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required" });
      return;
    }

    const mealName = name || `AI Scanned Meal`;

    const [meal] = await db.insert(mealsTable).values({
      userId: user.id,
      name: mealName,
      category,
      date: new Date(),
      photoUrl: photoUrl || null,
      notes: "Logged via AI meal scanner",
    }).returning();

    await db.insert(mealFoodItemsTable).values(
      items.map((item: any) => ({
        mealId: meal.id,
        name: String(item.name),
        portionSize: Number(item.portionSize) || 100,
        unit: String(item.portionUnit || item.unit || "g"),
        calories: Number(item.calories) || 0,
        proteinG: Number(item.proteinG) || 0,
        carbsG: Number(item.carbsG) || 0,
        fatG: Number(item.fatG) || 0,
      }))
    );

    res.status(201).json({ success: true, mealId: meal.id });
  } catch (err) {
    console.error("Scan meal log error:", err);
    res.status(500).json({ error: "Failed to log scanned meal" });
  }
});

export default router;
