import { db, mealsTable, mealFoodItemsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export type MealFoodItem = typeof mealFoodItemsTable.$inferSelect;
export type MealWithFoodItems = typeof mealsTable.$inferSelect & { foodItems: MealFoodItem[] };

export interface CreateMealInput {
  name: string;
  category: string;
  date: Date;
  photoUrl?: string;
  notes?: string;
  foodItems?: Array<{
    name: string;
    portionSize: number;
    unit: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }>;
}

export interface ListMealsOptions {
  limit?: number;
  offset?: number;
  from?: Date;
  to?: Date;
}

export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

async function enrichMeal(meal: typeof mealsTable.$inferSelect): Promise<MealWithFoodItems> {
  const foodItems = await db
    .select()
    .from(mealFoodItemsTable)
    .where(eq(mealFoodItemsTable.mealId, meal.id));

  return { ...meal, foodItems };
}

export async function getMealById(
  mealId: number,
  userId: number
): Promise<MealWithFoodItems | null> {
  const rows = await db
    .select()
    .from(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, userId)))
    .limit(1);

  if (rows.length === 0) return null;
  return enrichMeal(rows[0]);
}

export async function listMeals(
  userId: number,
  opts: ListMealsOptions = {}
): Promise<MealWithFoodItems[]> {
  const conditions = [eq(mealsTable.userId, userId)];
  if (opts.from) conditions.push(gte(mealsTable.date, opts.from));
  if (opts.to) conditions.push(lte(mealsTable.date, opts.to));

  const rows = await db
    .select()
    .from(mealsTable)
    .where(and(...conditions))
    .orderBy(desc(mealsTable.date))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);

  return Promise.all(rows.map(enrichMeal));
}

export async function createMeal(
  userId: number,
  input: CreateMealInput
): Promise<MealWithFoodItems> {
  const [meal] = await db
    .insert(mealsTable)
    .values({
      userId,
      name: input.name,
      category: input.category,
      date: input.date,
      photoUrl: input.photoUrl,
      notes: input.notes,
    })
    .returning();

  if (input.foodItems?.length) {
    for (const item of input.foodItems) {
      await db.insert(mealFoodItemsTable).values({
        mealId: meal.id,
        name: item.name,
        portionSize: item.portionSize,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
      });
    }
  }

  const result = await getMealById(meal.id, userId);
  return result!;
}

export async function deleteMeal(mealId: number, userId: number): Promise<boolean> {
  const existing = await db
    .select({ id: mealsTable.id })
    .from(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return false;

  await db.delete(mealsTable).where(eq(mealsTable.id, mealId));
  return true;
}

export async function getMacroTotals(
  userId: number,
  from: Date,
  to: Date
): Promise<MacroTotals> {
  const meals = await listMeals(userId, { from, to });

  return meals.reduce(
    (totals, meal) => {
      for (const item of meal.foodItems) {
        totals.calories += item.calories;
        totals.proteinG += item.proteinG;
        totals.carbsG += item.carbsG;
        totals.fatG += item.fatG;
      }
      return totals;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}

export async function getRecentFoodNames(
  userId: number,
  limit: number = 20
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: mealFoodItemsTable.name })
    .from(mealFoodItemsTable)
    .innerJoin(mealsTable, eq(mealFoodItemsTable.mealId, mealsTable.id))
    .where(eq(mealsTable.userId, userId))
    .orderBy(desc(mealsTable.createdAt))
    .limit(limit);

  return rows.map((r) => r.name);
}
