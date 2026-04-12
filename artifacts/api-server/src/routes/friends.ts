import { Router } from "express";
import { db, friendsTable, profilesTable, usersTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { logError } from "../lib/logger";

const router = Router();

// GET /friends — list accepted friends + pending requests
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const rows = await db.execute(sql`
      SELECT
        f.id,
        f.user_id,
        f.friend_id,
        f.status,
        f.created_at,
        u.first_name,
        u.last_name,
        p.xp,
        p.photo_url
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.user_id = ${user.id} THEN f.friend_id ELSE f.user_id END
      JOIN profiles p ON p.user_id = u.id
      WHERE (f.user_id = ${user.id} OR f.friend_id = ${user.id})
        AND f.status != 'rejected'
      ORDER BY f.created_at DESC
    `);

    const friends = ((rows as any).rows ?? Array.from(rows as any)).map((r: any) => ({
      id: r.id,
      friendUserId: r.user_id === user.id ? r.friend_id : r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      xp: r.xp ?? 0,
      photoUrl: r.photo_url,
      status: r.status,
      isIncoming: r.friend_id === user.id && r.status === "pending",
      createdAt: r.created_at,
    }));

    res.json({ friends });
  } catch (err) {
    logError("get friends error:", err);
    res.status(500).json({ error: "Failed to get friends" });
  }
});

// POST /friends/add — add friend by invite code
router.post("/add", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const { inviteCode } = req.body;

    if (!inviteCode || typeof inviteCode !== "string" || inviteCode.trim().length < 4) {
      res.status(400).json({ error: "Invalid invite code" });
      return;
    }

    const code = inviteCode.trim().toUpperCase();

    // Find friend by invite code
    const [friendProfile] = await db.select().from(profilesTable).where(eq(profilesTable.inviteCode, code)).limit(1);
    if (!friendProfile) {
      res.status(404).json({ error: "No user found with that invite code" });
      return;
    }

    if (friendProfile.userId === user.id) {
      res.status(400).json({ error: "You can't add yourself as a friend" });
      return;
    }

    // Check if friendship already exists (in either direction)
    const existing = await db.select().from(friendsTable).where(
      or(
        and(eq(friendsTable.userId, user.id), eq(friendsTable.friendId, friendProfile.userId)),
        and(eq(friendsTable.userId, friendProfile.userId), eq(friendsTable.friendId, user.id))
      )
    ).limit(1);

    if (existing.length > 0) {
      const f = existing[0];
      if (f.status === "accepted") {
        res.status(409).json({ error: "Already friends" });
        return;
      }
      if (f.status === "pending") {
        res.status(409).json({ error: "Friend request already pending" });
        return;
      }
      if (f.status === "rejected") {
        // Allow re-sending after rejection
        await db.update(friendsTable).set({ status: "pending", createdAt: new Date() }).where(eq(friendsTable.id, f.id));
        res.json({ message: "Friend request sent" });
        return;
      }
    }

    // Rate limit: max 10 pending outbound requests
    const pendingCount = await db.select({ count: sql<number>`count(*)::int` }).from(friendsTable).where(and(eq(friendsTable.userId, user.id), eq(friendsTable.status, "pending")));
    if ((pendingCount[0]?.count ?? 0) >= 10) {
      res.status(429).json({ error: "Too many pending friend requests. Wait for some to be accepted." });
      return;
    }

    await db.insert(friendsTable).values({
      userId: user.id,
      friendId: friendProfile.userId,
      status: "pending",
    });

    res.json({ message: "Friend request sent" });
  } catch (err) {
    logError("add friend error:", err);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// POST /friends/:id/accept — accept a pending request
router.post("/:id/accept", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const friendshipId = parseInt(req.params.id as string, 10);
    if (isNaN(friendshipId)) {
      res.status(400).json({ error: "Invalid friendship ID" });
      return;
    }

    const [friendship] = await db.select().from(friendsTable).where(eq(friendsTable.id, friendshipId)).limit(1);
    if (!friendship) {
      res.status(404).json({ error: "Friend request not found" });
      return;
    }

    // Only the recipient can accept
    if (friendship.friendId !== user.id) {
      res.status(403).json({ error: "Only the recipient can accept a friend request" });
      return;
    }

    if (friendship.status !== "pending") {
      res.status(400).json({ error: "Request is not pending" });
      return;
    }

    await db.update(friendsTable).set({ status: "accepted" }).where(eq(friendsTable.id, friendshipId));
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    logError("accept friend error:", err);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// DELETE /friends/:id — remove friend or cancel/reject request
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const friendshipId = parseInt(req.params.id as string, 10);
    if (isNaN(friendshipId)) {
      res.status(400).json({ error: "Invalid friendship ID" });
      return;
    }

    const [friendship] = await db.select().from(friendsTable).where(eq(friendsTable.id, friendshipId)).limit(1);
    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    // Only participants can delete
    if (friendship.userId !== user.id && friendship.friendId !== user.id) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    await db.delete(friendsTable).where(eq(friendsTable.id, friendshipId));
    res.json({ message: "Friend removed" });
  } catch (err) {
    logError("delete friend error:", err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

export default router;
