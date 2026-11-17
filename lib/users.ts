import bcrypt from "bcryptjs";
import { and, eq, isNull, max, or } from "drizzle-orm";
import { db } from "./db";
import { users, type Role } from "./db/schema";
import { pgError } from "./db/errors";

export const USERNAME_PREFIX = "11:11/";
/** Every new account and every password reset starts with this; the user must change it on first login. */
export const DEFAULT_PASSWORD = "Password1";

export const PASSWORD_RULES = {
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  message: "At least 8 characters, with an uppercase letter, a lowercase letter and a number",
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

/** Login accepts the 11:11/N username (case-insensitive) or an email address. */
export async function getUserForLogin(identifier: string) {
  const value = identifier.trim();
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        or(eq(users.username, value), eq(users.email, value.toLowerCase())),
        eq(users.active, true),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  return user;
}

export async function countUsers() {
  const [row] = await db.select({ n: max(users.staffNo) }).from(users);
  return row?.n ?? 0;
}

/**
 * Creates an account with the next sequential username (11:11/1, 11:11/2, …).
 * The unique index on staff_no makes concurrent creations safe: a clash just retries.
 */
export async function createUserWithSequence(data: {
  firstname: string;
  lastname: string;
  role: Role;
  phone?: string | null;
  email?: string | null;
  password?: string;
  mustChangePassword?: boolean;
}) {
  const password = await hashPassword(data.password ?? DEFAULT_PASSWORD);
  for (let attempt = 0; attempt < 5; attempt++) {
    const staffNo = (await countUsers()) + 1;
    try {
      const [user] = await db
        .insert(users)
        .values({
          staffNo,
          username: `${USERNAME_PREFIX}${staffNo}`,
          firstname: data.firstname,
          lastname: data.lastname,
          role: data.role,
          phone: data.phone || null,
          email: data.email || null,
          password,
          mustChangePassword: data.mustChangePassword ?? true,
        })
        .returning({ id: users.id, username: users.username, staffNo: users.staffNo });
      return user;
    } catch (err) {
      const pg = pgError(err);
      if (pg?.code === "23505" && pg.constraint !== "users_email_unique") continue; // sequence race, retry
      throw err;
    }
  }
  throw new Error("Could not allocate a username, please try again");
}

export function displayName(u: { firstname: string; lastname: string }) {
  return `${u.firstname} ${u.lastname.charAt(0)}.`;
}
