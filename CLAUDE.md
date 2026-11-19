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

## What the app does

The core problem is staff theft: money not remitted and stock not accounted for. Everything is built so every naira and every bottle is tied to one staff member.

- **Customers (no login)** scan a table QR (`/t/<qrToken>`), browse the menu, pick the staff member serving them (dropdown of `staff`-role users only), and order (menu is tabbed by category). This opens a **bill** owned by that staff member; the customer follows it live at `/bill/<accessToken>` and can order more. Public pages: `/`, `/menu`, `/events`.
- **Staff** can also raise orders themselves at `/orders/new` (walk-up customers, no QR); the bill is theirs and the order is accepted immediately.
- **Staff** get a notification (polling + chime + optional browser notification), accept or decline the order on `/orders` (staff see only their own; managers/admins see everyone's by default, `?scope=mine` narrows it, and today's handled orders stay listed), mark orders served, and record payment (cash / transfer / POS) from the bill, the bills table, Live orders, or the pop-up that opens when a notification is tapped (`BillQuickView`). Customers see served items struck through with an "on its way" message, and can keep ordering until the bill is paid.
- **Managers/admins** manage menu, stock, tables/QR, events, and see `/admin/reports`: per-staff sales, payment split, voids, open bills, and **cash outstanding** (cash collected minus remittances recorded).
- **Website** (`/`): the lounge's public site. A Three.js portal hero flies through on scroll (`components/site/PortalScene.tsx`), and a 3D clock settles on 11:11 by the booking form (`ClockScene.tsx`). Framer Motion handles reveals, a pinned horizontal "The Nights" track, tilt cards and the intro loader. Venue facts, nights, FAQs and copy live in `lib/site.ts`. The menu and events sections read live data. Both scenes load client-only (`next/dynamic` with `ssr: false`), pause off screen, cap the pixel ratio and honour reduced motion. The display font is Syncopate (`lib/fonts.ts`, `font-display`).
- **Reservations**: the website form posts to `/api/public/reservations` (zod schema, a honeypot, idempotent `ref`, max 2 active bookings per phone per night, open nights only, at most 90 days ahead). It lands as `pending` in the `reservations` table and notifies managers. Staff manage bookings at `/reservations` (SERVICE roles): confirm, seat, assign a table, complete, cancel, no-show, add a staff note, add phone bookings, and send a WhatsApp confirmation. A booking's `night` + `arrivalTime` are venue-local text; arrivals before noon belong to the previous evening (`currentNight()` in `lib/dates.ts` treats times before 6 AM as last night). Rules live in `lib/reservations.ts`.
- **Finance** (`/finance`, roles in `FINANCE`): filterable by date range, staff, bill status and payment method (all in the URL). KPI cards, charts (`components/finance/Charts.tsx`, hand-rolled SVG, colours in `lib/chart-colors.ts`), staff accountability, items, a searchable bills table, voids and remittances. Queries live in `lib/finance.ts`. Downloads come from `/api/finance/export`: `format=xlsx` gives a multi-sheet workbook (exceljs), and `format=csv&dataset=…` gives one table. Cells are guarded against CSV formula injection.
- **Users**: admins create accounts at `/admin/users`. Usernames are sequential `11:11/<staffNo>`; new accounts and resets get `Password1` (`DEFAULT_PASSWORD` in `lib/users.ts`) and must change it on first login (`mustChangePassword` → `/change-password`). Public `/signup` only works while there are zero users (owner bootstrap).

## Business rules (enforced in `lib/orders.ts` — keep them there)

- Accepting an order (or staff entering one) puts it on the bill and **reserves** stock: menus and new orders see `stock_qty − reserved` (`reservedQty()`). Stock is **deducted when the order is marked served** — or when the bill is paid, which serves anything left — atomically with `stock_qty >= qty`, once per order (`orders.stock_deducted_at`), and every change writes a `stock_movements` ledger row. Voids return stock only if it was deducted. Manual changes go through `lib/inventory.ts#adjustStock`.
- Staff can act only on their own bills/orders. Only managers can void (with a reason), which returns stock and notifies the staff member.
- A bill can't be closed with pending orders; once paid it's frozen (`paidAmount` snapshot).
- Order items snapshot name and unit price. Money is integer **kobo** everywhere (`lib/money.ts`).
- Dates/report days use Africa/Lagos (`lib/dates.ts`).

## Busy nights (concurrency)

Many customers order at once; keep these properties when changing order code:
- All order/bill/stock writes go through `inTransaction()` in `lib/orders.ts`, which retries on deadlock/serialization errors.
- Rows are locked in a fixed order — bill → products sorted by id (`mergeLines` sorts) — so concurrent orders can't deadlock.
- `createOrder` creates a new bill and its first order in one transaction (no empty bills), and is idempotent on `orders.client_ref`: the customer's phone sends a random `ref` per submission and retries on network errors; duplicates return the original bill.
- At most `MAX_WAITING_ORDERS_PER_BILL` pending orders per bill (spam guard).
- Polling is cheap: the live fingerprint uses indexed `max()`s; `/api/public/live` is CDN-cached (`s-maxage=2`) so all customers share one read; customer bills poll fast only while an order is pending/being prepared.
- Load-tested locally: 200 simultaneous orders on 30 bottles → exactly 30 accepted, 0 oversold, 0 server errors; 15 duplicate submissions → 1 order.

## Architecture

- **DB**: `lib/db/schema.ts` is the source of truth; `lib/db/index.ts` exports the singleton `db` (postgres-js, `prepare: false` for Neon's pooler). Soft deletes via `deletedAt` on users, products, categories, tables, events.
- **Auth**: NextAuth v5 credentials (username `11:11/N` or email). `auth.config.ts` is the edge-safe config used by `proxy.ts` (Next 16's renamed middleware); `authorized()` gates `/api/*` (public: `/api/auth/*`, `/api/public/*`, `/api/health`) and the protected page prefixes. The JWT isn't trusted for permissions: `lib/authz.ts` re-reads the user from the DB on every request (`requireUser(roles)` in route handlers, `requirePageUser(roles)` in pages), so deactivation/role changes apply immediately.
- **Roles**: `staff` (own bills), `manager` (everything except users), `admin` (everything), `finance` (only `/finance` and receiving cash, no orders/bills/menu). `MANAGERS`, `SERVICE` (who takes orders) and `FINANCE` in `lib/authz.ts`. The role is plain text, so adding one needs no migration.
- **Route handlers** are wrapped in `handle()` from `lib/api.ts`: throw `AppError(message, status)` for user-facing errors; parse bodies with `parseBody(request, zodSchema)`. Route files may only export HTTP handlers — shared zod schemas live in `lib/schemas.ts`.
- **UI**: black theme, one solid accent (`--color-accent`), **no gradients**. Shared primitives in `components/ui.tsx`. Server components query the DB directly; client components mutate via `api()` from `lib/client.ts` and then `router.refresh()`. Live screens poll with SWR (`/api/queue`, `/api/notifications`, `/api/public/bills/<token>`).
- **Live updates**: `components/LiveRefresh.tsx` (in the authenticated layout, and on `/t`, `/bill`, `/menu`) polls `/api/live` (or `/api/public/live`) every few seconds for a fingerprint from `lib/live.ts` (max `updated_at` / ids of bills, orders, products, stock movements, remittances, …). When it changes it calls `router.refresh()` and revalidates all SWR keys, so stock and money figures update without a reload. The server passes the fingerprint it rendered with as `version`, so changes between render and hydration aren't missed. New tables that affect what staff see should be added to the fingerprint.
- QR codes are generated server-side as SVG (`lib/qr.ts`) with the request origin (`lib/url.ts`; set `NEXT_PUBLIC_APP_URL` to force a domain). In `next dev`, a localhost origin is swapped for the machine's LAN IP so phones on the same Wi-Fi can scan them (`allowedDevOrigins` in `next.config.ts` allows those IPs).

## Environment

`.env` (template in `.env.example`): `DATABASE_URL` (Neon pooled), `DATABASE_URL_UNPOOLED` (Neon direct, used for migrations), `AUTH_SECRET`, `AUTH_URL`.
