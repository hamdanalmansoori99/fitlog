import { pgTable, serial, integer, text, real, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workoutsTable = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(),
  name: text("name"),
  date: timestamp("date").notNull(),
  durationMinutes: integer("duration_minutes"),
  distanceKm: real("distance_km"),
  paceMinPerKm: real("pace_min_per_km"),
  caloriesBurned: integer("calories_burned"),
  mood: text("mood"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("workouts_user_id_date_idx").on(table.userId, table.date),
  index("workouts_user_id_idx").on(table.userId),
  index("workouts_date_idx").on(table.date),
]);

export const workoutExercisesTable = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").references(() => workoutsTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
}, (table) => [
  index("workout_exercises_workout_id_idx").on(table.workoutId),
  index("workout_exercises_name_idx").on(table.name),
]);

export const workoutSetsTable = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").references(() => workoutExercisesTable.id, { onDelete: "cascade" }).notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  rpe: integer("rpe"),
  completed: boolean("completed").default(true),
  order: integer("order").notNull().default(0),
}, (table) => [
  index("workout_sets_exercise_id_idx").on(table.exerciseId),
  index("workout_sets_weight_kg_idx").on(table.weightKg),
]);

export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExerciseSchema = createInsertSchema(workoutExercisesTable).omit({ id: true });
export const insertSetSchema = createInsertSchema(workoutSetsTable).omit({ id: true });

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workoutsTable.$inferSelect;
export type WorkoutExercise = typeof workoutExercisesTable.$inferSelect;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
