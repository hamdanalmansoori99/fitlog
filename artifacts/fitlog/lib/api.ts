import { Platform } from "react-native";
import { useAuthStore } from "@/store/authStore";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || "";
export const BASE_URL = Platform.OS === "web"
  ? "/api"
  : `https://${DOMAIN}/api`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  
  return data;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ user: any; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request<any>("/auth/me"),
  
  // Profile
  getProfile: () => request<any>("/profile"),
  updateProfile: (body: any) => request<any>("/profile", { method: "PUT", body: JSON.stringify(body) }),
  deleteAccount: () => request("/profile/delete", { method: "DELETE" }),
  
  // Workouts
  getWorkouts: (params?: { limit?: number; offset?: number }) => {
    const q = params ? `?${new URLSearchParams(params as any).toString()}` : "";
    return request<any>(`/workouts${q}`);
  },
  createWorkout: (body: any) => request<any>("/workouts", { method: "POST", body: JSON.stringify(body) }),
  updateWorkout: (id: number, body: any) => request<any>(`/workouts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteWorkout: (id: number) => request(`/workouts/${id}`, { method: "DELETE" }),
  getTodayStats: () => request<any>("/workouts/stats/today"),
  getWeeklyStats: () => request<any>("/workouts/stats/weekly"),
  getWorkoutSummary: () => request<any>("/workouts/stats/summary"),
  getRecentActivity: () => request<any>("/workouts/recent"),
  
  // Meals
  analyzeMealPhoto: (imageBase64: string, mimeType = "image/jpeg") =>
    request<any>("/meals/analyze-photo", {
      method: "POST",
      body: JSON.stringify({ imageBase64, mimeType }),
    }),
  getMeals: (date?: string) => {
    const q = date ? `?date=${date}` : "";
    return request<any>(`/meals${q}`);
  },
  createMeal: (body: any) => request<any>("/meals", { method: "POST", body: JSON.stringify(body) }),
  updateMeal: (id: number, body: any) => request<any>(`/meals/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMeal: (id: number) => request(`/meals/${id}`, { method: "DELETE" }),
  getNutritionStats: () => request<any>("/meals/stats/nutrition"),
  getRecentFoods: (limit = 25) => request<any>(`/meals/recent-foods?limit=${limit}`),
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
  createMeasurement: (body: any) => request<any>("/measurements", { method: "POST", body: JSON.stringify(body) }),
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
};
