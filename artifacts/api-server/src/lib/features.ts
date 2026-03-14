export type UserRole = "user" | "premium" | "admin";

/**
 * Feature flag registry.
 * Add new flags here as features are developed.
 * Premium gates are enforced via hasFeature() in route handlers.
 */
export const FEATURES = {
  AI_COACH: "ai_coach",
  ADVANCED_ANALYTICS: "advanced_analytics",
  UNLIMITED_TEMPLATES: "unlimited_templates",
  EXPORT_DATA: "export_data",
  CUSTOM_GOALS: "custom_goals",
  BARCODE_SCANNER: "barcode_scanner",
  PRIORITY_SUPPORT: "priority_support",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const FREE_FEATURES = new Set<Feature>([
  FEATURES.AI_COACH,
]);

const PREMIUM_FEATURES = new Set<Feature>(Object.values(FEATURES) as Feature[]);

const FEATURE_MATRIX: Record<UserRole, Set<Feature>> = {
  user: FREE_FEATURES,
  premium: PREMIUM_FEATURES,
  admin: PREMIUM_FEATURES,
};

export function hasFeature(role: UserRole, feature: Feature): boolean {
  return FEATURE_MATRIX[role]?.has(feature) ?? false;
}

export interface PlanLimits {
  maxSavedTemplates: number;
  maxFavoriteMeals: number;
  aiRequestsPerDay: number;
  dataRetentionDays: number;
}

export function getPlanLimits(role: UserRole): PlanLimits {
  if (role === "premium" || role === "admin") {
    return {
      maxSavedTemplates: Infinity,
      maxFavoriteMeals: Infinity,
      aiRequestsPerDay: Infinity,
      dataRetentionDays: Infinity,
    };
  }
  return {
    maxSavedTemplates: 10,
    maxFavoriteMeals: 20,
    aiRequestsPerDay: 50,
    dataRetentionDays: 365,
  };
}

export function getUserTier(role: UserRole): "free" | "premium" | "admin" {
  if (role === "admin") return "admin";
  if (role === "premium") return "premium";
  return "free";
}
