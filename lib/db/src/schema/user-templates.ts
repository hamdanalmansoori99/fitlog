import { pgTable, serial, integer, text, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export interface TemplateExercise {
  name: string;
  order: number;
  sets: Array<{ reps?: number; weightKg?: number; rpe?: number }>;
}

export const userWorkoutTemplatesTable = pgTable("user_workout_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  activityType: text("activity_type").notNull().default("gym"),
  description: text("description"),
  estimatedMinutes: integer("estimated_minutes"),
  exercises: jsonb("exercises").$type<TemplateExercise[]>().notNull().default([]),
  isFavorite: boolean("is_favorite").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface FavoriteFoodItem {
  name: string;
  portionSize: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const favoriteMealsTable = pgTable("favorite_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("snack"),
  foodItems: jsonb("food_items").$type<FavoriteFoodItem[]>().notNull().default([]),
  totalCalories: real("total_calories").notNull().default(0),
  totalProteinG: real("total_protein_g").notNull().default(0),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserWorkoutTemplateSchema = createInsertSchema(userWorkoutTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFavoriteMealSchema = createInsertSchema(favoriteMealsTable).omit({ id: true, createdAt: true });

export type UserWorkoutTemplate = typeof userWorkoutTemplatesTable.$inferSelect;
export type FavoriteMeal = typeof favoriteMealsTable.$inferSelect;
