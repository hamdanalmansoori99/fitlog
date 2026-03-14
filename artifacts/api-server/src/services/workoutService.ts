import { db, workoutsTable, workoutExercisesTable, workoutSetsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
export type WorkoutExerciseWithSets = typeof workoutExercisesTable.$inferSelect & { sets: WorkoutSet[] };
export type WorkoutWithExercises = typeof workoutsTable.$inferSelect & { exercises: WorkoutExerciseWithSets[] };

export interface CreateWorkoutInput {
  activityType: string;
  name?: string;
  date: Date;
  durationMinutes?: number;
  distanceKm?: number;
  caloriesBurned?: number;
  mood?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  exercises?: Array<{
    name: string;
    order: number;
    sets?: Array<{
      reps?: number;
      weightKg?: number;
      rpe?: number;
      completed?: boolean;
      order: number;
    }>;
  }>;
}

export interface ListWorkoutsOptions {
  limit?: number;
  offset?: number;
  from?: Date;
  to?: Date;
}

async function enrichWorkout(workout: typeof workoutsTable.$inferSelect): Promise<WorkoutWithExercises> {
  const exercises = await db
    .select()
    .from(workoutExercisesTable)
    .where(eq(workoutExercisesTable.workoutId, workout.id))
    .orderBy(workoutExercisesTable.order);

  const exercisesWithSets = await Promise.all(
    exercises.map(async (ex) => {
      const sets = await db
        .select()
        .from(workoutSetsTable)
        .where(eq(workoutSetsTable.exerciseId, ex.id))
        .orderBy(workoutSetsTable.order);
      return { ...ex, sets };
    })
  );

  return { ...workout, exercises: exercisesWithSets };
}

export async function getWorkoutById(
  workoutId: number,
  userId: number
): Promise<WorkoutWithExercises | null> {
  const rows = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, userId)))
    .limit(1);

  if (rows.length === 0) return null;
  return enrichWorkout(rows[0]);
}

export async function listWorkouts(
  userId: number,
  opts: ListWorkoutsOptions = {}
): Promise<WorkoutWithExercises[]> {
  const conditions = [eq(workoutsTable.userId, userId)];
  if (opts.from) conditions.push(gte(workoutsTable.date, opts.from));
  if (opts.to) conditions.push(lte(workoutsTable.date, opts.to));

  const rows = await db
    .select()
    .from(workoutsTable)
    .where(and(...conditions))
    .orderBy(desc(workoutsTable.date))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);

  return Promise.all(rows.map(enrichWorkout));
}

export async function createWorkout(
  userId: number,
  input: CreateWorkoutInput
): Promise<WorkoutWithExercises> {
  const [workout] = await db
    .insert(workoutsTable)
    .values({
      userId,
      activityType: input.activityType,
      name: input.name,
      date: input.date,
      durationMinutes: input.durationMinutes,
      distanceKm: input.distanceKm,
      caloriesBurned: input.caloriesBurned,
      mood: input.mood,
      notes: input.notes,
      metadata: input.metadata,
    })
    .returning();

  if (input.exercises?.length) {
    for (const ex of input.exercises) {
      const [exercise] = await db
        .insert(workoutExercisesTable)
        .values({ workoutId: workout.id, name: ex.name, order: ex.order })
        .returning();

      if (ex.sets?.length) {
        for (const set of ex.sets) {
          await db.insert(workoutSetsTable).values({
            exerciseId: exercise.id,
            reps: set.reps,
            weightKg: set.weightKg,
            rpe: set.rpe,
            completed: set.completed ?? true,
            order: set.order,
          });
        }
      }
    }
  }

  const result = await getWorkoutById(workout.id, userId);
  return result!;
}

export async function deleteWorkout(workoutId: number, userId: number): Promise<boolean> {
  const existing = await db
    .select({ id: workoutsTable.id })
    .from(workoutsTable)
    .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return false;

  await db.delete(workoutsTable).where(eq(workoutsTable.id, workoutId));
  return true;
}

export async function getPersonalRecords(
  userId: number
): Promise<Array<{ exercise: string; maxWeightKg: number }>> {
  const exerciseNames = await db
    .selectDistinct({ name: workoutExercisesTable.name })
    .from(workoutExercisesTable)
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(eq(workoutsTable.userId, userId));

  const records = await Promise.all(
    exerciseNames.map(async ({ name }) => {
      const top = await db
        .select({ weightKg: workoutSetsTable.weightKg })
        .from(workoutSetsTable)
        .innerJoin(workoutExercisesTable, eq(workoutSetsTable.exerciseId, workoutExercisesTable.id))
        .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
        .where(
          and(
            eq(workoutsTable.userId, userId),
            eq(workoutExercisesTable.name, name)
          )
        )
        .orderBy(desc(workoutSetsTable.weightKg))
        .limit(1);

      const maxWeightKg = top[0]?.weightKg ?? 0;
      return maxWeightKg > 0 ? { exercise: name, maxWeightKg } : null;
    })
  );

  return records.filter(Boolean) as Array<{ exercise: string; maxWeightKg: number }>;
}
