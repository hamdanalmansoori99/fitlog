import { pgTable, serial, integer, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const progressPhotosTable = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  note: text("note").notNull().default(""),
  imageData: text("image_data").notNull(),
  mimeType: varchar("mime_type", { length: 50 }).notNull().default("image/jpeg"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("progress_photos_user_id_idx").on(table.userId),
]);

export type ProgressPhoto = typeof progressPhotosTable.$inferSelect;
