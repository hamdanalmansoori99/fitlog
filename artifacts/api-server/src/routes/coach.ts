import { Router } from "express";
import { db, conversations, messages, profilesTable, workoutsTable, equipmentTable, mealsTable, mealFoodItemsTable, recoveryLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

function buildSystemPrompt(profile: any, recentWorkouts: any[], equipment: any[], todayNutrition?: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null, todayRecovery?: { sleepHours?: number | null; sleepQuality?: number | null; energyLevel?: number | null; stressLevel?: number | null; overallFeeling?: number | null; soreness?: Record<string, number> | null } | null): string {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const goals = profile?.fitnessGoals?.length
    ? profile.fitnessGoals.join(", ")
    : "general fitness";

  const gear = equipment.length
    ? equipment.map((e: any) => e.name).join(", ")
    : profile?.availableEquipment?.join(", ") || "no equipment (bodyweight only)";

  const location = profile?.workoutLocation || "home";
  const experience = profile?.experienceLevel || "intermediate";
  const durationPref = profile?.preferredWorkoutDuration || "30–45 minutes";
  const weeklyDays = profile?.weeklyWorkoutDays || 3;
  const trainingPrefs = profile?.trainingPreferences?.join(", ") || "general training";
  const activityLevel = profile?.activityLevel || "moderately active";

  const recentStr = recentWorkouts.length === 0
    ? "No recent workouts logged in the past 30 days."
    : recentWorkouts.slice(0, 10).map((w: any) => {
        const daysAgo = Math.round((Date.now() - new Date(w.date).getTime()) / 86400000);
        return `- ${w.activityType || w.workoutName} (${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}, ${w.durationMinutes} min)`;
      }).join("\n");

  const availableTemplates = `
Available workout templates in FitLog:
• Beginner Full Body Bodyweight (30 min, bodyweight only)
• Calisthenics Fundamentals (35 min, bodyweight only)
• Walking Fat-Loss Plan (45 min, no equipment)
• Core + Mobility (25 min, bodyweight only)
• Jog/Walk Intervals (25 min, no equipment)
• Yoga Recovery Session (30 min, no equipment)
• Jump Rope Cardio Blast (20 min, jump rope)
• Dumbbell Full Body Beginner (40 min, dumbbells)
• Dumbbell Upper Body Strength (45 min, dumbbells)
• Dumbbell Leg Day (40 min, dumbbells)
• Dumbbell HIIT Circuit (30 min, dumbbells)
• Barbell Squat & Deadlift Day (50 min, barbell + rack)
• Barbell Push Day (45 min, barbell + bench)
• Barbell Pull Day (45 min, barbell)
• Upper Body Push (35 min, bodyweight/dumbbell)
• Upper Body Pull (35 min, bodyweight/dumbbell)
• Leg Day Bodyweight (30 min, bodyweight)
• Full Body HIIT (25 min, bodyweight)
• Kettlebell Flow (35 min, kettlebell)
• Resistance Band Full Body (30 min, resistance bands)
• Zone 2 Steady Cardio Run (45 min, outdoor)
• Sprint Interval Training (25 min, outdoor)
• Swim Technique (45 min, pool)
• Boxing / Shadow Boxing (30 min, boxing gloves optional)
• Stretch & Breathwork (20 min, no equipment)`;

  return `You are the AI Coach inside FitLog, a personal fitness app. Your job is to give specific, practical, and personalized fitness advice. You feel like a knowledgeable personal trainer who knows the user well.

Today is ${dayName}, ${dateStr}.

USER PROFILE:
- Goals: ${goals}
- Experience level: ${experience}
- Activity level: ${activityLevel}
- Preferred workout duration: ${durationPref}
- Weekly workout frequency: ${weeklyDays} days/week
- Training preferences: ${trainingPrefs}
- Workout location: ${location}
- Available equipment: ${gear}

RECENT WORKOUT HISTORY (last 30 days):
${recentStr}

TODAY'S NUTRITION:
${todayNutrition
  ? `- Meals logged so far: ${todayNutrition.mealCount}
- Calories: ${Math.round(todayNutrition.calories)} kcal${profile?.dailyCalorieGoal ? ` / ${profile.dailyCalorieGoal} kcal goal` : ""}
- Protein: ${Math.round(todayNutrition.proteinG)}g${profile?.dailyProteinGoal ? ` / ${profile.dailyProteinGoal}g goal` : ""}
- Carbs: ${Math.round(todayNutrition.carbsG)}g  |  Fat: ${Math.round(todayNutrition.fatG)}g`
  : "No meals logged today yet."}

TODAY'S RECOVERY:
${todayRecovery
  ? [
      todayRecovery.sleepHours != null ? `- Sleep: ${todayRecovery.sleepHours}h${todayRecovery.sleepQuality != null ? ` (quality ${todayRecovery.sleepQuality}/5)` : ""}` : null,
      todayRecovery.energyLevel != null ? `- Energy level: ${todayRecovery.energyLevel}/5` : null,
      todayRecovery.stressLevel != null ? `- Stress level: ${todayRecovery.stressLevel}/5` : null,
      todayRecovery.overallFeeling != null ? `- Overall feeling: ${todayRecovery.overallFeeling}/5` : null,
      todayRecovery.soreness && Object.keys(todayRecovery.soreness).length > 0
        ? `- Muscle soreness: ${Object.entries(todayRecovery.soreness).map(([part, val]) => `${part} (${val}/3)`).join(", ")}`
        : null,
    ].filter(Boolean).join("\n") || "No recovery data logged today."
  : "No recovery data logged today."}

${availableTemplates}

COACHING STYLE:
- Be direct and specific. Recommend actual workouts by name, not generic suggestions.
- Use the user's equipment list to filter recommendations — never suggest exercises that require equipment they don't have.
- Reference their recent workout history naturally (e.g. "since you did legs yesterday, hit upper body today").
- If they ask for something time-constrained, match the duration to what's available in FitLog.
- Keep responses concise. Use bullet points or numbered lists when suggesting workouts or exercises.
- For "what should I do today" questions, give ONE clear recommendation with a brief explanation.
- If recommending a template from FitLog, name it exactly as it appears above.
- Sound human, supportive, and knowledgeable — not robotic or overly cheerful.
- Never give generic motivational speeches. Be practical and actionable.
- If you don't know something about the user, make a reasonable assumption based on their profile.

Remember: the user can see and navigate to any of the workout templates named above inside the app.`;
}

router.get("/conversation", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    let conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!conversation) {
      const [created] = await db
        .insert(conversations)
        .values({ userId: user.id, title: "AI Coach" })
        .returning();
      conversation = created;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    res.json({ ...conversation, messages: msgs });
  } catch (err) {
    console.error("getCoachConversation error:", err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversation", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    await db.delete(conversations).where(eq(conversations.userId, user.id));

    const [created] = await db
      .insert(conversations)
      .values({ userId: user.id, title: "AI Coach" })
      .returning();

    res.json({ ...created, messages: [] });
  } catch (err) {
    console.error("clearCoachConversation error:", err);
    res.status(500).json({ error: "Failed to clear conversation" });
  }
});

router.post("/message", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    let conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!conversation) {
      const [created] = await db
        .insert(conversations)
        .values({ userId: user.id, title: "AI Coach" })
        .returning();
      conversation = created;
    }

    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: content.trim(),
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id))
      .limit(1);

    const recentWorkouts = await db
      .select()
      .from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id))
      .orderBy(desc(workoutsTable.date))
      .limit(20);

    const userEquipment = await db
      .select()
      .from(equipmentTable)
      .where(and(eq(equipmentTable.userId, user.id)));

    // Today's nutrition context
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMeals = await db
      .select()
      .from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, todayStart)));

    let todayNutrition: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null = null;
    if (todayMeals.length > 0) {
      const mealIds = todayMeals.map((m) => m.id);
      const allFoodItems = await Promise.all(
        mealIds.map((id) => db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, id)))
      );
      const flatItems = allFoodItems.flat();
      todayNutrition = {
        mealCount: todayMeals.length,
        calories: flatItems.reduce((s, f) => s + f.calories, 0),
        proteinG: flatItems.reduce((s, f) => s + f.proteinG, 0),
        carbsG: flatItems.reduce((s, f) => s + f.carbsG, 0),
        fatG: flatItems.reduce((s, f) => s + f.fatG, 0),
      };
    }

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const recoveryRows = await db
      .select()
      .from(recoveryLogsTable)
      .where(and(
        eq(recoveryLogsTable.userId, user.id),
        gte(recoveryLogsTable.date, todayStart),
        lte(recoveryLogsTable.date, todayEnd),
      ))
      .limit(1);
    const todayRecovery = recoveryRows[0] ?? null;

    const systemPrompt = buildSystemPrompt(profile, recentWorkouts, userEquipment, todayNutrition, todayRecovery);

    const chatMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullResponse = "";

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("sendCoachMessage error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
