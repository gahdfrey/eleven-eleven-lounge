import { NextResponse } from "next/server";
import { z } from "zod";

/** An error whose message is safe to show the user; route handlers turn it into a 4xx. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Parse a JSON body against a zod schema; returns the data or a 400 response. */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: jsonError("Invalid JSON body") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    const first = Object.values(fieldErrors).flat()[0] ?? parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: jsonError(first, 400, { errors: fieldErrors }) };
  }
  return { data: parsed.data };
}

/** Wrap a handler so AppErrors become clean JSON responses and anything else a 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) return jsonError(err.message, err.status);
      console.error(err);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}

export function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Not found", 404);
  return id;
}
