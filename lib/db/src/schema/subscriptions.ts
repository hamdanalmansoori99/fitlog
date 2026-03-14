import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Tracks each user's active plan subscription.
 * Plan definitions (features, limits) live in code — see api-server/src/lib/plans.ts.
 * The external_id and external_customer_id columns are reserved for Stripe integration.
 */
export const userSubscriptionsTable = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  planKey: text("plan_key").notNull().default("free"),
  status: text("status").notNull().default("active"),
  trialEndsAt: timestamp("trial_ends_at"),
  periodStart: timestamp("period_start").notNull().defaultNow(),
  periodEnd: timestamp("period_end"),
  cancelledAt: timestamp("cancelled_at"),
  externalId: text("external_id"),
  externalCustomerId: text("external_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("user_subscriptions_user_id_idx").on(table.userId),
  index("user_subscriptions_plan_key_idx").on(table.planKey),
  index("user_subscriptions_status_idx").on(table.status),
]);

export type UserSubscription = typeof userSubscriptionsTable.$inferSelect;
