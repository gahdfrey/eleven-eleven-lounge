import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { changeFingerprint } from "@/lib/live";

/** Customer menu pages poll this so sold-out items and prices update without a reload. */
export const GET = handle(async () =>
  NextResponse.json({ v: await changeFingerprint("public") }, { headers: { "Cache-Control": "no-store" } }),
);
