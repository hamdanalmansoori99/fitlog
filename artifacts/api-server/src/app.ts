import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";

const app: Express = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

// Larger limits for endpoints that accept base64 image payloads.
// All other routes use a tight 1 mb cap to prevent DoS via oversized JSON bodies.
app.use("/api/meals/analyze-photo", express.json({ limit: "6mb" }));
app.use("/api/progress/photos", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use("/api", router);

export default app;
