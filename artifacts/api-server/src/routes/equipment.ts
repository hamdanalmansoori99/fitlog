import { Router } from "express";
import { db, equipmentTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const equipment = await db.select().from(equipmentTable)
      .where(eq(equipmentTable.userId, user.id));
    res.json({ equipment });
  } catch (err) {
    res.status(500).json({ error: "Failed to get equipment" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { name, category, photoUrl, notes } = req.body;
    
    const [item] = await db.insert(equipmentTable).values({
      userId: user.id,
      name,
      category,
      photoUrl,
      notes,
    }).returning();
    
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create equipment" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const equipId = parseInt(req.params.id);
    const existing = await db.select().from(equipmentTable)
      .where(and(eq(equipmentTable.id, equipId), eq(equipmentTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Equipment not found" }); return; }
    
    const { name, category, photoUrl, notes } = req.body;
    const [item] = await db.update(equipmentTable)
      .set({ name, category, photoUrl, notes, updatedAt: new Date() })
      .where(eq(equipmentTable.id, equipId))
      .returning();
    
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update equipment" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const equipId = parseInt(req.params.id);
    const existing = await db.select().from(equipmentTable)
      .where(and(eq(equipmentTable.id, equipId), eq(equipmentTable.userId, user.id))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Equipment not found" }); return; }
    await db.delete(equipmentTable).where(eq(equipmentTable.id, equipId));
    res.json({ message: "Equipment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete equipment" });
  }
});

export default router;
