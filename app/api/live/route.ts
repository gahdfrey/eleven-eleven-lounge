import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { changeFingerprint } from "@/lib/live";

/** Staff screens poll this; when the value changes they redraw with fresh data. */
export const GET = handle(async () => {
  await requireUser();
  return NextResponse.json({ v: await changeFingerprint("staff") }, { headers: { "Cache-Control": "no-store" } });
});
