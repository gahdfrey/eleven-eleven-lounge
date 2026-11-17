import { headers } from "next/headers";
import { lanAddresses } from "./lan";

/**
 * Public origin used inside QR codes, e.g. https://eleven-eleven-lounge.vercel.app.
 * Set NEXT_PUBLIC_APP_URL to pin a custom domain. In local development a
 * "localhost" origin is swapped for this computer's Wi-Fi address, because a
 * phone scanning the code can't open "localhost".
 */
export async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  let host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  if (isLocal && process.env.NODE_ENV === "development") {
    const lan = lanAddresses()[0];
    if (lan) host = host.replace(/^(localhost|127\.0\.0\.1)/, lan);
  }
  const proto = h.get("x-forwarded-proto") ?? (isLocal || /^\d+\.\d+\.\d+\.\d+/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
