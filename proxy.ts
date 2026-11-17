import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Runs authConfig.callbacks.authorized() on every matched request.
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  // /api is included so every API route is authenticated by default.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
