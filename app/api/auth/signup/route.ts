import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, getUserByEmail, signupSchema } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: z.flattenError(parsed.error).fieldErrors },
        { status: 400 },
      );
    }

    if (await getUserByEmail(parsed.data.email)) {
      return NextResponse.json(
        { error: "Validation failed", errors: { email: ["Email is already registered"] } },
        { status: 409 },
      );
    }

    const user = await createUser(parsed.data);
    return NextResponse.json({ message: "Account created", user }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
