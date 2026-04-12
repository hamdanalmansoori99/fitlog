import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth";
import { sendWeeklyDigests } from "../services/weeklyDigest";
import { logError } from "../lib/logger";

const router = Router();

// POST /digest/trigger — trigger weekly digest (admin/cron only)
router.post("/trigger", async (req, res) => {
  try {
    // Simple auth: require CRON_SECRET header in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers["x-cron-secret"] !== cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await sendWeeklyDigests();
    res.json({ message: "Weekly digest sent", ...result });
  } catch (err) {
    logError("digest trigger error:", err);
    res.status(500).json({ error: "Failed to trigger digest" });
  }
});

export default router;
