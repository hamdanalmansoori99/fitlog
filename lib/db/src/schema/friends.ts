import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const friendsTable = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  friendId: integer("friend_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("friends_user_friend_idx").on(table.userId, table.friendId),
  index("friends_friend_status_idx").on(table.friendId, table.status),
]);

export type Friend = typeof friendsTable.$inferSelect;
