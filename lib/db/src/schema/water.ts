import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const waterLogsTable = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  amountMl: integer("amount_ml").notNull(),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const insertWaterLogSchema = createInsertSchema(waterLogsTable).omit({ id: true });
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;
export type WaterLog = typeof waterLogsTable.$inferSelect;
