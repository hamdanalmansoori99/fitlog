import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // streak | volume | consistency
  targetValue: integer("target_value").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // active | completed | cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("challenges_creator_idx").on(table.creatorId),
  index("challenges_status_idx").on(table.status),
]);

export const challengeParticipantsTable = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").references(() => challengesTable.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  progress: jsonb("progress").$type<Record<string, any>>().notNull().default({}),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  index("challenge_participants_challenge_idx").on(table.challengeId),
  index("challenge_participants_user_idx").on(table.userId),
]);

export type Challenge = typeof challengesTable.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipantsTable.$inferSelect;
