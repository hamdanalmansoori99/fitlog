/**
 * Feature flag helpers.
 * Prefer using plan-based checks (hasPlanFeature) for billing-gated features.
 * Use role-based checks (requireRole middleware) for admin/staff access only.
 */
import { hasFeatureForPlan, getLimitsForPlan, getEffectivePlanKey, type PlanKey } from "./plans";

export type UserRole = "user" | "premium" | "admin";

export { PLANS, getPlan, hasFeatureForPlan, getLimitsForPlan, getEffectivePlanKey };
export type { PlanKey };

/**
 * Check whether a user has access to a feature, given their role and plan key.
 * Admins always get full access. Otherwise the plan key governs feature access.
 */
export function hasPlanFeature(
  userRole: string,
  subscriptionPlanKey: string,
  feature: Parameters<typeof hasFeatureForPlan>[1]
): boolean {
  const effectivePlan = getEffectivePlanKey(userRole, subscriptionPlanKey);
  return hasFeatureForPlan(effectivePlan, feature);
}

/**
 * Get plan limits for a user, honouring role overrides.
 */
export function getEffectiveLimits(userRole: string, subscriptionPlanKey: string) {
  const effectivePlan = getEffectivePlanKey(userRole, subscriptionPlanKey);
  return getLimitsForPlan(effectivePlan);
}

/**
 * Returns whether an upgrade is available for the user.
 */
export function isUpgradeAvailable(userRole: string, subscriptionPlanKey: string): boolean {
  if (userRole === "admin") return false;
  return subscriptionPlanKey !== "premium";
}

export function getUserTier(role: UserRole, planKey: PlanKey): "free" | "premium" | "admin" {
  if (role === "admin") return "admin";
  if (planKey === "premium" || role === "premium") return "premium";
  return "free";
}
