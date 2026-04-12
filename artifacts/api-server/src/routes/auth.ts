import { Router } from "express";
import { db, usersTable, sessionsTable, profilesTable, settingsTable, referralsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword, verifyPassword, generateSessionId, requireAuth, getUser } from "../lib/auth";
import { ensureFreeSubscription } from "../services/subscriptionService";
import { logError } from "../lib/logger";
import rateLimit from "express-rate-limit";

/** Generate a unique 8-character alphanumeric invite code. */
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// 10 attempts per 15 minutes per IP — brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

const router = Router();

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, inviteCode: referralCode, deviceFingerprint } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "All fields required" });
      return;
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    if (typeof firstName !== "string" || firstName.trim().length < 1 || firstName.trim().length > 100) {
      res.status(400).json({ error: "First name must be between 1 and 100 characters" });
      return;
    }

    if (typeof lastName !== "string" || lastName.trim().length < 1 || lastName.trim().length > 100) {
      res.status(400).json({ error: "Last name must be between 1 and 100 characters" });
      return;
    }

    if (typeof password !== "string" || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: "Password must be at least 8 characters with an uppercase letter and a number" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      deviceFingerprint: typeof deviceFingerprint === "string" ? deviceFingerprint : null,
    }).returning();

    // Create default profile with unique invite code
    const userInviteCode = generateInviteCode();
    await db.insert(profilesTable).values({
      userId: user.id,
      fitnessGoals: [],
      inviteCode: userInviteCode,
    });

    // Create default settings
    await db.insert(settingsTable).values({
      userId: user.id,
    });

    // Create free subscription
    await ensureFreeSubscription(user.id);

    // Process referral if invite code provided
    if (typeof referralCode === "string" && referralCode.trim()) {
      try {
        const [referrerProfile] = await db.select().from(profilesTable).where(eq(profilesTable.inviteCode, referralCode.trim().toUpperCase())).limit(1);
        if (referrerProfile && referrerProfile.userId !== user.id) {
          // Grant referee 7-day premium
          const now = new Date();
          const refereePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          await db.update(userSubscriptionsTable).set({ planKey: "premium", periodEnd: refereePeriodEnd }).where(eq(userSubscriptionsTable.userId, user.id));

          // Check referrer abuse (max 5 rewarded referrals)
          const referrerRewardCount = await db.select({ count: sql<number>`count(*)::int` }).from(referralsTable).where(and(eq(referralsTable.referrerId, referrerProfile.userId), eq(referralsTable.rewardGrantedToReferrer, true)));
          const referrerAtCap = (referrerRewardCount[0]?.count ?? 0) >= 5;

          // Check device fingerprint abuse
          let deviceMatch = false;
          if (deviceFingerprint) {
            const existingDeviceReferrals = await db.execute(sql`
              SELECT 1 FROM referrals r
              JOIN users u ON u.id = r.referee_id
              WHERE r.referrer_id = ${referrerProfile.userId}
                AND u.device_fingerprint = ${deviceFingerprint}
              LIMIT 1
            `);
            const rows = (existingDeviceReferrals as any).rows ?? Array.from(existingDeviceReferrals as any);
            deviceMatch = rows.length > 0;
          }

          const grantToReferrer = !referrerAtCap && !deviceMatch;
          if (grantToReferrer) {
            // Extend referrer's premium by 7 days
            const [referrerSub] = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, referrerProfile.userId)).limit(1);
            const baseDate = referrerSub?.periodEnd && referrerSub.periodEnd > now ? referrerSub.periodEnd : now;
            const referrerPeriodEnd = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            await db.update(userSubscriptionsTable).set({ planKey: "premium", periodEnd: referrerPeriodEnd }).where(eq(userSubscriptionsTable.userId, referrerProfile.userId));
          }

          await db.insert(referralsTable).values({
            referrerId: referrerProfile.userId,
            refereeId: user.id,
            rewardGrantedToReferrer: grantToReferrer,
            rewardGrantedToReferee: true,
            deviceFingerprintMatch: deviceMatch,
          });
        }
      } catch (refErr) {
        logError("Referral processing error (non-fatal):", refErr);
      }
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS); // 30 days

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      token: sessionId,
    });
  } catch (err: any) {
    // Unique constraint violation — two concurrent registrations with the same email
    if (err?.code === "23505" || err?.message?.includes("unique")) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    logError("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Block demo account login in production
    if (process.env.NODE_ENV === "production" && normalizedEmail === "demo@ordeal.app") {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users[0];
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Silently migrate legacy SHA256 hash to bcrypt on successful login
    if (!user.passwordHash.startsWith("$2")) {
      const newHash = await hashPassword(password);
      await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      token: sessionId,
    });
  } catch (err) {
    logError("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    const sessionId = (req as any).sessionId;
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Revoke every active session for this account (e.g. after password change or suspected compromise)
router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));
    res.json({ message: "All sessions revoked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke sessions" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
  });
});

export default router;
