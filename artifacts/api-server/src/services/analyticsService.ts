import { db } from "@workspace/db";
import { analyticsEventsTable } from "@workspace/db";

export type EventType =
  | "workout.logged"
  | "workout.deleted"
  | "meal.logged"
  | "meal.deleted"
  | "water.logged"
  | "achievement.earned"
  | "pr.set"
  | "photo.analyzed"
  | "template.saved"
  | "template.used"
  | "template.deleted"
  | "ai_coach.queried"
  | "measurement.logged"
  | "recovery.logged";

export interface TrackEventMeta {
  platform?: string;
  sessionId?: string;
  appVersion?: string;
}

export async function trackEvent(
  userId: number,
  eventType: EventType,
  properties?: Record<string, unknown>,
  meta?: TrackEventMeta
): Promise<void> {
  try {
    await db.insert(analyticsEventsTable).values({
      userId,
      eventType,
      properties: properties ?? {},
      platform: meta?.platform,
      sessionId: meta?.sessionId,
      appVersion: meta?.appVersion,
    });
  } catch {
    // Analytics failures must never affect the main user flow
  }
}
