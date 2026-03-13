import { pgTable, serial, integer, real, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const recoveryLogsTable = pgTable("recovery_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  sleepHours: real("sleep_hours"),
  sleepQuality: integer("sleep_quality"),     // 1–5
  energyLevel: integer("energy_level"),       // 1–5
  stressLevel: integer("stress_level"),       // 1–5
  overallFeeling: integer("overall_feeling"), // 1–5
  soreness: jsonb("soreness").$type<Record<string, number>>().notNull().default({}), // body_part → 0–3
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecoveryLogSchema = createInsertSchema(recoveryLogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecoveryLog = z.infer<typeof insertRecoveryLogSchema>;
export type RecoveryLog = typeof recoveryLogsTable.$inferSelect;
