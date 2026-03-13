import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mealFoodItemsTable = pgTable("meal_food_items", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").references(() => mealsTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  portionSize: real("portion_size").notNull(),
  unit: text("unit").notNull(),
  calories: real("calories").notNull(),
  proteinG: real("protein_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fatG: real("fat_g").notNull(),
});

export const insertMealSchema = createInsertSchema(mealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFoodItemSchema = createInsertSchema(mealFoodItemsTable).omit({ id: true });

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;
export type MealFoodItem = typeof mealFoodItemsTable.$inferSelect;
