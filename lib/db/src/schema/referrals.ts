import { pgTable, serial, integer, boolean, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  refereeId: integer("referee_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  rewardGrantedToReferrer: boolean("reward_granted_to_referrer").notNull().default(false),
  rewardGrantedToReferee: boolean("reward_granted_to_referee").notNull().default(false),
  deviceFingerprintMatch: boolean("device_fingerprint_match").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("referrals_referrer_idx").on(table.referrerId),
  index("referrals_referee_idx").on(table.refereeId),
]);

export type Referral = typeof referralsTable.$inferSelect;
