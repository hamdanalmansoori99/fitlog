import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  preferredWorkoutTime: text("preferred_workout_time"), // computed from history, e.g. "18:00"
  enabled: boolean("enabled").notNull().default(true),
  quietHoursStart: text("quiet_hours_start"), // e.g. "22:00"
  quietHoursEnd: text("quiet_hours_end"),     // e.g. "07:00"
  lastReengagementSent: timestamp("last_reengagement_sent"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;
