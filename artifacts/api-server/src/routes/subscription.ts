import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth";
import { getActiveSubscription, setSubscriptionPlan, cancelSubscription } from "../services/subscriptionService";
import { PLANS } from "../lib/plans";
import { logError } from "../lib/logger";

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
    logError("Get subscription error:", err);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

/**
 * POST /api/subscription/upgrade
 * Billing placeholder — returns instructions for when Stripe is wired in.
 * Wire this to your Stripe Checkout session creation in production.
 */
router.post("/upgrade", requireAuth, async (req, res) => {
  const { plan = "premium", billingCycle = "monthly" } = req.body as { plan?: string; billingCycle?: string };
  res.status(402).json({
    status: "billing_not_configured",
    message: "Stripe billing will be available soon. No charge has been made.",
    requestedPlan: plan,
    billingCycle,
    hint: "Wire POST /api/subscription/stripe-webhook + createCheckoutSession here.",
  });
});

/**
 * POST /api/subscription/cancel
 * Cancels the user's subscription at period end.
 */
router.post("/cancel", requireAuth, async (req, res) => {
  try {
    const user = getUser(req) as any;
    await cancelSubscription(user.id);
    res.json({ ok: true, message: "Subscription cancelled. Access continues until period end." });
  } catch (err) {
    logError("Cancel subscription error:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

/**
 * POST /api/subscription/simulate
 * Dev/testing only — force a plan for the current user.
 * Disabled in NODE_ENV=production.
 */
router.post("/simulate", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const user = getUser(req) as any;
    const { planKey = "free" } = req.body as { planKey?: "free" | "premium" };
    await setSubscriptionPlan(user.id, planKey, { status: "active" });
    const sub = await getActiveSubscription(user.id, user.role ?? "user");
    res.json({ ok: true, plan: sub.plan.name, features: sub.plan.features, limits: sub.plan.limits });
  } catch (err) {
    logError("Simulate subscription error:", err);
    res.status(500).json({ error: "Failed to simulate subscription" });
  }
});

export default router;
