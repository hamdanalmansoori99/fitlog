import { Router } from "express";
import {
  db,
  workoutsTable,
  mealsTable,
  mealFoodItemsTable,
  waterLogsTable,
  profilesTable,
  recoveryLogsTable,
} from "@workspace/db";
import { eq, and, gte, lt, desc, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import type { Profile } from "@workspace/db";
import { logError } from "../lib/logger";
import { computeCurrentStreak } from "../lib/streaks";

const router = Router();

type NotifType = "workout" | "meal" | "hydration" | "streak" | "recovery" | "weekly";

// Inline streak milestone narratives (mirrors lib/streakNarratives.ts on the client)
const STREAK_MILESTONES: { day: number; message: string }[] = [
  { day: 1,   message: "The spark is lit." },
  { day: 2,   message: "Back again. This is how legends start." },
  { day: 3,   message: "Three in a row. Your body is starting to remember." },
  { day: 5,   message: "Five days strong. The habit is forming." },
  { day: 7,   message: "One full week. The Forge has claimed you." },
  { day: 10,  message: "Double digits. You're not stopping." },
  { day: 14,  message: "Two weeks forged. Others are still deciding to start." },
  { day: 21,  message: "21 days. Science says this is a habit now. You're different." },
  { day: 30,  message: "A full month. Bronze Forger energy." },
  { day: 45,  message: "45 days. The grind is second nature." },
  { day: 60,  message: "Two months. Most people quit by week 2. You're not most people." },
  { day: 90,  message: "90 days. Elite territory." },
  { day: 100, message: "100 days. You've entered rare air. The Obsidian path calls." },
  { day: 180, message: "Half a year. The realm has noticed." },
  { day: 365, message: "One year. The Eternal Ascendant watches and nods." },
];

function getStreakNarrativeMessage(days: number): string {
  if (days <= 0) return "Start your streak today.";
  let best = STREAK_MILESTONES[0];
  for (const m of STREAK_MILESTONES) {
    if (days >= m.day) best = m;
    else break;
  }
  return best.message;
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
    ]);

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
    const streak = computeCurrentStreak(recentDates);
    const consecutiveDays = streak;

    const candidates: SmartMessage[] = [];

    if (streak > 1 && workoutsTodayCount === 0 && hour >= 16) {
      candidates.push({
        id: "streak:at-risk",
        type: "streak",
        priority: streak >= 7 ? 0 : 1,
        title: `🔥 ${streak}-day streak at risk!`,
        body: `${getStreakNarrativeMessage(streak)} Log a workout to keep it alive.`,
      });
    }

    if (streak === 0 && workoutsTodayCount === 0 && hour >= 16 && hour <= 22) {
      candidates.push({
        id: "streak:start",
        type: "streak",
        priority: 3,
        title: "Start your streak today",
        body: getStreakNarrativeMessage(0),
      });
    }

    if (workoutsTodayCount === 0 && hour >= 6 && hour <= 14) {
      candidates.push({
        id: "workout:morning-nudge",
        type: "workout",
        priority: 2,
        title: "Ready to train today?",
        body: `A ${preferredDuration} session is all it takes — let's get moving!`,
      });
    }

    if (proteinGoal > 0 && mealsTodayCount > 0) {
      const remaining = proteinGoal - proteinToday;
      if (remaining > 0 && remaining <= 25) {
        candidates.push({
          id: "meal:protein-close",
          type: "meal",
          priority: 2,
          title: "Almost at your protein goal!",
          body: `Just ${Math.round(remaining)}g of protein left for today — almost there!`,
        });
      }
    }

    if (mealsTodayCount === 0 && hour >= 11 && hour <= 20) {
      candidates.push({
        id: "meal:no-meals",
        type: "meal",
        priority: 3,
        title: "No meals logged yet",
        body: "Keep your nutrition on track — log your first meal of the day.",
      });
    }

    if (consecutiveDays >= 3 && workoutsTodayCount === 0) {
      const rec = recoveryToday[0];
      const lowEnergy = rec && rec.energyLevel !== null && (rec.energyLevel ?? 5) <= 2;
      candidates.push({
        id: "recovery:rest-day",
        type: "recovery",
        priority: 2,
        title: `${consecutiveDays} days in a row — consider a rest day`,
        body: lowEnergy
          ? "Your energy is low today. Active recovery or rest could help you come back stronger."
          : "You've been on a roll! A rest day now helps your muscles rebuild and grow.",
      });
    }

    if (hour >= 12 && hour <= 20) {
      if (waterTotalMl === 0) {
        candidates.push({
          id: "hydration:none",
          type: "hydration",
          priority: 4,
          title: "Stay hydrated!",
          body: "You haven't logged any water yet today. Start sipping!",
        });
      } else if (waterGoalMl > 0 && waterTotalMl < waterGoalMl * 0.5) {
        const current = (Math.round((waterTotalMl / 1000) * 10) / 10).toString();
        const target = (waterGoalMl / 1000).toFixed(1);
        candidates.push({
          id: "hydration:low",
          type: "hydration",
          priority: 5,
          title: "Halfway to your water goal",
          body: `${current}L / ${target}L — keep drinking to hit your daily target!`,
        });
      }
    }

    if ((dayOfWeek === 0 || dayOfWeek === 1) && hour >= 8 && hour <= 20) {
      if (weeklyDone >= weeklyGoal) {
        candidates.push({
          id: "weekly:smashed",
          type: "weekly",
          priority: 1,
          title: "Weekly goal smashed! 🎉",
          body: `You've hit your ${weeklyGoal} workout/week target. Incredible work!`,
        });
      } else {
        const left = weeklyGoal - weeklyDone;
        candidates.push({
          id: "weekly:progress",
          type: "weekly",
          priority: dayOfWeek === 0 ? 2 : 4,
          title: `${weeklyDone}/${weeklyGoal} workouts this week`,
          body:
            weeklyDone === 0
              ? "This week is wide open — let's get your first session in!"
              : left === 1
              ? "Just 1 more workout to hit your weekly goal!"
              : `${left} more workouts to reach your weekly goal.`,
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
    res.status(500).json({ error: "Failed to get smart notification content" });
  }
});

export default router;
