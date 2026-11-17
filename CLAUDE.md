@AGENTS.md

# CLAUDE.md

## What this is

Eleven Eleven Lounge — a full-stack Next.js 16 (App Router) app. Same shape as CareVault: the frontend (React pages) and backend (Route Handlers under `app/api/*`) live in one Next.js project, backed by Neon Postgres through Drizzle ORM, with NextAuth v5 credentials auth.

## Commands

```bash
npm run dev           # dev server at http://localhost:3000
npm run build         # applies pending migrations, then next build
npm run lint
npm run db:generate   # write drizzle/NNNN_*.sql from lib/db/schema.ts changes
npm run db:migrate    # apply pending drizzle/ migrations to DATABASE_URL(_UNPOOLED)
npm run db:push       # sync schema straight to the DB (throwaway experiments only)
npm run db:studio     # Drizzle Studio
```

No test runner is installed.

## Schema workflow

1. Edit `lib/db/schema.ts`, run `npm run db:generate`, review and commit the SQL in `drizzle/`.
2. Run `npm run db:migrate` locally. `.env` should point at a Neon **dev** branch, never production.
3. Production builds run `scripts/migrate.mjs` before `next build` (Vercel Preview builds skip it). Never edit a merged migration; add a new one.

## Architecture

- **DB**: `lib/db/index.ts` exports the singleton `db` (postgres-js, pooled via `globalThis`, `prepare: false` for Neon's pooler). Soft deletes via `deletedAt`; always filter `isNull(table.deletedAt)` in reads.
- **Auth**: `auth.config.ts` is the edge-safe config used by `proxy.ts` (Next 16's renamed middleware); its `authorized()` callback is the single choke point. `/api/*` is deny-by-default — only `/api/auth/*` and `/api/health` are public. `auth.ts` adds the Credentials provider (DB lookup + bcrypt). JWT sessions, 8h lifetime.
- **Route handlers**: call `requireAuth()` / `requireAuth(["admin"])` from `lib/authz.ts` and return `a.error` if set. Validate bodies with zod.
- **Roles**: `users.role` is `"admin" | "staff"`; the first account to sign up becomes admin.
- **UI**: logged-in pages go under `app/(authenticated)/*` (its layout redirects to `/login` without a session). Client data fetching uses SWR with `lib/fetcher.ts`.

## Environment

`.env` (template in `.env.example`): `DATABASE_URL` (Neon pooled), `DATABASE_URL_UNPOOLED` (Neon direct, used for migrations), `AUTH_SECRET`, `AUTH_URL`.
