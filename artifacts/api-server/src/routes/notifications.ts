import { Router } from "express";
import { db, workoutsTable, mealsTable, mealFoodItemsTable, waterLogsTable, profilesTable } from "@workspace/db";
import { eq, and, gte, lt, desc, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

type NotifType = "workout" | "meal" | "hydration" | "streak" | "recovery" | "weekly";
interface SmartMessage { type: NotifType; title: string; body: string; priority: number; }

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

    const [workoutsToday, mealsToday, waterToday, profileRows, recentWorkouts, weeklyWorkouts] = await Promise.all([
      db.select({ id: workoutsTable.id, durationMinutes: workoutsTable.durationMinutes })
        .from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, todayStart), lt(workoutsTable.date, todayEnd))),
      db.select({ id: mealsTable.id })
        .from(mealsTable)
        .where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, todayStart), lt(mealsTable.date, todayEnd))),
      db.select({ amountMl: waterLogsTable.amountMl })
        .from(waterLogsTable)
        .where(and(eq(waterLogsTable.userId, user.id), gte(waterLogsTable.loggedAt, todayStart), lt(waterLogsTable.loggedAt, todayEnd))),
      db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1),
      db.select({ date: workoutsTable.date })
        .from(workoutsTable)
        .where(eq(workoutsTable.userId, user.id))
        .orderBy(desc(workoutsTable.date))
        .limit(14),
      db.select({ id: workoutsTable.id })
        .from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, weekStart))),
    ]);

    const profile = profileRows[0] || {};
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const workoutsTodayCount = workoutsToday.length;
    const mealsTodayCount = mealsToday.length;
    const waterTotalMl = waterToday.reduce((s, l) => s + (l.amountMl ?? 0), 0);
    const weeklyGoal: number = (profile as any).weeklyWorkoutDays ?? 3;
    const weeklyDone = weeklyWorkouts.length;

    let proteinToday = 0;
    let proteinGoal = (profile as any).dailyProteinGoal ?? 0;
    if (mealsTodayCount > 0) {
      const mealIds = mealsToday.map(m => m.id);
      const foodItems = await db.select({ proteinG: mealFoodItemsTable.proteinG })
        .from(mealFoodItemsTable)
        .where(inArray(mealFoodItemsTable.mealId, mealIds));
      proteinToday = foodItems.reduce((s, f) => s + (f.proteinG ?? 0), 0);
    }

    let streak = 0;
    {
      const uniqueDays = new Set(recentWorkouts.map(w => new Date(w.date).toDateString()));
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 0; i < 14; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        if (uniqueDays.has(d.toDateString())) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
    }

    const candidates: SmartMessage[] = [];

    if (streak > 1 && workoutsTodayCount === 0 && hour >= 16) {
      candidates.push({
        type: "streak",
        priority: streak >= 7 ? 0 : 1,
        title: `🔥 ${streak}-day streak at risk!`,
        body: `You haven't worked out yet today. Keep your ${streak}-day streak alive — you're so close!`,
      });
    }

    if (streak === 0 && workoutsTodayCount === 0 && hour >= 16 && hour <= 22) {
      candidates.push({
        type: "streak",
        priority: 3,
        title: "Start your streak today",
        body: "Log a workout today and kick off your fitness streak.",
      });
    }

    if (workoutsTodayCount === 0 && hour >= 6 && hour <= 14) {
      const duration = (profile as any).preferredWorkoutDuration ?? "30 minutes";
      candidates.push({
        type: "workout",
        priority: 2,
        title: "Ready to train today?",
        body: `A ${duration} session is all it takes — let's get moving!`,
      });
    }

    if (proteinGoal > 0 && mealsTodayCount > 0) {
      const remaining = proteinGoal - proteinToday;
      if (remaining > 0 && remaining <= 25) {
        candidates.push({
          type: "meal",
          priority: 2,
          title: "Almost at your protein goal!",
          body: `Just ${Math.round(remaining)}g of protein left for today — almost there!`,
        });
      }
    }

    if (mealsTodayCount === 0 && hour >= 11 && hour <= 20) {
      candidates.push({
        type: "meal",
        priority: 3,
        title: "No meals logged yet",
        body: "Keep your nutrition on track — log your first meal of the day.",
      });
    }

    const waterGoalMl: number = (profile as any).dailyWaterGoalMl ?? ((profile as any).dailyWaterGoalOz ? (profile as any).dailyWaterGoalOz * 29.5735 : 1893);
    if (hour >= 12 && hour <= 20) {
      if (waterTotalMl === 0) {
        candidates.push({
          type: "hydration",
          priority: 4,
          title: "Stay hydrated!",
          body: "You haven't logged any water yet today. Start sipping!",
        });
      } else if (waterGoalMl > 0 && waterTotalMl < waterGoalMl * 0.5) {
        const liters = (waterTotalMl / 1000).toFixed(1);
        const target = (waterGoalMl / 1000).toFixed(1);
        candidates.push({
          type: "hydration",
          priority: 5,
          title: "Halfway to your water goal",
          body: `${liters}L / ${target}L — keep drinking to hit your daily target!`,
        });
      }
    }

    if ((dayOfWeek === 0 || dayOfWeek === 1) && hour >= 8 && hour <= 20) {
      if (weeklyDone >= weeklyGoal) {
        candidates.push({
          type: "weekly",
          priority: 1,
          title: "Weekly goal smashed! 🎉",
          body: `You've hit your ${weeklyGoal} workout/week target. Incredible work!`,
        });
      } else {
        const left = weeklyGoal - weeklyDone;
        candidates.push({
          type: "weekly",
          priority: dayOfWeek === 0 ? 2 : 4,
          title: `${weeklyDone}/${weeklyGoal} workouts this week`,
          body: left === 1
            ? "Just 1 more workout to hit your weekly goal!"
            : `${left} more workouts to reach your weekly goal.`,
        });
      }
    }

    const messages = candidates
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map(({ type, title, body }) => ({ type, title, body }));

    res.json({ messages });
  } catch (err) {
    console.error("smart-content error:", err);
    res.status(500).json({ error: "Failed to get smart notification content" });
  }
});

export default router;
