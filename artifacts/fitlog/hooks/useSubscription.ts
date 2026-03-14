import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PlanTier = "free" | "premium";

export interface SubscriptionFeatures {
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

export interface SubscriptionLimits {
  maxSavedTemplates: number | null;
  maxFavoriteMeals: number | null;
  aiRequestsPerDay: number | null;
  dataRetentionDays: number | null;
}

export function useSubscription() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription"],
    queryFn: api.getSubscription,
    staleTime: 5 * 60 * 1000,
  });

  const tier: PlanTier = (data?.plan?.key as PlanTier) ?? "free";
  const isPremium = tier === "premium";
  const upgradeAvailable = data?.upgradeAvailable ?? true;

  const features: SubscriptionFeatures = data?.features ?? {
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
  };

  const limits: SubscriptionLimits = data?.limits ?? {
    maxSavedTemplates: 10,
    maxFavoriteMeals: 20,
    aiRequestsPerDay: 50,
    dataRetentionDays: 365,
  };

  return {
    subscription: data?.subscription,
    plan: data?.plan,
    availablePlans: data?.availablePlans ?? [],
    tier,
    isPremium,
    upgradeAvailable,
    features,
    limits,
    isLoading,
    error,
  };
}
