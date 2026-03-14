import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  title: text("title").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const insertAchievementSchema = createInsertSchema(achievementsTable).omit({ id: true, earnedAt: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievementsTable.$inferSelect;
