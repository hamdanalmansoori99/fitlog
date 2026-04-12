import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { seedDemoAccount } from "./routes/dev";
import { AppError } from "./lib/errors";
import { logError } from "./lib/logger";

const app: Express = express();

// ── Reverse proxy (Railway, Render, etc.) ────────────────────────────────────
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const rawCorsOrigin = process.env["CORS_ORIGIN"];
const allowedOrigins: string[] = rawCorsOrigin
  ? rawCorsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: allowedOrigins.length > 0
    ? (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) { callback(null, true); return; }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
        }
      }
    : false,
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
// Global: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(globalLimiter);

// Stricter limit for AI endpoints: 10 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit exceeded, please wait before trying again" },
});
app.use("/api/coach", aiLimiter);
app.use("/api/scan-meal", aiLimiter);
app.use("/api/meals/analyze-photo", aiLimiter);
app.use("/api/meals/generate-plan", aiLimiter);
app.use("/api/meals/generate-day-plan", aiLimiter);
app.use("/api/meals/generate-week-plan", aiLimiter);
app.use("/api/meals/generate-grocery-list", aiLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
// Larger limits for endpoints that accept base64 image payloads.
// All other routes use a tight 1 mb cap to prevent DoS via oversized JSON bodies.
app.use("/api/meals/analyze-photo", express.json({ limit: "6mb" }));
app.use("/api/progress/photos", express.json({ limit: "4mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use("/api", router);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  logError("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
});

// Auto-seed demo account in non-production environments
if (process.env.NODE_ENV !== "production") {
  seedDemoAccount().catch((err) =>
    console.warn("[dev] Demo account seed failed:", err?.message)
  );
}

export default app;
