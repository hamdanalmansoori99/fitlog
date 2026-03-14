import { Router } from "express";
import { db, usersTable, sessionsTable, profilesTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateSessionId, requireAuth, getUser } from "../lib/auth";
import { ensureFreeSubscription } from "../services/subscriptionService";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

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

    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }).returning();

    // Create default profile
    await db.insert(profilesTable).values({
      userId: user.id,
      fitnessGoals: [],
    });

    // Create default settings
    await db.insert(settingsTable).values({
      userId: user.id,
    });

    // Create free subscription
    await ensureFreeSubscription(user.id);

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users[0];
    if (hashPassword(password) !== user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
    console.error("Login error:", err);
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
