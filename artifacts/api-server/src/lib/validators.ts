import { z } from "zod";

// Reusable primitives
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, "Invalid date format");
export const positiveInt = z.number().int().positive();

// Meal category enum
export const mealCategory = z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]);

// Numeric bounds for fitness data
export const weightKg = z.number().min(0).max(1000);
export const durationMinutes = z.number().min(0).max(1440);
export const calories = z.number().int().min(0).max(50000);
export const distanceKm = z.number().min(0).max(1000);
export const waterMl = z.number().int().min(0).max(10000);
export const reps = z.number().int().min(0).max(9999);

// String length bounds
export const shortText = z.string().min(1).max(200).trim();
export const longText = z.string().max(5000).trim();

// Food item schema for meals
export const foodItemSchema = z.object({
  name: shortText,
  portionSize: z.number().min(0).max(10000),
  portionUnit: z.string().max(20).optional(),
  unit: z.string().max(20).optional(),
  calories: calories,
  proteinG: z.number().min(0).max(5000),
  carbsG: z.number().min(0).max(5000),
  fatG: z.number().min(0).max(5000),
});

// Workout set schema
export const workoutSetSchema = z.object({
  reps: reps.optional(),
  weightKg: weightKg.optional(),
  durationSeconds: z.number().min(0).max(86400).optional(),
  distanceKm: distanceKm.optional(),
  notes: longText.optional(),
});

// Workout exercise schema
export const workoutExerciseSchema = z.object({
  exerciseName: shortText,
  order: z.number().int().min(0).max(100),
  sets: z.array(workoutSetSchema).min(1).max(100),
});
