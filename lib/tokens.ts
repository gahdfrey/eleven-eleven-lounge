import { randomBytes } from "crypto";

/** URL-safe random secret, used in QR links and customer bill links. */
export function randomToken(bytes = 12) {
  return randomBytes(bytes).toString("base64url");
}
