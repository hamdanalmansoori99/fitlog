/**
 * Structured error logger.
 * In production, only the error message is emitted so stack traces and
 * internal details don't appear in forwarded log streams.
 * In development, the full error is printed so debugging is easy.
 */
const isDev = process.env["NODE_ENV"] === "development";

export function logError(context: string, err: unknown): void {
  if (isDev) {
    console.error(context, err);
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error(context, message);
  }
}
