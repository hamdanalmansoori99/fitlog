import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth";
import { getActiveSubscription } from "../services/subscriptionService";
import { PLANS } from "../lib/plans";

const router = Router();

/**
 * GET /api/subscription
 * Returns the current user's plan, active features, limits, and upgrade info.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req) as any;
    const sub = await getActiveSubscription(user.id, user.role ?? "user");

    res.json({
      plan: {
        key: sub.plan.key,
        name: sub.plan.name,
        tagline: sub.plan.tagline,
        highlight: sub.plan.highlight,
        priceMonthly: sub.plan.priceMonthly,
        priceYearly: sub.plan.priceYearly,
      },
      subscription: {
        status: sub.status,
        periodStart: sub.periodStart,
        periodEnd: sub.periodEnd,
        trialEndsAt: sub.trialEndsAt,
        cancelledAt: sub.cancelledAt,
        externalId: sub.externalId,
      },
      features: sub.plan.features,
      limits: {
        ...sub.plan.limits,
        maxSavedTemplates: isFinite(sub.plan.limits.maxSavedTemplates)
          ? sub.plan.limits.maxSavedTemplates
          : null,
        maxFavoriteMeals: isFinite(sub.plan.limits.maxFavoriteMeals)
          ? sub.plan.limits.maxFavoriteMeals
          : null,
        aiRequestsPerDay: isFinite(sub.plan.limits.aiRequestsPerDay)
          ? sub.plan.limits.aiRequestsPerDay
          : null,
        dataRetentionDays: isFinite(sub.plan.limits.dataRetentionDays)
          ? sub.plan.limits.dataRetentionDays
          : null,
      },
      upgradeAvailable: sub.upgradeAvailable,
      availablePlans: Object.values(PLANS).map((p) => ({
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        highlight: p.highlight,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
      })),
    });
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

export default router;
