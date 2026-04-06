import { Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";
import i18n from "@/i18n";

// EXPO_PUBLIC_API_URL: full URL to your backend, e.g. http://192.168.1.50:3001/api
// Set this in artifacts/fitlog/.env before running expo start.
export const BASE_URL =
  Platform.OS === "web"
    ? "/api"
    : (process.env.EXPO_PUBLIC_API_URL ?? "https://fitlog-production-895f.up.railway.app/api");

// AI generation endpoints that can legitimately take up to 60s.
const AI_PATHS = [
  "/meals/generate-plan",
  "/meals/generate-day-plan",
  "/meals/generate-week-plan",
  "/meals/generate-grocery-list",
  "/scan-meal/analyze",
  "/meals/analyze-photo",
  "/coach/message",
  "/coach/proactive",
];

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const isAiPath = AI_PATHS.some((p) => path.startsWith(p));
  const timeoutMs = isAiPath ? 60000 : 20000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error(i18n.t("common.requestTimeout") || "Request timed out. Check your connection.");
    }
    throw new Error(`Cannot reach server at ${BASE_URL}. Check your IP in .env (EXPO_PUBLIC_API_URL).`);
  }
  clearTimeout(timeoutId);

  // 204 No Content — nothing to parse.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    // Server returned a non-JSON body (HTML error page, gateway timeout, etc.).
    // Surface a clean message instead of a raw SyntaxError.
    throw new Error(i18n.t("common.requestFailed"));
  }

  if (res.status === 401) {
    // Session expired or invalid — clear stored credentials so the app
    // routes back to the login screen instead of showing confusing errors.
    useAuthStore.getState().clearAuth();
    throw new Error(data.error || "Session expired. Please log in again.");
  }

  if (!res.ok) {
    const err: any = new Error(data.error || data.message || i18n.t("common.requestFailed"));
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ user: any; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  demoLogin: () => request<{ user: any; token: string }>("/auth/demo", { method: "POST" }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request<any>("/auth/me"),
  
  // Profile
  getProfile: () => request<any>("/profile"),
  updateProfile: (body: any) => request<any>("/profile", { method: "PUT", body: JSON.stringify(body) }),
  getNutritionTargets: () => request<{ calorieGoal: number; proteinGoal: number; carbsGoal: number; fatGoal: number; explanation: string }>("/profile/nutrition-targets"),
  deleteAccount: () => request("/profile/delete", { method: "DELETE" }),
  
  // Workouts
  getWorkouts: (params?: { limit?: number; offset?: number }) => {
    const q = params ? `?${new URLSearchParams(params as any).toString()}` : "";
    return request<any>(`/workouts${q}`);
  },
  getWorkout: (id: number) => request<any>(`/workouts/${id}`),
  createWorkout: (body: any) => request<any>("/workouts", { method: "POST", body: JSON.stringify(body) }),
  updateWorkout: (id: number, body: any) => request<any>(`/workouts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteWorkout: (id: number) => request(`/workouts/${id}`, { method: "DELETE" }),
  getTodayStats: () => request<any>("/workouts/stats/today"),
  getWeeklyStats: () => request<any>("/workouts/stats/weekly"),
  getWorkoutSummary: () => request<any>("/workouts/stats/summary"),
  getRecentActivity: () => request<any>("/workouts/recent"),
  getWorkoutCalendar: (year: number, month: number) =>
    request<any>(`/workouts/calendar?year=${year}&month=${month}`),
  
  // Meals
  analyzeMealPhoto: (imageBase64: string, mimeType = "image/jpeg") =>
    request<any>("/meals/analyze-photo", {
      method: "POST",
      body: JSON.stringify({ imageBase64, mimeType }),
    }),
  barcodeLookup: (barcode: string) =>
    request<any>("/meals/barcode-lookup", {
      method: "POST",
      body: JSON.stringify({ barcode }),
    }),
  generateMealPlan: (body: { calorieGoal?: number; proteinGoalG?: number; preferences?: string[] }) =>
    request<any>("/meals/generate-plan", { method: "POST", body: JSON.stringify(body) }),
  generateWeekPlan: (body: { calorieGoal?: number; proteinGoalG?: number; preferences?: string[] }) =>
    request<any>("/meals/generate-week-plan", { method: "POST", body: JSON.stringify(body) }),
  generateDayPlan: (body: { date: string; calorieGoal?: number; proteinGoalG?: number; preferences?: string[] }) =>
    request<any>("/meals/generate-day-plan", { method: "POST", body: JSON.stringify(body) }),
  generateGroceryList: (meals: { name: string; description: string }[]) =>
    request<any>("/meals/generate-grocery-list", { method: "POST", body: JSON.stringify({ meals }) }),
  getMeals: (date?: string) => {
    const q = date ? `?date=${date}` : "";
    return request<any>(`/meals${q}`);
  },
  getMeal: (id: number) => request<any>(`/meals/${id}`),
  createMeal: (body: any) => request<any>("/meals", { method: "POST", body: JSON.stringify(body) }),
  updateMeal: (id: number, body: any) => request<any>(`/meals/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMeal: (id: number) => request(`/meals/${id}`, { method: "DELETE" }),
  getNutritionStats: () => request<any>("/meals/stats/nutrition"),
  getAchievements: () => request<any>("/achievements"),
  getRecentFoods: (limit = 25) => request<any>(`/meals/recent-foods?limit=${limit}`),
  foodSearch: (q: string) => request<any>(`/meals/food-search?q=${encodeURIComponent(q)}`),
  getFrequentMeals: (limit = 6) => request<any>(`/meals/frequent?limit=${limit}`),
  duplicateMeal: (id: number, targetDate?: string) =>
    request<any>(`/meals/${id}/duplicate`, { method: "POST", body: JSON.stringify({ targetDate }) }),
  
  // Equipment
  getEquipment: () => request<any>("/equipment"),
  createEquipment: (body: any) => request<any>("/equipment", { method: "POST", body: JSON.stringify(body) }),
  deleteEquipment: (id: number) => request(`/equipment/${id}`, { method: "DELETE" }),
  
  // Measurements
  getMeasurements: (days?: number) => {
    const q = days ? `?days=${days}` : "";
    return request<any>(`/measurements${q}`);
  },
  getMeasurement: (id: number) => request<any>(`/measurements/${id}`),
  createMeasurement: (body: any) => request<any>("/measurements", { method: "POST", body: JSON.stringify(body) }),
  updateMeasurement: (id: number, body: any) => request<any>(`/measurements/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMeasurement: (id: number) => request(`/measurements/${id}`, { method: "DELETE" }),
  
  // Progress
  getStreaks: () => request<any>("/progress/streaks"),
  getPersonalRecords: () => request<any>("/progress/records"),
  
  // Settings
  getSettings: () => request<any>("/settings"),
  updateSettings: (body: any) => request<any>("/settings", { method: "PUT", body: JSON.stringify(body) }),

  // Coach
  getCoachConversation: () => request<any>("/coach/conversation"),
  clearCoachConversation: () => request<any>("/coach/conversation", { method: "DELETE" }),

  // Progression
  getExerciseHistory: (names: string[], limit = 5) =>
    request<any>(`/progress/exercise-history?names=${encodeURIComponent(names.join(","))}&limit=${limit}`),
  getCardioHistory: (type: string, limit = 10) =>
    request<any>(`/progress/cardio-history?type=${encodeURIComponent(type)}&limit=${limit}`),
  getConsistency: () => request<any>("/progress/consistency"),
  getWeeklyReport: () => request<any>("/progress/weekly-report"),

  // Water tracking
  getWaterToday: () => request<any>("/water/today"),
  logWater: (amountMl: number) =>
    request<any>("/water/log", { method: "POST", body: JSON.stringify({ amountMl }) }),
  deleteWaterLog: (id: number) =>
    request<any>(`/water/log/${id}`, { method: "DELETE" }),

  // Recovery tracking
  getRecoveryToday: () => request<any>("/recovery/today"),
  getRecoveryRecent: () => request<any>("/recovery/recent"),
  logRecovery: (body: {
    sleepHours?: number;
    sleepQuality?: number;
    energyLevel?: number;
    stressLevel?: number;
    overallFeeling?: number;
    soreness?: Record<string, number>;
    notes?: string;
  }) => request<any>("/recovery/log", { method: "POST", body: JSON.stringify(body) }),

  // My Workout Templates
  getUserTemplates: () => request<any>("/workouts/my-templates"),
  createUserTemplate: (body: {
    name: string;
    activityType?: string;
    description?: string;
    estimatedMinutes?: number;
    exercises?: any[];
    sourceWorkoutId?: number;
  }) => request<any>("/workouts/my-templates", { method: "POST", body: JSON.stringify(body) }),
  updateUserTemplate: (id: number, body: {
    name?: string;
    activityType?: string;
    description?: string;
    estimatedMinutes?: number;
    exercises?: any[];
    isFavorite?: boolean;
  }) => request<any>(`/workouts/my-templates/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUserTemplate: (id: number) =>
    request(`/workouts/my-templates/${id}`, { method: "DELETE" }),
  toggleTemplateFavorite: (id: number) =>
    request<any>(`/workouts/my-templates/${id}/favorite`, { method: "POST" }),
  markTemplateUsed: (id: number) =>
    request<any>(`/workouts/my-templates/${id}/use`, { method: "POST" }),

  // Subscription
  getSubscription: () => request<any>("/subscription"),
  requestUpgrade: (body: { plan?: string; billingCycle?: "monthly" | "yearly" }) =>
    request<any>("/subscription/upgrade", { method: "POST", body: JSON.stringify(body) }),
  cancelSubscription: () => request<any>("/subscription/cancel", { method: "POST" }),
  simulateSubscription: (planKey: "free" | "premium") =>
    request<any>("/subscription/simulate", { method: "POST", body: JSON.stringify({ planKey }) }),

  // Favourite Meals
  getFavoriteMeals: () => request<any>("/meals/favorites"),
  addFavoriteMeal: (body: {
    name?: string;
    category?: string;
    foodItems?: any[];
    sourceMealId?: number;
  }) => request<any>("/meals/favorites", { method: "POST", body: JSON.stringify(body) }),
  deleteFavoriteMeal: (id: number) =>
    request(`/meals/favorites/${id}`, { method: "DELETE" }),
  logFavoriteMeal: (id: number, category?: string) =>
    request<any>(`/meals/favorites/${id}/log`, { method: "POST", body: JSON.stringify({ category }) }),
  duplicateDayMeals: (fromDate: string, toDate?: string) =>
    request<any>("/meals/favorites/duplicate-day", { method: "POST", body: JSON.stringify({ fromDate, toDate }) }),

  // Smart Notifications
  getSmartNotifications: () =>
    request<{ messages: Array<{ id: string; type: string; title: string; body: string }> }>("/notifications/smart-content"),

  // Progress Photos
  getProgressPhotos: () =>
    request<{ photos: Array<{ id: number; date: string; note: string; mimeType: string; createdAt: string }> }>("/progress/photos"),
  createProgressPhoto: (body: { imageBase64: string; mimeType: string; date: string; note: string }) =>
    request<{ photo: { id: number; date: string; note: string; mimeType: string; createdAt: string } }>("/progress/photos", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteProgressPhoto: (id: number) =>
    request(`/progress/photos/${id}`, { method: "DELETE" }),

  // XP / Rank
  awardXp: (action: string) =>
    request<{ xp: number; awarded: number }>("/xp/award", { method: "POST", body: JSON.stringify({ action }) }),
  getXp: () => request<{ xp: number }>("/xp"),

  // Scan Meal (AI Vision)
  scanMealStatus: () =>
    request<ScanStatus>("/scan-meal/status"),
  scanMealAnalyze: (body: { imageBase64: string; mimeType?: string }) =>
    request<{ items: ScanMealItem[]; mealDescription: string; totals: MacroTotals; scansPerDay: number; remainingScans: number }>("/scan-meal/analyze", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  scanMealLog: (body: { items: ScanMealItem[]; category: string; name?: string; photoUrl?: string }) =>
    request<{ success: boolean; mealId: number }>("/scan-meal/log", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface ScanMealItem {
  name: string;
  portionSize: number;
  portionUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ScanStatus {
  scansUsedToday: number;
  scansPerDay: number;
  remainingScans: number;
  isUnlimited: boolean;
}
