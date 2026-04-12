import { Router } from "express";
import { db, usersTable, sessionsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { sendEmail } from "../lib/email";
import { logError } from "../lib/logger";
import rateLimit from "express-rate-limit";
import * as crypto from "crypto";

const router = Router();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reset attempts. Please try again later." },
});

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const APP_URL = process.env.APP_URL ?? "ordeal://";

// POST /auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: "If that email is registered, a reset link has been sent." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const resetLink = `${APP_URL}auth/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Ordeal — Reset Your Password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${user.firstName},</p>
          <p>We received a request to reset your Ordeal password. Click the button below to set a new password:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    logError("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: "Password must be at least 8 characters with an uppercase letter and a number" });
      return;
    }

    const [resetToken] = await db.select().from(passwordResetTokensTable)
      .where(and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
      ))
      .limit(1);

    if (!resetToken) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    if (new Date() > resetToken.expiresAt) {
      res.status(400).json({ error: "Reset token has expired. Please request a new one." });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Update password, mark token used, invalidate all sessions — all in one transaction
    await db.transaction(async (tx: typeof db) => {
      await tx.update(usersTable)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(usersTable.id, resetToken.userId));

      await tx.update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokensTable.id, resetToken.id));

      await tx.delete(sessionsTable)
        .where(eq(sessionsTable.userId, resetToken.userId));
    });

    res.json({ message: "Password has been reset successfully. Please log in with your new password." });
  } catch (err) {
    logError("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
