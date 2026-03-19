import { Router } from "express";
import { db, conversationsTable, messagesTable, profilesTable, workoutsTable, workoutExercisesTable, workoutSetsTable, equipmentTable, mealsTable, mealFoodItemsTable, recoveryLogsTable, settingsTable, bodyMeasurementsTable } from "@workspace/db";
import { eq, and, desc, gte, lt, isNotNull } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const conversations = conversationsTable;
const messages = messagesTable;

const router = Router();

// ─── Safety layer ─────────────────────────────────────────────────────────────

const SAFETY_PATTERNS = [
  /chest.{0,10}(pain|tight|pressure|hurt)/i,
  /heart.{0,10}attack/i,
  /can'?t\s+breathe/i,
  /shortness\s+of\s+breath/i,
  /faint(ed|ing)?/i,
  /passed?\s+out/i,
  /blacked?\s+out/i,
  /lost\s+consciousness/i,
  /torn?\s+(muscle|ligament|tendon|acl|mcl|meniscus)/i,
  /can'?t\s+walk/i,
  /can'?t\s+move\s+(my\s+)?(arm|leg|knee|shoulder|back)/i,
  /broken\s+bone/i,
  /fracture/i,
  /dislocat(ed|ion)/i,
  /severe(ly)?\s+injur/i,
  /unbearable\s+pain/i,
  /don'?t\s+eat\s+(anything|at\s+all)/i,
  /stopp?(ed|ing)\s+eating/i,
  /starv(e|ing)\s+(myself|to)/i,
  /purging/i,
  /make\s+myself\s+(sick|vomit)/i,
  /throw(ing)?\s+up\s+(to\s+lose|after\s+(eating|meals?))/i,
  /inject(ing)?\s+(steroids|hgh|testosterone)/i,
  /anabolic\s+steroids/i,
  /buying\s+(steroids|hgh|sarms)/i,
];

function detectSafetyIssue(content: string): string | null {
  for (const pattern of SAFETY_PATTERNS) {
    if (pattern.test(content)) {
      return "What you're describing sounds like something that needs medical attention, not a workout plan. Please speak with a doctor or qualified medical professional before continuing. If you're in immediate distress, contact emergency services. I'm here to help with fitness once you've been cleared.";
    }
  }
  return null;
}

// ─── Recovery type ────────────────────────────────────────────────────────────

type RecoveryData = {
  sleepHours?: number | null;
  sleepQuality?: number | null;
  energyLevel?: number | null;
  stressLevel?: number | null;
  overallFeeling?: number | null;
  soreness?: Record<string, number> | null;
} | null;

// ─── Coach decision summary ───────────────────────────────────────────────────

function buildCoachSummary(
  profile: any,
  recentWorkouts: any[],
  equipment: any[],
  todayRecovery: RecoveryData
): string {
  const gear = equipment.length
    ? equipment.map((e: any) => e.name).join(", ")
    : profile?.availableEquipment?.join(", ") || "none (bodyweight only)";

  let readiness = "moderate";
  if (todayRecovery) {
    const sleep = todayRecovery.sleepHours ?? null;
    const energy = todayRecovery.energyLevel ?? null;
    const stress = todayRecovery.stressLevel ?? null;
    const lowSleep = sleep !== null && sleep < 6;
    const lowEnergy = energy !== null && energy <= 2;
    const highStress = stress !== null && stress >= 4;
    if (lowSleep || lowEnergy || highStress) {
      readiness = "low";
    } else if (
      (sleep === null || sleep >= 7.5) &&
      (energy === null || energy >= 4) &&
      (stress === null || stress <= 2)
    ) {
      readiness = "high";
    }
  }

  const msPerDay = 86400000;
  const last7 = recentWorkouts.filter(
    (w) => (Date.now() - new Date(w.date).getTime()) / msPerDay <= 7
  );
  const last2 = recentWorkouts
    .slice(0, 2)
    .map((w) => w.activityType || w.workoutName || "workout");
  const patternStr =
    last7.length === 0
      ? "no recent workouts"
      : `${last7.length} workout(s) this week — last: ${last2.join(", ")}`;

  return `
COACH DECISION SUMMARY:
- Equipment allowed: ${gear}
- Readiness today: ${readiness}
- Recent training pattern: ${patternStr}
- Instruction: avoid repeating same muscle groups from recent sessions; give one clear specific recommendation; match session intensity to readiness.`;
}

// ─── Gym performance builder ───────────────────────────────────────────────────

async function buildGymPerformanceSummary(userId: number): Promise<string> {
  const gymWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.userId, userId), eq(workoutsTable.activityType, "gym")))
    .orderBy(desc(workoutsTable.date))
    .limit(3);

  if (gymWorkouts.length === 0) return "";

  const lines: string[] = [];
  for (const w of gymWorkouts) {
    const daysAgo = Math.round((Date.now() - new Date(w.date).getTime()) / 86400000);
    const dateLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
    const exRows = await db
      .select()
      .from(workoutExercisesTable)
      .where(eq(workoutExercisesTable.workoutId, w.id))
      .orderBy(workoutExercisesTable.order);

    const exSummaries: string[] = [];
    for (const ex of exRows) {
      const sets = await db
        .select()
        .from(workoutSetsTable)
        .where(and(eq(workoutSetsTable.exerciseId, ex.id), eq(workoutSetsTable.completed, true)))
        .orderBy(workoutSetsTable.order);
      if (sets.length === 0) continue;
      const best = sets.reduce((b, s) => ((s.weightKg ?? 0) * (s.reps ?? 0)) > ((b.weightKg ?? 0) * (b.reps ?? 0)) ? s : b, sets[0]);
      const setStr = sets.map(s => `${s.reps ?? "?"}${s.weightKg ? `×${s.weightKg}kg` : ""}`).join(", ");
      exSummaries.push(`  • ${ex.name}: ${setStr}${best.rpe ? ` @RPE${best.rpe}` : ""}`);
    }
    if (exSummaries.length > 0) {
      lines.push(`${w.name || "Gym"} (${dateLabel}, ${w.durationMinutes ?? "?"}min):`);
      lines.push(...exSummaries);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

// ─── Bodyweight trend ─────────────────────────────────────────────────────────

async function buildBodyweightTrend(userId: number): Promise<string | null> {
  const rows = await db
    .select()
    .from(bodyMeasurementsTable)
    .where(and(eq(bodyMeasurementsTable.userId, userId), isNotNull(bodyMeasurementsTable.weightKg)))
    .orderBy(desc(bodyMeasurementsTable.date))
    .limit(4);

  if (rows.length === 0) return null;

  const ordered = [...rows].reverse();
  const entries = ordered.map((r) => {
    const d = new Date(r.date);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${label}: ${r.weightKg}kg`;
  });

  const newest = rows[0].weightKg!;
  const oldest = ordered[0].weightKg!;
  const delta = newest - oldest;
  const trendStr = delta < -0.5 ? " (trending down)" : delta > 0.5 ? " (trending up)" : " (stable)";

  return entries.join(" → ") + trendStr;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  profile: any,
  recentWorkouts: any[],
  equipment: any[],
  todayNutrition?: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null,
  todayRecovery?: RecoveryData,
  gymPerformance?: string,
  bodyweightTrend?: string | null
): string {
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

  const recentStr =
    recentWorkouts.length === 0
      ? "No recent workouts logged in the past 30 days."
      : recentWorkouts
          .slice(0, 10)
          .map((w: any) => {
            const daysAgo = Math.round(
              (Date.now() - new Date(w.date).getTime()) / 86400000
            );
            return `- ${w.activityType || w.workoutName} (${
              daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`
            }, ${w.durationMinutes} min)`;
          })
          .join("\n");

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

  const coachSummary = buildCoachSummary(
    profile,
    recentWorkouts,
    equipment,
    todayRecovery ?? null
  );

  const gymSection = gymPerformance
    ? `\nRECENT GYM PERFORMANCE (actual sets × reps × weight logged by the user):\n${gymPerformance}\n`
    : "";

  const bodyweightSection = bodyweightTrend
    ? `\nBODYWEIGHT TREND (last 4 logged measurements):\n${bodyweightTrend}\n`
    : "";

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
${
  todayNutrition
    ? `- Meals logged so far: ${todayNutrition.mealCount}
- Calories: ${Math.round(todayNutrition.calories)} kcal${profile?.dailyCalorieGoal ? ` / ${profile.dailyCalorieGoal} kcal goal` : ""}
- Protein: ${Math.round(todayNutrition.proteinG)}g${profile?.dailyProteinGoal ? ` / ${profile.dailyProteinGoal}g goal` : ""}
- Carbs: ${Math.round(todayNutrition.carbsG)}g  |  Fat: ${Math.round(todayNutrition.fatG)}g`
    : "No meals logged today yet."
}

TODAY'S RECOVERY:
${
  todayRecovery
    ? [
        todayRecovery.sleepHours != null
          ? `- Sleep: ${todayRecovery.sleepHours}h${todayRecovery.sleepQuality != null ? ` (quality ${todayRecovery.sleepQuality}/5)` : ""}`
          : null,
        todayRecovery.energyLevel != null
          ? `- Energy level: ${todayRecovery.energyLevel}/5`
          : null,
        todayRecovery.stressLevel != null
          ? `- Stress level: ${todayRecovery.stressLevel}/5`
          : null,
        todayRecovery.overallFeeling != null
          ? `- Overall feeling: ${todayRecovery.overallFeeling}/5`
          : null,
        todayRecovery.soreness && Object.keys(todayRecovery.soreness).length > 0
          ? `- Muscle soreness: ${Object.entries(todayRecovery.soreness)
              .map(([part, val]) => `${part} (${val}/3)`)
              .join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n") || "No recovery data logged today."
    : "No recovery data logged today."
}

${gymSection}${bodyweightSection}
${availableTemplates}

COACHING STYLE:
- Be decisive. For "what should I do today" give ONE best recommendation — not a list of options.
- Never suggest exercises or equipment the user does not have available.
- Reference recent workout history to avoid repeating the same muscle groups back to back.
- When the user asks about their gym performance, reference exact numbers from RECENT GYM PERFORMANCE above.
- When recommending progression, compare to the actual last session numbers (e.g. "last time you did 3×8@80kg, try 3×8@82.5kg today").
- If readiness is low (poor sleep, low energy, high stress), recommend a lighter or recovery-focused session — say why briefly.
- Name FitLog templates exactly as listed above when recommending one.
- Be calm, confident, and practical — like a trainer who already knows the plan.
- No long motivational speeches. No filler sentences. Get to the point.

DECISIVENESS RULES (non-negotiable):
- NEVER open with filler phrases: "Great question!", "Of course!", "Absolutely!", "Sure!", "Happy to help!", "That's a great goal!", "I love that you're tracking this", "Fantastic!", or any variation.
- Lead EVERY response with a specific number from the user's data above — workouts completed, calories, protein grams, weight trend, days since last session, adherence percentage. If no data exists, start with the recommended action directly.
- Default to the fewest possible sentences. Most responses: 3–6 sentences. Only elaborate when the user explicitly asks for detail or a full program.
- One recommendation per response. Do not hedge with alternatives unless asked.

QUICK-ACTION CHIP GUIDANCE:
When the user sends one of these common prompts, respond exactly as described:
- "What should I do today?" — Open with workouts done vs. weekly goal (e.g. "You've hit 1 of 3 workouts this week."), then name one specific template and why.
- "How did I do this week?" — Open with workouts completed vs. target as a fraction and percentage (e.g. "3 of 4 workouts done — 75% adherence."), then one sentence on the key pattern and one on next focus.
- "I missed a workout" — Open with current weekly count vs. goal, then give one concrete recovery plan (reschedule or move on, not both).
- "I'm not progressing" — Open with a specific exercise number from GYM PERFORMANCE (e.g. "Your bench has been at 80kg for 3 sessions."), then diagnose the most likely cause in one sentence and give one fix.
- "Adjust my calories" — Open with today's numbers vs. goal (e.g. "You've had 1,850 kcal and 140g protein today against a 2,200 kcal / 180g target."), then give one specific adjustment.
- "Quick home workout" — Open with one number (e.g. "You have 30 minutes and bodyweight only." or the matching equipment fit), then go directly to workout name, exercises, sets, reps. No preamble.

RESPONSE RULES:
- Simple questions (tips, advice, motivation): 2–5 short paragraphs max.
- Workout recommendations must always include:
  1. Workout name
  2. Exercise list with sets, reps, and rest periods
  3. One sentence on progression (what to do differently next session)
- Never provide more than one workout option unless the user explicitly asks for alternatives.
- Keep answers mobile-readable: short sentences, blank lines between sections.

FORMATTING RULES (very important):
- Write in plain conversational text only. No markdown of any kind.
- Never use asterisks for bold (**), italic (*), or separators (***).
- Never use hash symbols (#) for headings.
- Use numbered lists (1. 2. 3.) or dashes (- item) for lists.
- Use blank lines between paragraphs for readability.
- Do not wrap text in backticks or code blocks.
- If you don't know something about the user, make a reasonable assumption based on their profile.

Remember: the user can see and navigate to any of the workout templates listed above inside the app.
${coachSummary}`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

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

    // Return only the most recent 50 messages for the UI.
    // DESC + limit, then reversed so the client receives them in
    // chronological (oldest-first) order without loading thousands of rows.
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(50)
      .then((rows) => rows.reverse());

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

    // Safety check — bypass AI entirely if triggered
    const safetyResponse = detectSafetyIssue(content.trim());

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

    // Save user message
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: content.trim(),
    });

    if (safetyResponse) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        role: "assistant",
        content: safetyResponse,
      });
      res.json({ content: safetyResponse });
      return;
    }

    // Load the last 12 messages at the DB level — DESC + reverse avoids
    // fetching thousands of rows and slicing in memory.
    const trimmedHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(12)
      .then((rows) => rows.reverse());

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

    let todayNutrition: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      mealCount: number;
    } | null = null;
    if (todayMeals.length > 0) {
      const mealIds = todayMeals.map((m) => m.id);
      const allFoodItems = await Promise.all(
        mealIds.map((id) =>
          db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, id))
        )
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
      .where(
        and(
          eq(recoveryLogsTable.userId, user.id),
          gte(recoveryLogsTable.date, todayStart),
          lt(recoveryLogsTable.date, todayEnd)
        )
      )
      .limit(1);
    const todayRecovery = recoveryRows[0] ?? null;

    const gymPerformance = await buildGymPerformanceSummary(user.id);
    const bodyweightTrend = await buildBodyweightTrend(user.id);

    let systemPrompt = buildSystemPrompt(
      profile,
      recentWorkouts,
      userEquipment,
      todayNutrition,
      todayRecovery,
      gymPerformance || undefined,
      bodyweightTrend
    );

    const [userSettings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, user.id))
      .limit(1);
    if (userSettings?.language === "ar") {
      systemPrompt +=
        "\n\nLANGUAGE: You MUST respond entirely in Arabic (العربية). All text, recommendations, template names, and coaching advice must be in Arabic. Use Arabic numerals for numbers.";
    }

    const chatMessages = trimmedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
    });

    const fullResponse =
      (aiResponse.content[0] as any)?.text?.trim() ||
      "I'm having trouble generating a useful response. Try asking with your goal, equipment, and time available.";

    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: fullResponse,
    });

    res.json({ content: fullResponse });
  } catch (err) {
    console.error("sendCoachMessage error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── Proactive opening message ────────────────────────────────────────────────

router.post("/proactive", requireAuth, async (req, res) => {
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

    // If the conversation already has messages, skip — not empty anymore
    const existing = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .limit(1);
    if (existing.length > 0) {
      res.status(204).end();
      return;
    }

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
      .where(eq(equipmentTable.userId, user.id));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMeals = await db
      .select()
      .from(mealsTable)
      .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, todayStart)));

    let todayNutrition: { calories: number; proteinG: number; carbsG: number; fatG: number; mealCount: number } | null = null;
    if (todayMeals.length > 0) {
      const allFoodItems = await Promise.all(
        todayMeals.map((m) => db.select().from(mealFoodItemsTable).where(eq(mealFoodItemsTable.mealId, m.id)))
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
      .where(and(eq(recoveryLogsTable.userId, user.id), gte(recoveryLogsTable.date, todayStart), lt(recoveryLogsTable.date, todayEnd)))
      .limit(1);
    const todayRecovery = recoveryRows[0] ?? null;

    const [gymPerformance, bodyweightTrend] = await Promise.all([
      buildGymPerformanceSummary(user.id),
      buildBodyweightTrend(user.id),
    ]);

    let systemPrompt = buildSystemPrompt(
      profile,
      recentWorkouts,
      userEquipment,
      todayNutrition,
      todayRecovery,
      gymPerformance || undefined,
      bodyweightTrend
    );

    const [userSettings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, user.id))
      .limit(1);
    if (userSettings?.language === "ar") {
      systemPrompt +=
        "\n\nLANGUAGE: You MUST respond entirely in Arabic (العربية). All text, recommendations, template names, and coaching advice must be in Arabic. Use Arabic numerals for numbers.";
    }

    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const proactivePrompt = `Today is ${dayName}. Give me my opening brief — exactly 1 to 2 sentences. Lead with the single most important number from my data (workouts this week vs. goal, today's protein vs. target, days since last session, bodyweight trend, or weekly adherence %). End with one concrete action I should take right now. No greeting, no preamble, no sign-off. If there is no data to reference, say: "Log your first workout today — it's the only data point that matters right now."`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: proactivePrompt }],
    });

    const content =
      (aiResponse.content[0] as any)?.text?.trim() ||
      "Log your first workout today — it's the only data point that matters right now.";

    // Save ONLY the assistant message — no user message stored
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content,
    });

    res.json({ content });
  } catch (err) {
    console.error("proactiveCoachMessage error:", err);
    res.status(500).json({ error: "Failed to generate proactive message" });
  }
});

export default router;
