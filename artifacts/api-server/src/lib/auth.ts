import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

// ── Typed authenticated request ──────────────────────────────────────────────
type User = typeof usersTable.$inferSelect;

export interface AuthenticatedRequest extends Request {
  user: User;
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Supports both new bcrypt hashes and legacy SHA256 hashes.
// Returns true if the password matches. If the hash is a legacy SHA256,
// the caller should re-hash and update the stored hash.
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(password, storedHash);
  }
  // Legacy SHA256 hash
  const legacyHash = crypto.createHash("sha256").update(password + "fitlog_salt_2024").digest("hex");
  return storedHash === legacyHash;
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.cookies?.session;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const sessions = await db
      .select({ session: sessionsTable, user: usersTable })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(eq(sessionsTable.id, token))
      .limit(1);

    if (sessions.length === 0) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    const { session, user } = sessions[0];

    if (new Date() > session.expiresAt) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
      res.status(401).json({ error: "Session expired" });
      return;
    }

    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).sessionId = token;

    // Throttled last_active_at update (fire-and-forget, once per 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastActiveAt || user.lastActiveAt < fiveMinAgo) {
      db.update(usersTable)
        .set({ lastActiveAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .then(() => {})
        .catch(() => {});
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

export function getUser(req: Request): User {
  return (req as AuthenticatedRequest).user;
}
