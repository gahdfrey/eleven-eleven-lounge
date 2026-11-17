import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getActiveStaff } from "@/lib/menu";

export const GET = handle(async () => NextResponse.json({ staff: await getActiveStaff() }));
