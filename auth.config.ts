import type { NextAuthConfig } from "next-auth";

/** Pages that need a logged-in user. Everything else (landing, menu, events, QR ordering, bills) is public. */
const PROTECTED_PAGES = ["/dashboard", "/orders", "/bills", "/admin", "/finance", "/account", "/change-password"];

/**
 * Edge-safe auth config shared by proxy.ts (no DB access here) and auth.ts.
 * `authorized()` is a first-line gate; pages and route handlers still check
 * the user (and their role) against the database via lib/authz.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // API: deny by default. Public: auth, health check, and the customer-facing /api/public/*.
      if (path.startsWith("/api")) {
        if (path.startsWith("/api/auth") || path.startsWith("/api/public") || path === "/api/health") return true;
        if (isLoggedIn) return true;
        return Response.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
      }

      if (isLoggedIn && (path === "/login" || path === "/signup")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (PROTECTED_PAGES.some((p) => path === p || path.startsWith(`${p}/`))) return isLoggedIn;
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // one long shift
    updateAge: 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
