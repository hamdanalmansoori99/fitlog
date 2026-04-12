import { Router } from "express";
import { db, challengesTable, challengeParticipantsTable, friendsTable, usersTable, profilesTable } from "@workspace/db";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

// Validate challenge type
const VALID_TYPES = ["streak", "volume", "consistency"];

/** Get all friend user IDs for a given user. */
async function getFriendIds(userId: number): Promise<number[]> {
  const rows = await db.select({
    friendId: sql<number>`CASE WHEN ${friendsTable.userId} = ${userId} THEN ${friendsTable.friendId} ELSE ${friendsTable.userId} END`,
  }).from(friendsTable).where(
    and(
      or(eq(friendsTable.userId, userId), eq(friendsTable.friendId, userId)),
      eq(friendsTable.status, "accepted")
    )
  );
  return rows.map((r: any) => r.friendId);
}

// POST /challenges — create a challenge
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { title, type, targetValue, startDate, endDate } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      res.status(400).json({ error: "Title is required (min 2 characters)" });
      return;
    }
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "Type must be streak, volume, or consistency" });
      return;
    }
    if (!targetValue || typeof targetValue !== "number" || targetValue < 1) {
      res.status(400).json({ error: "Target value must be a positive number" });
      return;
    }
    if (!startDate || !endDate) {
      res.status(400).json({ error: "Start and end dates are required" });
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      res.status(400).json({ error: "Invalid date range" });
      return;
    }

    const [challenge] = await db.insert(challengesTable).values({
      creatorId: user.id,
      title: title.trim(),
      type,
      targetValue,
      startDate: start,
      endDate: end,
    }).returning();

    // Auto-add creator as participant
    await db.insert(challengeParticipantsTable).values({
      challengeId: challenge.id,
      userId: user.id,
    });

    res.status(201).json({ challenge });
  } catch (err) {
    logError("create challenge error:", err);
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

// GET /challenges — list user's challenges
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const rows = await db.execute(sql`
      SELECT DISTINCT c.*
      FROM challenges c
      LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
      WHERE c.creator_id = ${user.id} OR cp.user_id = ${user.id}
      ORDER BY c.created_at DESC
    `);

    const challenges = (rows as any).rows ?? Array.from(rows as any);
    res.json({ challenges });
  } catch (err) {
    logError("list challenges error:", err);
    res.status(500).json({ error: "Failed to list challenges" });
  }
});

// GET /challenges/:id — challenge detail with leaderboard
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    // Verify user is a participant or creator
    const [participation] = await db.select().from(challengeParticipantsTable).where(
      and(eq(challengeParticipantsTable.challengeId, challengeId), eq(challengeParticipantsTable.userId, user.id))
    ).limit(1);

    if (!participation && challenge.creatorId !== user.id) {
      res.status(403).json({ error: "Not authorized to view this challenge" });
      return;
    }

    // Get leaderboard — only show friends
    const friendIds = await getFriendIds(user.id);
    const allowedIds = [user.id, ...friendIds];

    const leaderboard = await db.execute(sql`
      SELECT cp.user_id, cp.progress, cp.joined_at,
             u.first_name, u.last_name, p.xp, p.photo_url
      FROM challenge_participants cp
      JOIN users u ON u.id = cp.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE cp.challenge_id = ${challengeId}
        AND cp.user_id = ANY(${allowedIds})
      ORDER BY (cp.progress->>'value')::int DESC NULLS LAST
    `);

    const participants = ((leaderboard as any).rows ?? Array.from(leaderboard as any)).map((r: any) => ({
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      xp: r.xp ?? 0,
      photoUrl: r.photo_url,
      progress: r.progress,
      joinedAt: r.joined_at,
    }));

    res.json({ challenge, participants });
  } catch (err) {
    logError("get challenge detail error:", err);
    res.status(500).json({ error: "Failed to get challenge" });
  }
});

// POST /challenges/:id/invite — invite a friend
router.post("/:id/invite", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const challengeId = parseInt(req.params.id as string, 10);
    const { friendUserId } = req.body;

    if (isNaN(challengeId) || !friendUserId || typeof friendUserId !== "number") {
      res.status(400).json({ error: "Invalid challenge or friend ID" });
      return;
    }

    // Verify challenge exists and user is a participant
    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    // Verify they are friends
    const friendIds = await getFriendIds(user.id);
    if (!friendIds.includes(friendUserId)) {
      res.status(403).json({ error: "You can only invite friends" });
      return;
    }

    // Check if already a participant
    const [existing] = await db.select().from(challengeParticipantsTable).where(
      and(eq(challengeParticipantsTable.challengeId, challengeId), eq(challengeParticipantsTable.userId, friendUserId))
    ).limit(1);

    if (existing) {
      res.status(409).json({ error: "User is already in this challenge" });
      return;
    }

    await db.insert(challengeParticipantsTable).values({
      challengeId,
      userId: friendUserId,
    });

    res.json({ message: "Friend invited to challenge" });
  } catch (err) {
    logError("invite to challenge error:", err);
    res.status(500).json({ error: "Failed to invite friend" });
  }
});

// POST /challenges/:id/join — accept challenge invite
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    // Check already exists
    const [existing] = await db.select().from(challengeParticipantsTable).where(
      and(eq(challengeParticipantsTable.challengeId, challengeId), eq(challengeParticipantsTable.userId, user.id))
    ).limit(1);

    if (existing) {
      res.status(409).json({ error: "Already in this challenge" });
      return;
    }

    await db.insert(challengeParticipantsTable).values({
      challengeId,
      userId: user.id,
    });

    res.json({ message: "Joined challenge" });
  } catch (err) {
    logError("join challenge error:", err);
    res.status(500).json({ error: "Failed to join challenge" });
  }
});

// PUT /challenges/:id/progress — update progress
router.put("/:id/progress", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const challengeId = parseInt(req.params.id as string, 10);
    const { progress } = req.body;

    if (isNaN(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID" });
      return;
    }

    if (!progress || typeof progress !== "object") {
      res.status(400).json({ error: "Progress data is required" });
      return;
    }

    const [participation] = await db.select().from(challengeParticipantsTable).where(
      and(eq(challengeParticipantsTable.challengeId, challengeId), eq(challengeParticipantsTable.userId, user.id))
    ).limit(1);

    if (!participation) {
      res.status(404).json({ error: "Not a participant in this challenge" });
      return;
    }

    await db.update(challengeParticipantsTable).set({ progress }).where(eq(challengeParticipantsTable.id, participation.id));
    res.json({ message: "Progress updated" });
  } catch (err) {
    logError("update challenge progress error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

export default router;
