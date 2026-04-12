import { Router } from "express";
import { db, userWorkoutTemplatesTable, workoutsTable, workoutExercisesTable, workoutSetsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

// GET /workouts/my-templates
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const templates = await db.select().from(userWorkoutTemplatesTable)
      .where(eq(userWorkoutTemplatesTable.userId, user.id))
      .orderBy(
        desc(userWorkoutTemplatesTable.isFavorite),
        desc(userWorkoutTemplatesTable.usageCount),
        desc(userWorkoutTemplatesTable.createdAt)
      );
    res.json({ templates });
  } catch (err) {
    logError("Get templates error:", err);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

// POST /workouts/my-templates  (create, optionally from a past workout)
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    // Enforce plan template limit
    const { getActiveSubscription } = await import("../services/subscriptionService");
    const sub = await getActiveSubscription(user.id, user.role);
    const limit = sub.plan.limits.maxSavedTemplates;
    if (isFinite(limit)) {
      const existing = await db.select().from(userWorkoutTemplatesTable)
        .where(eq(userWorkoutTemplatesTable.userId, user.id));
      if (existing.length >= limit) {
        res.status(403).json({
          error: `Template limit reached (${limit} on ${sub.plan.name} plan). Upgrade to save unlimited templates.`,
          feature: "unlimitedTemplates",
          limit,
          current: existing.length,
          upgradeAvailable: true,
        });
        return;
      }
    }

    const { name, activityType, description, estimatedMinutes, exercises, sourceWorkoutId } = req.body;

    let resolvedExercises = exercises ?? [];
    let resolvedActivity = activityType ?? "gym";
    let resolvedMinutes = estimatedMinutes ?? null;

    // Auto-populate from a past workout if sourceWorkoutId provided
    if (sourceWorkoutId) {
      const [workout] = await db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.id, sourceWorkoutId), eq(workoutsTable.userId, user.id)))
        .limit(1);
      if (workout) {
        resolvedActivity = workout.activityType;
        resolvedMinutes = workout.durationMinutes ?? resolvedMinutes;
        const exRows = await db.select().from(workoutExercisesTable)
          .where(eq(workoutExercisesTable.workoutId, workout.id))
          .orderBy(workoutExercisesTable.order);
        resolvedExercises = await Promise.all(exRows.map(async (ex) => {
          const sets = await db.select().from(workoutSetsTable)
            .where(eq(workoutSetsTable.exerciseId, ex.id))
            .orderBy(workoutSetsTable.order);
          return {
            name: ex.name,
            order: ex.order,
            sets: sets.map((s) => ({ reps: s.reps ?? undefined, weightKg: s.weightKg ?? undefined, rpe: s.rpe ?? undefined })),
          };
        }));
      }
    }

    const [template] = await db.insert(userWorkoutTemplatesTable).values({
      userId: user.id,
      name: name || "My Template",
      activityType: resolvedActivity,
      description: description ?? null,
      estimatedMinutes: resolvedMinutes,
      exercises: resolvedExercises,
      isFavorite: false,
      usageCount: 0,
    }).returning();

    res.status(201).json({ template });
  } catch (err) {
    logError("Create template error:", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// PUT /workouts/my-templates/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    const { name, activityType, description, estimatedMinutes, exercises, isFavorite } = req.body;

    const [template] = await db.update(userWorkoutTemplatesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(activityType !== undefined && { activityType }),
        ...(description !== undefined && { description }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(exercises !== undefined && { exercises }),
        ...(isFavorite !== undefined && { isFavorite }),
        updatedAt: new Date(),
      })
      .where(and(eq(userWorkoutTemplatesTable.id, id), eq(userWorkoutTemplatesTable.userId, user.id)))
      .returning();

    if (!template) { res.status(404).json({ error: "Template not found" }); return; }
    res.json({ template });
  } catch (err) {
    logError("Update template error:", err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// DELETE /workouts/my-templates/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    await db.delete(userWorkoutTemplatesTable)
      .where(and(eq(userWorkoutTemplatesTable.id, id), eq(userWorkoutTemplatesTable.userId, user.id)));
    res.json({ ok: true });
  } catch (err) {
    logError("Delete template error:", err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// POST /workouts/my-templates/:id/favorite  (toggle)
router.post("/:id/favorite", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    const [existing] = await db.select().from(userWorkoutTemplatesTable)
      .where(and(eq(userWorkoutTemplatesTable.id, id), eq(userWorkoutTemplatesTable.userId, user.id)));
    if (!existing) { res.status(404).json({ error: "Template not found" }); return; }

    const [template] = await db.update(userWorkoutTemplatesTable)
      .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
      .where(eq(userWorkoutTemplatesTable.id, id))
      .returning();
    res.json({ template });
  } catch (err) {
    logError("Toggle favorite error:", err);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

// POST /workouts/my-templates/:id/use  (increment usage count)
router.post("/:id/use", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params.id as string);
    const [existing] = await db.select().from(userWorkoutTemplatesTable)
      .where(and(eq(userWorkoutTemplatesTable.id, id), eq(userWorkoutTemplatesTable.userId, user.id)));
    if (!existing) { res.status(404).json({ error: "Template not found" }); return; }

    const [template] = await db.update(userWorkoutTemplatesTable)
      .set({ usageCount: sql`${userWorkoutTemplatesTable.usageCount} + 1`, lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(userWorkoutTemplatesTable.id, id))
      .returning();

    res.json({ template });
  } catch (err) {
    logError("Record usage error:", err);
    res.status(500).json({ error: "Failed to record usage" });
  }
});

export default router;
