import { pgTable, serial, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bodyMeasurementsTable = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  weightKg: real("weight_kg"),
  bodyFatPercent: real("body_fat_percent"),
  chestCm: real("chest_cm"),
  waistCm: real("waist_cm"),
  hipsCm: real("hips_cm"),
  armsCm: real("arms_cm"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("body_measurements_user_id_idx").on(table.userId),
  index("body_measurements_user_id_date_idx").on(table.userId, table.date),
]);

export const insertMeasurementSchema = createInsertSchema(bodyMeasurementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type BodyMeasurement = typeof bodyMeasurementsTable.$inferSelect;
