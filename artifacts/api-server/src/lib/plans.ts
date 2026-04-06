/**
 * Plan catalog — single source of truth for what each tier includes.
 * Add new plans here; the subscription table stores only the plan key per user.
 */

export type PlanKey = "free" | "premium";

export type PlanStatus = "active" | "trialing" | "cancelled" | "expired";

export interface PlanFeatureSet {
  aiCoach: boolean;
  aiPhotoAnalysis: boolean;
  advancedAnalytics: boolean;
  advancedNutrition: boolean;
  smartProgression: boolean;
  deeperRecovery: boolean;
  exportData: boolean;
  barcodeScanner: boolean;
  unlimitedTemplates: boolean;
  prioritySupport: boolean;
}

export interface PlanLimits {
  maxSavedTemplates: number;
  maxFavoriteMeals: number;
  aiRequestsPerDay: number;
  dataRetentionDays: number;
  scansPerDay: number;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  features: PlanFeatureSet;
  limits: PlanLimits;
  priceMonthly: number | null;
  priceYearly: number | null;
  highlight: string[];
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    tagline: "Everything you need to start your fitness journey",
    features: {
      aiCoach: true,
      aiPhotoAnalysis: false,
      advancedAnalytics: false,
      advancedNutrition: false,
      smartProgression: false,
      deeperRecovery: false,
      exportData: false,
      barcodeScanner: false,
      unlimitedTemplates: false,
      prioritySupport: false,
    },
    limits: {
      maxSavedTemplates: 10,
      maxFavoriteMeals: 20,
      aiRequestsPerDay: 50,
      dataRetentionDays: 365,
      scansPerDay: 1,
    },
    priceMonthly: 0,
    priceYearly: 0,
    highlight: [
      "Workout & meal logging",
      "AI fitness coach",
      "Basic analytics & streaks",
      "25+ workout templates",
      "Water & recovery tracking",
    ],
  },

  premium: {
    key: "premium",
    name: "Premium",
    tagline: "Unlock the full power of your fitness data",
    features: {
      aiCoach: true,
      aiPhotoAnalysis: true,
      advancedAnalytics: true,
      advancedNutrition: true,
      smartProgression: true,
      deeperRecovery: true,
      exportData: true,
      barcodeScanner: true,
      unlimitedTemplates: true,
      prioritySupport: true,
    },
    limits: {
      maxSavedTemplates: Infinity,
      maxFavoriteMeals: Infinity,
      aiRequestsPerDay: Infinity,
      dataRetentionDays: Infinity,
      scansPerDay: Infinity,
    },
    priceMonthly: 999,
    priceYearly: 7999,
    highlight: [
      "Everything in Free",
      "AI meal photo analysis",
      "Advanced analytics dashboard",
      "Smart progression tracking",
      "Deeper recovery insights",
      "Advanced macro & nutrition goals",
      "Unlimited saved workout plans",
      "Data export (CSV / JSON)",
      "Barcode food scanner",
      "Priority support",
    ],
  },
};

export function getPlan(key: PlanKey): PlanDefinition {
  return PLANS[key] ?? PLANS.free;
}

export function hasFeatureForPlan(key: PlanKey, feature: keyof PlanFeatureSet): boolean {
  return getPlan(key).features[feature] ?? false;
}

export function getLimitsForPlan(key: PlanKey): PlanLimits {
  return getPlan(key).limits;
}

/** Admins get full premium access regardless of their subscription row. */
export function getEffectivePlanKey(userRole: string, subscriptionPlanKey: string): PlanKey {
  if (userRole === "admin") return "premium";
  return (subscriptionPlanKey as PlanKey) ?? "free";
}
