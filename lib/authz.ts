import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";
import { AppError } from "@/lib/api";

export type CurrentUser = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  role: Role;
  mustChangePassword: boolean;
};

export const MANAGERS: Role[] = ["admin", "manager"];
/** Who takes orders and handles bills (everyone except finance). */
export const SERVICE: Role[] = ["admin", "manager", "staff"];
/** Who can see the finance reports and record cash handed over by staff. */
export const FINANCE: Role[] = ["admin", "manager", "finance"];

export function isManager(user: Pick<CurrentUser, "role">) {
  return MANAGERS.includes(user.role);
}

/**
 * The logged-in user, re-read from the database on every call so that a
 * deactivated account or a role change takes effect immediately.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!id) return null;
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      firstname: users.firstname,
      lastname: users.lastname,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.active, true), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

/** For route handlers: throws 401/403 AppErrors (use inside `handle()`). */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Your session has expired. Please log in again.", 401);
  if (roles && !roles.includes(user.role)) throw new AppError("You don't have permission to do that.", 403);
  return user;
}

/** For server-component pages: redirects instead of throwing. */
export async function requirePageUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (roles && !roles.includes(user.role)) redirect(user.role === "finance" ? "/finance" : "/orders");
  return user;
}
