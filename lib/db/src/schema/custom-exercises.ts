import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const customExercisesTable = pgTable("custom_exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  primaryMuscle: text("primary_muscle").notNull(),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
  instructions: jsonb("instructions").$type<string[]>().notNull().default([]),
  equipment: text("equipment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("custom_exercises_user_idx").on(table.userId),
]);

export type CustomExercise = typeof customExercisesTable.$inferSelect;
