import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { changeFingerprint } from "@/lib/live";

/** Customer menu pages poll this so sold-out items and prices update without a reload. */
export const GET = handle(async () =>
  NextResponse.json(
    { v: await changeFingerprint("public") },
    // Same answer for every customer: let Vercel's CDN serve it, so hundreds of
    // phones polling cost roughly one database read every couple of seconds.
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=10" } },
  ),
);
