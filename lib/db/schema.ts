import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Single source of truth for every table. After editing, run
 * `npm run db:generate` to write a migration into drizzle/, then
 * `npm run db:migrate` to apply it.
 */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    /** "admin" | "staff" — the first account created becomes admin. */
    role: text("role").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    /** Soft delete: filter `isNull(users.deletedAt)` in reads. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
