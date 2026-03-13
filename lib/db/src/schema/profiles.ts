import { pgTable, serial, integer, text, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  photoUrl: text("photo_url"),
  age: integer("age"),
  gender: text("gender"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  fitnessGoals: jsonb("fitness_goals").$type<string[]>().notNull().default([]),
  activityLevel: text("activity_level"),
  dailyCalorieGoal: integer("daily_calorie_goal"),
  dailyProteinGoal: integer("daily_protein_goal"),
  dailyCarbsGoal: integer("daily_carbs_goal"),
  dailyFatGoal: integer("daily_fat_goal"),
  // Coach / smart workout fields
  availableEquipment: jsonb("available_equipment").$type<string[]>().notNull().default([]),
  workoutLocation: text("workout_location"),
  trainingPreferences: jsonb("training_preferences").$type<string[]>().notNull().default([]),
  experienceLevel: text("experience_level"),
  preferredWorkoutDuration: text("preferred_workout_duration"),
  weeklyWorkoutDays: integer("weekly_workout_days"),
  dailyWaterGoalMl: integer("daily_water_goal_ml").notNull().default(2000),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  coachOnboardingComplete: boolean("coach_onboarding_complete").notNull().default(false),
  savedWeeklyPlan: jsonb("saved_weekly_plan").$type<any>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
