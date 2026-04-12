import { Router } from "express";
import { db, referralsTable, profilesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

const MAX_REFERRAL_REWARDS = 5;

// GET /referrals/stats — referral stats for current user
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const [profile] = await db.select({ inviteCode: profilesTable.inviteCode }).from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);

    const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(referralsTable).where(eq(referralsTable.referrerId, user.id));
    const rewardedResult = await db.select({ count: sql<number>`count(*)::int` }).from(referralsTable).where(and(eq(referralsTable.referrerId, user.id), eq(referralsTable.rewardGrantedToReferrer, true)));

    const totalReferrals = totalResult[0]?.count ?? 0;
    const rewardedReferrals = rewardedResult[0]?.count ?? 0;
    const rewardsRemaining = Math.max(0, MAX_REFERRAL_REWARDS - rewardedReferrals);

    res.json({
      inviteCode: profile?.inviteCode ?? null,
      totalReferrals,
      rewardedReferrals,
      rewardsRemaining,
      maxRewards: MAX_REFERRAL_REWARDS,
    });
  } catch (err) {
    logError("referral stats error:", err);
    res.status(500).json({ error: "Failed to get referral stats" });
  }
});

export default router;
