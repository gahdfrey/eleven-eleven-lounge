import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

type AuthResult =
  | { error: NextResponse; session?: never }
  | { error?: never; session: Session };

/** Use at the top of route handlers: `const a = await requireAuth(); if (a.error) return a.error;` */
export async function requireAuth(roles?: string[]): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
