import { db, userSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { PLANS, getPlan, getEffectivePlanKey, type PlanKey, type PlanDefinition } from "../lib/plans";

export interface ActiveSubscription {
  plan: PlanDefinition;
  effectivePlanKey: PlanKey;
  status: string;
  trialEndsAt: Date | null;
  periodStart: Date;
  periodEnd: Date | null;
  cancelledAt: Date | null;
  externalId: string | null;
  upgradeAvailable: boolean;
}

/**
 * Returns the active subscription for a user.
 * Falls back to a synthetic free subscription if no row exists.
 */
export async function getActiveSubscription(
  userId: number,
  userRole: string = "user"
): Promise<ActiveSubscription> {
  const rows = await db
    .select()
    .from(userSubscriptionsTable)
    .where(eq(userSubscriptionsTable.userId, userId))
    .limit(1);

  const row = rows[0];

  const planKey = row?.planKey ?? "free";
  const effectivePlanKey = getEffectivePlanKey(userRole, planKey);
  const plan = getPlan(effectivePlanKey);

  const isTrialing = row?.status === "trialing" && row?.trialEndsAt && new Date() < row.trialEndsAt;
  const effectiveStatus = isTrialing ? "trialing" : (row?.status ?? "active");

  return {
    plan,
    effectivePlanKey,
    status: effectiveStatus,
    trialEndsAt: row?.trialEndsAt ?? null,
    periodStart: row?.periodStart ?? new Date(),
    periodEnd: row?.periodEnd ?? null,
    cancelledAt: row?.cancelledAt ?? null,
    externalId: row?.externalId ?? null,
    upgradeAvailable: effectivePlanKey === "free",
  };
}

/**
 * Creates a free subscription row for a new user.
 * Safe to call on registration — does nothing if a row already exists.
 */
export async function ensureFreeSubscription(userId: number): Promise<void> {
  try {
    await db
      .insert(userSubscriptionsTable)
      .values({ userId, planKey: "free", status: "active" })
      .onConflictDoNothing();
  } catch {
    // Ignore duplicate key — subscription already exists
  }
}

/**
 * Upgrades or changes a user's plan.
 * Wire to Stripe webhook in production — call this from the billing handler.
 */
export async function setSubscriptionPlan(
  userId: number,
  planKey: PlanKey,
  opts: {
    status?: string;
    periodEnd?: Date;
    externalId?: string;
    externalCustomerId?: string;
    trialEndsAt?: Date;
  } = {}
): Promise<void> {
  await db
    .insert(userSubscriptionsTable)
    .values({
      userId,
      planKey,
      status: opts.status ?? "active",
      periodEnd: opts.periodEnd,
      externalId: opts.externalId,
      externalCustomerId: opts.externalCustomerId,
      trialEndsAt: opts.trialEndsAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSubscriptionsTable.userId,
      set: {
        planKey,
        status: opts.status ?? "active",
        periodEnd: opts.periodEnd,
        externalId: opts.externalId,
        externalCustomerId: opts.externalCustomerId,
        trialEndsAt: opts.trialEndsAt,
        cancelledAt: null,
        updatedAt: new Date(),
      },
    });
}

/**
 * Cancels a user's subscription at period end.
 * The user retains premium access until periodEnd.
 */
export async function cancelSubscription(userId: number): Promise<void> {
  await db
    .update(userSubscriptionsTable)
    .set({ cancelledAt: new Date(), status: "cancelled", updatedAt: new Date() })
    .where(eq(userSubscriptionsTable.userId, userId));
}

export { PLANS };
