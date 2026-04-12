import { db, usersTable, profilesTable, settingsTable, workoutsTable, mealsTable, mealFoodItemsTable, waterLogsTable } from "@workspace/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email";
import { logError } from "../lib/logger";
import { computeCurrentStreak } from "../lib/streaks";

interface DigestData {
  firstName: string;
  email: string;
  locale: string;
  workoutsCount: number;
  totalCalories: number;
  totalProtein: number;
  totalWaterMl: number;
  streak: number;
  weeklyGoal: number;
}

function buildDigestHtml(data: DigestData): string {
  const isAr = data.locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  const greeting = isAr ? `مرحبًا ${data.firstName}` : `Hey ${data.firstName}`;
  const subject = isAr ? "ملخصك الأسبوعي من Ordeal" : "Your Weekly Ordeal Summary";
  const workoutsLabel = isAr ? "تمارين" : "Workouts";
  const caloriesLabel = isAr ? "سعرات مسجلة" : "Calories logged";
  const proteinLabel = isAr ? "بروتين" : "Protein";
  const waterLabel = isAr ? "ماء" : "Water";
  const streakLabel = isAr ? "سلسلة الأيام" : "Streak";
  const adherenceLabel = isAr ? "الالتزام الأسبوعي" : "Weekly adherence";
  const ctaText = isAr ? "افتح Ordeal" : "Open Ordeal";
  const footer = isAr ? "تلقيت هذا لأنك مشترك في الملخص الأسبوعي." : "You received this because you're subscribed to the weekly digest.";

  const adherence = data.weeklyGoal > 0 ? Math.round((data.workoutsCount / data.weeklyGoal) * 100) : 0;
  const waterL = (data.totalWaterMl / 1000).toFixed(1);

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#7C3AED;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">Ordeal</h1>
    <p style="color:#e0d4f7;margin:8px 0 0;font-size:14px;">${subject}</p>
  </td></tr>
  <tr><td style="padding:24px;text-align:${align};">
    <h2 style="margin:0 0 16px;color:#1a1a1a;">${greeting} 👋</h2>
    <table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #eee;border-radius:8px;">
      <tr style="background:#f9f9f9;">
        <td style="font-weight:600;color:#555;">${workoutsLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:#7C3AED;font-size:18px;">${data.workoutsCount}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#555;">${adherenceLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:${adherence >= 80 ? "#22c55e" : adherence >= 50 ? "#f59e0b" : "#ef4444"};font-size:18px;">${adherence}%</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="font-weight:600;color:#555;">${caloriesLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:#1a1a1a;font-size:18px;">${Math.round(data.totalCalories).toLocaleString()} kcal</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#555;">${proteinLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:#1a1a1a;font-size:18px;">${Math.round(data.totalProtein)}g</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="font-weight:600;color:#555;">${waterLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:#1a1a1a;font-size:18px;">${waterL}L</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#555;">🔥 ${streakLabel}</td>
        <td style="text-align:${isAr ? "left" : "right"};font-weight:700;color:#f59e0b;font-size:18px;">${data.streak} ${isAr ? "يوم" : "days"}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://fitlog.app" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaText}</a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">${footer}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function sendWeeklyDigests(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  try {
    // Get all users who have digest enabled and were created >14 days ago
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const eligibleUsers = await db.execute(sql`
      SELECT u.id, u.email, u.first_name, u.created_at,
             s.language,
             p.weekly_workout_days, p.email_digest_enabled
      FROM users u
      JOIN settings s ON s.user_id = u.id
      JOIN profiles p ON p.user_id = u.id
      WHERE p.email_digest_enabled = true
        AND u.created_at < ${fourteenDaysAgo}
    `);

    const users = (eligibleUsers as any).rows ?? Array.from(eligibleUsers as any);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);

    for (const user of users) {
      try {
        // Get week's data
        const [workouts, meals, water, recentWorkoutDates] = await Promise.all([
          db.select({ id: workoutsTable.id }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.date, weekStart), lt(workoutsTable.date, weekEnd))),
          db.select({ id: mealsTable.id }).from(mealsTable).where(and(eq(mealsTable.userId, user.id), gte(mealsTable.date, weekStart), lt(mealsTable.date, weekEnd))),
          db.select({ amountMl: waterLogsTable.amountMl }).from(waterLogsTable).where(and(eq(waterLogsTable.userId, user.id), gte(waterLogsTable.loggedAt, weekStart), lt(waterLogsTable.loggedAt, weekEnd))),
          db.execute(sql`SELECT date FROM workouts WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 30`),
        ]);

        // Get nutrition totals
        let totalCalories = 0;
        let totalProtein = 0;
        if (meals.length > 0) {
          const mealIds = meals.map((m) => m.id);
          const foodItems = await db.execute(sql`
            SELECT calories, protein_g FROM meal_food_items WHERE meal_id = ANY(${mealIds})
          `);
          const items = (foodItems as any).rows ?? Array.from(foodItems as any);
          totalCalories = items.reduce((s: number, f: any) => s + (f.calories ?? 0), 0);
          totalProtein = items.reduce((s: number, f: any) => s + (f.protein_g ?? 0), 0);
        }

        const totalWaterMl = water.reduce((s, l) => s + (l.amountMl ?? 0), 0);
        const workoutDates = ((recentWorkoutDates as any).rows ?? Array.from(recentWorkoutDates as any)).map((r: any) => new Date(r.date));
        const streak = computeCurrentStreak(workoutDates);

        const data: DigestData = {
          firstName: user.first_name,
          email: user.email,
          locale: user.language || "en",
          workoutsCount: workouts.length,
          totalCalories,
          totalProtein,
          totalWaterMl,
          streak,
          weeklyGoal: user.weekly_workout_days ?? 3,
        };

        const subject = data.locale === "ar" ? "📊 ملخصك الأسبوعي من Ordeal" : "📊 Your Weekly Ordeal Summary";
        const html = buildDigestHtml(data);

        const success = await sendEmail({ to: data.email, subject, html });
        if (success) {
          sent++;
        } else {
          errors++;
        }
      } catch (userErr) {
        logError(`Digest error for user ${user.id}:`, userErr);
        errors++;
      }
    }
  } catch (err) {
    logError("Weekly digest batch error:", err);
  }

  return { sent, errors };
}
