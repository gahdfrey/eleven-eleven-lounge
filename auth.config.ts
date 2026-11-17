import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config shared by proxy.ts (no DB access here) and auth.ts.
 * `authorized()` is the single choke point for route access.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // API: deny by default. Handlers still do their own role checks.
      if (path.startsWith("/api")) {
        if (path.startsWith("/api/auth")) return true;
        if (path === "/api/health") return true;
        if (isLoggedIn) return true;
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (isLoggedIn && (path === "/login" || path === "/signup")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (path.startsWith("/dashboard")) return isLoggedIn; // false → /login
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
