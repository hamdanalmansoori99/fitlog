// ── Time ─────────────────────────────────────────────────────────────────────
export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const SESSION_DURATION_MS = 30 * MS_PER_DAY;

// ── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_WATER_GOAL_ML = 2000;
export const DEFAULT_WEEKLY_WORKOUT_DAYS = 3;

// ── Query limits ─────────────────────────────────────────────────────────────
export const MAX_QUERY_DAYS = 365;
export const DEFAULT_QUERY_DAYS = 30;
export const DEFAULT_PAGE_LIMIT = 20;

// ── AI timeouts ──────────────────────────────────────────────────────────────
export const AI_TIMEOUT_MS = 45 * MS_PER_SECOND;
export const EXTERNAL_API_TIMEOUT_MS = 10 * MS_PER_SECOND;
