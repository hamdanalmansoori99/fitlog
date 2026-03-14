import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().default({}),
  platform: text("platform"),
  appVersion: text("app_version"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("analytics_events_user_id_idx").on(table.userId),
  index("analytics_events_event_type_idx").on(table.eventType),
  index("analytics_events_created_at_idx").on(table.createdAt),
  index("analytics_events_user_event_idx").on(table.userId, table.eventType),
]);

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
