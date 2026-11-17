import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { getMenu } from "@/lib/menu";

export const GET = handle(async () => NextResponse.json({ categories: await getMenu() }));
