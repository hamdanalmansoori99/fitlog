import { Router } from "express";
import { db, customExercisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

// GET /custom-exercises — list user's custom exercises
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const exercises = await db.select().from(customExercisesTable)
      .where(eq(customExercisesTable.userId, user.id))
      .orderBy(customExercisesTable.name);
    res.json({ exercises });
  } catch (err) {
    logError("list custom exercises error:", err);
    res.status(500).json({ error: "Failed to get custom exercises" });
  }
});

// POST /custom-exercises — create a custom exercise
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { name, category, primaryMuscle, secondaryMuscles, instructions, equipment } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      res.status(400).json({ error: "Exercise name is required" });
      return;
    }
    if (!category || typeof category !== "string") {
      res.status(400).json({ error: "Category is required" });
      return;
    }
    if (!primaryMuscle || typeof primaryMuscle !== "string") {
      res.status(400).json({ error: "Primary muscle is required" });
      return;
    }

    const [exercise] = await db.insert(customExercisesTable).values({
      userId: user.id,
      name: name.trim(),
      category,
      primaryMuscle,
      secondaryMuscles: Array.isArray(secondaryMuscles) ? secondaryMuscles : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      equipment: typeof equipment === "string" ? equipment : null,
    }).returning();

    res.status(201).json({ exercise });
  } catch (err) {
    logError("create custom exercise error:", err);
    res.status(500).json({ error: "Failed to create custom exercise" });
  }
});

// PUT /custom-exercises/:id — update a custom exercise
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid exercise ID" });
      return;
    }

    const [existing] = await db.select().from(customExercisesTable)
      .where(and(eq(customExercisesTable.id, id), eq(customExercisesTable.userId, user.id)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Custom exercise not found" });
      return;
    }

    const { name, category, primaryMuscle, secondaryMuscles, instructions, equipment } = req.body;
    const updates: Record<string, any> = {};
    if (name && typeof name === "string") updates.name = name.trim();
    if (category && typeof category === "string") updates.category = category;
    if (primaryMuscle && typeof primaryMuscle === "string") updates.primaryMuscle = primaryMuscle;
    if (Array.isArray(secondaryMuscles)) updates.secondaryMuscles = secondaryMuscles;
    if (Array.isArray(instructions)) updates.instructions = instructions;
    if (equipment !== undefined) updates.equipment = typeof equipment === "string" ? equipment : null;

    const [updated] = await db.update(customExercisesTable).set(updates)
      .where(eq(customExercisesTable.id, id))
      .returning();

    res.json({ exercise: updated });
  } catch (err) {
    logError("update custom exercise error:", err);
    res.status(500).json({ error: "Failed to update custom exercise" });
  }
});

// DELETE /custom-exercises/:id — delete a custom exercise
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid exercise ID" });
      return;
    }

    const result = await db.delete(customExercisesTable)
      .where(and(eq(customExercisesTable.id, id), eq(customExercisesTable.userId, user.id)))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "Custom exercise not found" });
      return;
    }

    res.json({ message: "Custom exercise deleted" });
  } catch (err) {
    logError("delete custom exercise error:", err);
    res.status(500).json({ error: "Failed to delete custom exercise" });
  }
});

export default router;
