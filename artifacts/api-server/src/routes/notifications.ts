import { Router } from "express";
import {
  db,
  workoutsTable,
  mealsTable,
  mealFoodItemsTable,
  waterLogsTable,
  profilesTable,
  recoveryLogsTable,
  settingsTable,
  usersTable,
  notificationPreferencesTable,
} from "@workspace/db";
import { eq, and, gte, lt, lte, desc, inArray, sql, isNull } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import type { Profile } from "@workspace/db";
import { logError } from "../lib/logger";
import { computeCurrentStreak } from "../lib/streaks";

const router = Router();

/** Day-label to JS day-of-week mapping (0=Sun … 6=Sat). */
const DAY_LABEL_TO_DOW: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/** Extract rest-day numbers from a savedWeeklyPlan, or undefined if unavailable. */
function getRestDaysFromPlan(plan: any): number[] | undefined {
  if (!Array.isArray(plan) || plan.length !== 7) return undefined;
  const rest: number[] = [];
  for (const entry of plan) {
    if (entry?.rest && typeof entry.day === "string") {
      const dow = DAY_LABEL_TO_DOW[entry.day.toLowerCase()];
      if (dow !== undefined) rest.push(dow);
    }
  }
  return rest.length > 0 ? rest : undefined;
}

type NotifType = "workout" | "meal" | "hydration" | "streak" | "recovery" | "weekly";

// Locale-keyed streak milestone narratives
const STREAK_MILESTONES: { day: number; en: string; ar: string }[] = [
  { day: 1,   en: "The spark is lit.", ar: "اشتعلت الشرارة." },
  { day: 2,   en: "Back again. This is how legends start.", ar: "عدت مجددًا. هكذا تبدأ الأساطير." },
  { day: 3,   en: "Three in a row. Your body is starting to remember.", ar: "ثلاثة أيام متتالية. جسمك بدأ يتذكر." },
  { day: 5,   en: "Five days strong. The habit is forming.", ar: "خمسة أيام بقوة. العادة بدأت تتشكل." },
  { day: 7,   en: "One full week. The Forge has claimed you.", ar: "أسبوع كامل. الحدادة طالبت بك." },
  { day: 10,  en: "Double digits. You're not stopping.", ar: "رقم مزدوج. لن تتوقف." },
  { day: 14,  en: "Two weeks forged. Others are still deciding to start.", ar: "أسبوعان مصقولان. الآخرون ما زالوا يقررون البدء." },
  { day: 21,  en: "21 days. Science says this is a habit now. You're different.", ar: "٢١ يومًا. العلم يقول هذه عادة الآن. أنت مختلف." },
  { day: 30,  en: "A full month. Molten Apprentice energy.", ar: "شهر كامل. طاقة المتدرب المنصهر." },
  { day: 45,  en: "45 days. The grind is second nature.", ar: "٤٥ يومًا. الكد أصبح طبيعة ثانية." },
  { day: 60,  en: "Two months. Most people quit by week 2. You're not most people.", ar: "شهران. أغلب الناس يستسلمون في الأسبوع الثاني. أنت لست أغلب الناس." },
  { day: 90,  en: "90 days. Elite territory.", ar: "٩٠ يومًا. منطقة النخبة." },
  { day: 100, en: "100 days. You've entered rare air. The Void beckons.", ar: "١٠٠ يوم. دخلت أجواء نادرة. الفراغ ينادي." },
  { day: 180, en: "Half a year. The realm has noticed.", ar: "نصف سنة. المملكة لاحظت." },
  { day: 365, en: "One year. The Infinite watches and nods.", ar: "سنة كاملة. اللامتناهي يراقب ويومئ." },
];

function getStreakNarrativeMessage(days: number, locale: string): string {
  const lang = locale === "ar" ? "ar" : "en";
  if (days <= 0) return lang === "ar" ? "ابدأ سلسلتك اليوم." : "Start your streak today.";
  let best = STREAK_MILESTONES[0];
  for (const m of STREAK_MILESTONES) {
    if (days >= m.day) best = m;
    else break;
  }
  return best[lang];
}

// Notification message templates keyed by locale
const NOTIF_MESSAGES = {
  en: {
    streakAtRiskTitle: (streak: number) => `🔥 ${streak}-day streak at risk!`,
    streakAtRiskBody: (narrative: string) => `${narrative} Log a workout to keep it alive.`,
    streakStartTitle: "Start your streak today",
    morningNudgeTitle: "Ready to train today?",
    morningNudgeBody: (duration: string) => `A ${duration} session is all it takes — let's get moving!`,
    restDayTitle: "Rest day — you've earned it",
    restDayBody: "Recovery is when your muscles grow. Stay hydrated and get good sleep tonight.",
    proteinCloseTitle: "Almost at your protein goal!",
    proteinCloseBody: (remaining: number) => `Just ${remaining}g of protein left for today — almost there!`,
    noMealsTitle: "No meals logged yet",
    noMealsBody: "Keep your nutrition on track — log your first meal of the day.",
    restAfterConsecutiveTitle: (days: number) => `${days} days in a row — consider a rest day`,
    restAfterConsecutiveBodyLow: "Your energy is low today. Active recovery or rest could help you come back stronger.",
    restAfterConsecutiveBody: "You've been on a roll! A rest day now helps your muscles rebuild and grow.",
    noWaterTitle: "Stay hydrated!",
    noWaterBody: "You haven't logged any water yet today. Start sipping!",
    halfwayWaterTitle: "Halfway to your water goal",
    halfwayWaterBody: (current: string, target: string) => `${current}L / ${target}L — keep drinking to hit your daily target!`,
    weeklyGoalSmashedTitle: "Weekly goal smashed! 🎉",
    weeklyGoalSmashedBody: (goal: number) => `You've hit your ${goal} workout/week target. Incredible work!`,
    weeklyProgressTitle: (done: number, goal: number) => `${done}/${goal} workouts this week`,
    weeklyProgressBodyZero: "This week is wide open — let's get your first session in!",
    weeklyProgressBodyOne: "Just 1 more workout to hit your weekly goal!",
    weeklyProgressBody: (left: number) => `${left} more workouts to reach your weekly goal.`,
    smartContentError: "Failed to get smart notification content",
  },
  ar: {
    streakAtRiskTitle: (streak: number) => `🔥 سلسلة ${streak} يوم في خطر!`,
    streakAtRiskBody: (narrative: string) => `${narrative} سجّل تمرينًا للحفاظ عليها.`,
    streakStartTitle: "ابدأ سلسلتك اليوم",
    morningNudgeTitle: "مستعد للتمرين اليوم؟",
    morningNudgeBody: (duration: string) => `جلسة ${duration} كافية — هيا ننطلق!`,
    restDayTitle: "يوم راحة — أنت تستحقه",
    restDayBody: "التعافي هو وقت نمو عضلاتك. حافظ على ترطيبك ونم جيدًا الليلة.",
    proteinCloseTitle: "قاربت على هدف البروتين!",
    proteinCloseBody: (remaining: number) => `بقي ${remaining} غرام بروتين فقط لليوم — تقريبًا وصلت!`,
    noMealsTitle: "لم تسجّل وجبات بعد",
    noMealsBody: "حافظ على تتبع تغذيتك — سجّل أول وجبة لليوم.",
    restAfterConsecutiveTitle: (days: number) => `${days} أيام متتالية — فكّر بيوم راحة`,
    restAfterConsecutiveBodyLow: "طاقتك منخفضة اليوم. التعافي النشط أو الراحة يساعدانك على العودة أقوى.",
    restAfterConsecutiveBody: "أداؤك رائع! يوم راحة الآن يساعد عضلاتك على إعادة البناء والنمو.",
    noWaterTitle: "حافظ على ترطيبك!",
    noWaterBody: "لم تسجّل أي ماء اليوم. ابدأ بالشرب!",
    halfwayWaterTitle: "نصف الطريق نحو هدف الماء",
    halfwayWaterBody: (current: string, target: string) => `${current} لتر / ${target} لتر — واصل الشرب لتحقيق هدفك اليومي!`,
    weeklyGoalSmashedTitle: "حققت هدف الأسبوع! 🎉",
    weeklyGoalSmashedBody: (goal: number) => `حققت هدف ${goal} تمارين/أسبوع. عمل مذهل!`,
    weeklyProgressTitle: (done: number, goal: number) => `${done}/${goal} تمارين هذا الأسبوع`,
    weeklyProgressBodyZero: "الأسبوع مفتوح — هيا نبدأ أول جلسة!",
    weeklyProgressBodyOne: "تمرين واحد آخر فقط لتحقيق هدفك الأسبوعي!",
    weeklyProgressBody: (left: number) => `${left} تمارين أخرى لتحقيق هدفك الأسبوعي.`,
    smartContentError: "فشل في الحصول على محتوى الإشعارات الذكية",
  },
} as const;

type Locale = "en" | "ar";
function getMessages(locale: string) {
  return NOTIF_MESSAGES[locale === "ar" ? "ar" : "en"];
}

interface SmartMessage {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  priority: number;
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

router.get("/smart-content", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);
    const weekStart = getWeekStart();

    const [
      workoutsToday,
      mealsToday,
      waterToday,
      profileRows,
      recentWorkouts,
      weeklyWorkouts,
      recoveryToday,
      settingsRows,
    ] = await Promise.all([
      db
        .select({ id: workoutsTable.id })
        .from(workoutsTable)
        .where(
          and(
            eq(workoutsTable.userId, user.id),
            gte(workoutsTable.date, todayStart),
            lt(workoutsTable.date, todayEnd)
          )
        ),
      db
        .select({ id: mealsTable.id })
        .from(mealsTable)
        .where(
          and(
            eq(mealsTable.userId, user.id),
            gte(mealsTable.date, todayStart),
            lt(mealsTable.date, todayEnd)
          )
        ),
      db
        .select({ amountMl: waterLogsTable.amountMl })
        .from(waterLogsTable)
        .where(
          and(
            eq(waterLogsTable.userId, user.id),
            gte(waterLogsTable.loggedAt, todayStart),
            lt(waterLogsTable.loggedAt, todayEnd)
          )
        ),
      db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, user.id))
        .limit(1),
      db
        .select({ date: workoutsTable.date })
        .from(workoutsTable)
        .where(eq(workoutsTable.userId, user.id))
        .orderBy(desc(workoutsTable.date))
        .limit(14),
      db
        .select({ id: workoutsTable.id })
        .from(workoutsTable)
        .where(
          and(
            eq(workoutsTable.userId, user.id),
            gte(workoutsTable.date, weekStart)
          )
        ),
      db
        .select({
          sleepHours: recoveryLogsTable.sleepHours,
          energyLevel: recoveryLogsTable.energyLevel,
          soreness: recoveryLogsTable.soreness,
        })
        .from(recoveryLogsTable)
        .where(
          and(
            eq(recoveryLogsTable.userId, user.id),
            gte(recoveryLogsTable.date, todayStart),
            lt(recoveryLogsTable.date, todayEnd)
          )
        )
        .limit(1),
      db
        .select({ language: settingsTable.language })
        .from(settingsTable)
        .where(eq(settingsTable.userId, user.id))
        .limit(1),
    ]);

    const locale = settingsRows[0]?.language ?? "en";
    const msg = getMessages(locale);
    const profile: Profile | undefined = profileRows[0];
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const workoutsTodayCount = workoutsToday.length;
    const mealsTodayCount = mealsToday.length;
    const waterTotalMl = waterToday.reduce((s, l) => s + (l.amountMl ?? 0), 0);
    const weeklyGoal = profile?.weeklyWorkoutDays ?? 3;
    const weeklyDone = weeklyWorkouts.length;
    const proteinGoal = profile?.dailyProteinGoal ?? 0;
    const waterGoalMl = profile?.dailyWaterGoalMl ?? 2000;
    const preferredDuration = profile?.preferredWorkoutDuration ?? "30 minutes";

    let proteinToday = 0;
    if (mealsTodayCount > 0) {
      const mealIds = mealsToday.map((m) => m.id);
      const foodItems = await db
        .select({ proteinG: mealFoodItemsTable.proteinG })
        .from(mealFoodItemsTable)
        .where(inArray(mealFoodItemsTable.mealId, mealIds));
      proteinToday = foodItems.reduce((s, f) => s + (f.proteinG ?? 0), 0);
    }

    const recentDates = recentWorkouts.map((w) => new Date(w.date));
    const restDays = getRestDaysFromPlan(profile?.savedWeeklyPlan);
    const isRestDay = restDays?.includes(dayOfWeek) ?? false;
    const streak = computeCurrentStreak(recentDates, restDays);
    const consecutiveDays = streak;

    const candidates: SmartMessage[] = [];

    if (streak > 1 && workoutsTodayCount === 0 && hour >= 16 && !isRestDay) {
      candidates.push({
        id: "streak:at-risk",
        type: "streak",
        priority: streak >= 7 ? 0 : 1,
        title: msg.streakAtRiskTitle(streak),
        body: msg.streakAtRiskBody(getStreakNarrativeMessage(streak, locale)),
      });
    }

    if (streak === 0 && workoutsTodayCount === 0 && hour >= 16 && hour <= 22 && !isRestDay) {
      candidates.push({
        id: "streak:start",
        type: "streak",
        priority: 3,
        title: msg.streakStartTitle,
        body: getStreakNarrativeMessage(0, locale),
      });
    }

    if (workoutsTodayCount === 0 && hour >= 6 && hour <= 14 && !isRestDay) {
      candidates.push({
        id: "workout:morning-nudge",
        type: "workout",
        priority: 2,
        title: msg.morningNudgeTitle,
        body: msg.morningNudgeBody(preferredDuration),
      });
    }

    if (isRestDay && workoutsTodayCount === 0) {
      candidates.push({
        id: "rest:scheduled",
        type: "recovery",
        priority: 3,
        title: msg.restDayTitle,
        body: msg.restDayBody,
      });
    }

    if (proteinGoal > 0 && mealsTodayCount > 0) {
      const remaining = proteinGoal - proteinToday;
      if (remaining > 0 && remaining <= 25) {
        candidates.push({
          id: "meal:protein-close",
          type: "meal",
          priority: 2,
          title: msg.proteinCloseTitle,
          body: msg.proteinCloseBody(Math.round(remaining)),
        });
      }
    }

    if (mealsTodayCount === 0 && hour >= 11 && hour <= 20) {
      candidates.push({
        id: "meal:no-meals",
        type: "meal",
        priority: 3,
        title: msg.noMealsTitle,
        body: msg.noMealsBody,
      });
    }

    if (consecutiveDays >= 3 && workoutsTodayCount === 0) {
      const rec = recoveryToday[0];
      const lowEnergy = rec && rec.energyLevel !== null && (rec.energyLevel ?? 5) <= 2;
      candidates.push({
        id: "recovery:rest-day",
        type: "recovery",
        priority: 2,
        title: msg.restAfterConsecutiveTitle(consecutiveDays),
        body: lowEnergy ? msg.restAfterConsecutiveBodyLow : msg.restAfterConsecutiveBody,
      });
    }

    if (hour >= 12 && hour <= 20) {
      if (waterTotalMl === 0) {
        candidates.push({
          id: "hydration:none",
          type: "hydration",
          priority: 4,
          title: msg.noWaterTitle,
          body: msg.noWaterBody,
        });
      } else if (waterGoalMl > 0 && waterTotalMl < waterGoalMl * 0.5) {
        const current = (Math.round((waterTotalMl / 1000) * 10) / 10).toString();
        const target = (waterGoalMl / 1000).toFixed(1);
        candidates.push({
          id: "hydration:low",
          type: "hydration",
          priority: 5,
          title: msg.halfwayWaterTitle,
          body: msg.halfwayWaterBody(current, target),
        });
      }
    }

    if ((dayOfWeek === 0 || dayOfWeek === 1) && hour >= 8 && hour <= 20) {
      if (weeklyDone >= weeklyGoal) {
        candidates.push({
          id: "weekly:smashed",
          type: "weekly",
          priority: 1,
          title: msg.weeklyGoalSmashedTitle,
          body: msg.weeklyGoalSmashedBody(weeklyGoal),
        });
      } else {
        const left = weeklyGoal - weeklyDone;
        candidates.push({
          id: "weekly:progress",
          type: "weekly",
          priority: dayOfWeek === 0 ? 2 : 4,
          title: msg.weeklyProgressTitle(weeklyDone, weeklyGoal),
          body:
            weeklyDone === 0
              ? msg.weeklyProgressBodyZero
              : left === 1
              ? msg.weeklyProgressBodyOne
              : msg.weeklyProgressBody(left),
        });
      }
    }

    const messages = candidates
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map(({ id, type, title, body }) => ({ id, type, title, body }));

    res.json({ messages });
  } catch (err) {
    logError("smart-content error:", err);
    res.status(500).json({ error: "Failed to get smart notification content" }); // Error messages stay in English for server logs
  }
});

// GET /notifications/preferred-time — compute user's preferred workout time from history
router.get("/preferred-time", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    // Analyze workout timestamps from last 30 days to compute usual workout hour
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const workouts = await db.select({ date: workoutsTable.date }).from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, since)))
      .orderBy(desc(workoutsTable.date))
      .limit(20);

    if (workouts.length < 3) {
      res.json({ preferredTime: null, confidence: "low", sampleSize: workouts.length });
      return;
    }

    // Count workout hours
    const hourCounts = new Map<number, number>();
    for (const w of workouts) {
      const hour = new Date(w.date).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }

    // Find the most common hour
    let bestHour = 18; // default to 6pm
    let bestCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > bestCount) {
        bestHour = hour;
        bestCount = count;
      }
    }

    const confidence = bestCount >= workouts.length * 0.5 ? "high" : bestCount >= 3 ? "medium" : "low";
    const preferredTime = `${bestHour.toString().padStart(2, "0")}:00`;

    // Save to notification preferences
    const [existing] = await db.select().from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, user.id)).limit(1);

    if (existing) {
      await db.update(notificationPreferencesTable)
        .set({ preferredWorkoutTime: preferredTime, updatedAt: new Date() })
        .where(eq(notificationPreferencesTable.id, existing.id));
    } else {
      await db.insert(notificationPreferencesTable).values({
        userId: user.id,
        preferredWorkoutTime: preferredTime,
      });
    }

    // Reminder time = 30 min before preferred time
    const reminderHour = bestHour === 0 ? 23 : bestHour - 1;
    const reminderTime = `${reminderHour.toString().padStart(2, "0")}:30`;

    res.json({ preferredTime, reminderTime, confidence, sampleSize: workouts.length });
  } catch (err) {
    logError("preferred-time error:", err);
    res.status(500).json({ error: "Failed to compute preferred time" });
  }
});

// POST /notifications/reengagement — trigger re-engagement check (admin/cron only)
router.post("/reengagement", async (req, res) => {
  try {
    // Require cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers["x-cron-secret"] !== cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find users inactive for 5+ days who haven't received a re-engagement notification in last 30 days
    const lapsedUsers = await db.execute(sql`
      SELECT u.id, u.first_name, u.last_name, u.last_active_at, s.language,
             np.last_reengagement_sent
      FROM users u
      JOIN settings s ON s.user_id = u.id
      LEFT JOIN notification_preferences np ON np.user_id = u.id
      WHERE u.last_active_at IS NOT NULL
        AND u.last_active_at < ${fiveDaysAgo}
        AND (np.last_reengagement_sent IS NULL OR np.last_reengagement_sent < ${thirtyDaysAgo})
        AND (np.enabled IS NULL OR np.enabled = true)
      LIMIT 100
    `);

    const users = (lapsedUsers as any).rows ?? Array.from(lapsedUsers as any);
    let notified = 0;

    for (const user of users) {
      try {
        // Update last re-engagement sent timestamp
        const [existing] = await db.select().from(notificationPreferencesTable)
          .where(eq(notificationPreferencesTable.userId, user.id)).limit(1);

        if (existing) {
          await db.update(notificationPreferencesTable)
            .set({ lastReengagementSent: new Date() })
            .where(eq(notificationPreferencesTable.id, existing.id));
        } else {
          await db.insert(notificationPreferencesTable).values({
            userId: user.id,
            lastReengagementSent: new Date(),
          });
        }
        notified++;
      } catch (err) {
        logError(`Reengagement error for user ${user.id}:`, err);
      }
    }

    res.json({ checked: users.length, notified });
  } catch (err) {
    logError("reengagement error:", err);
    res.status(500).json({ error: "Failed to run re-engagement" });
  }
});

export default router;
