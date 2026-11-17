/** Unwraps a Postgres error (drizzle wraps driver errors in `.cause`). */
export function pgError(err: unknown): { code?: string; constraint?: string } | null {
  for (let e = err as Record<string, unknown> | undefined, i = 0; e && i < 3; e = e.cause as Record<string, unknown>, i++) {
    if (typeof e.code === "string") return { code: e.code, constraint: e.constraint_name as string | undefined };
  }
  return null;
}
