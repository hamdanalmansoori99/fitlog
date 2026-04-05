export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Common error factories
export const Errors = {
  notFound: (resource: string) => new AppError(404, "NOT_FOUND", `${resource} not found`),
  validation: (msg: string) => new AppError(400, "VALIDATION_ERROR", msg),
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Not authenticated"),
  forbidden: (msg = "Access denied") => new AppError(403, "FORBIDDEN", msg),
  rateLimited: () => new AppError(429, "RATE_LIMITED", "Too many requests"),
  aiUnavailable: () => new AppError(503, "AI_UNAVAILABLE", "AI features require an API key"),
  internal: (msg = "Internal server error") => new AppError(500, "INTERNAL_ERROR", msg),
} as const;
