import { randomInt } from "crypto";
import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { loungeTables, reservations, users, RESERVATION_STATUSES, SEATING_OPTIONS, type ReservationStatus } from "./db/schema";
import { AppError } from "./api";
import { pgError } from "./db/errors";
import { currentNight } from "./dates";
import { notify } from "./notifications";
import { ARRIVAL_TIMES, OPEN_DAYS, formatArrival, formatNightDate, weekday } from "./site";
import { MANAGERS } from "./authz";

/** How far ahead guests can book from the website. */
export const BOOKING_WINDOW_DAYS = 90;
/** A phone number can hold this many active bookings per night (spam guard). */
const MAX_ACTIVE_PER_PHONE_PER_NIGHT = 2;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a night");
const phone = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(20)
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number");

export const reservationSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email").max(120)]).optional(),
  night: day,
  arrivalTime: z.enum(ARRIVAL_TIMES as [string, ...string[]], { error: "Choose an arrival time" }),
  partySize: z.number().int().min(1, "At least 1 guest").max(30, "For more than 30 guests, message us on WhatsApp"),
  seating: z.enum(SEATING_OPTIONS).default("standard"),
  occasion: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Random id per submission from the browser: resubmitting never creates a second booking. */
  ref: z.string().min(8).max(64).optional(),
  /** Honeypot: real people never see or fill this field. */
  website: z.string().max(200).optional(),
});
export type ReservationInput = z.infer<typeof reservationSchema>;

export const reservationUpdateSchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  tableId: z.number().int().positive().nullable().optional(),
  staffNote: z.string().trim().max(300).nullable().optional(),
  night: day.optional(),
  arrivalTime: z.enum(ARRIVAL_TIMES as [string, ...string[]]).optional(),
  partySize: z.number().int().min(1).max(200).optional(),
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
function newReference() {
  return "R" + Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

function addDaysStr(d: string, n: number) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

/** Throws a friendly error if the night isn't bookable. Staff can book further ahead and any night. */
function assertBookableNight(night: string, { staff = false } = {}) {
  const today = currentNight();
  if (night < today) throw new AppError("That night has already passed. Please choose another.");
  if (!staff) {
    if (night > addDaysStr(today, BOOKING_WINDOW_DAYS)) throw new AppError(`You can book up to ${BOOKING_WINDOW_DAYS} days ahead.`);
    if (!OPEN_DAYS.has(weekday(night))) throw new AppError("We're open Thursday to Sunday. Please choose one of those nights.");
  }
}

/**
 * Creates a reservation (website or staff). Idempotent on `ref`, and it
 * notifies managers so a new website booking shows up instantly.
 */
export async function createReservation(input: ReservationInput, source: "website" | "staff", actor?: { id: number; firstname: string }) {
  assertBookableNight(input.night, { staff: source === "staff" });

  if (input.ref) {
    const [dup] = await db.select().from(reservations).where(eq(reservations.clientRef, input.ref)).limit(1);
    if (dup) return { reservation: dup, duplicate: true };
  }

  const digits = input.phone.replace(/\D/g, "");
  if (source === "website") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.night, input.night),
          sql`regexp_replace(${reservations.phone}, '\\D', '', 'g') = ${digits}`,
          inArray(reservations.status, ["pending", "confirmed"]),
        ),
      );
    if (n >= MAX_ACTIVE_PER_PHONE_PER_NIGHT) {
      throw new AppError("You already have a booking for that night. Message us on WhatsApp if you need to change it.", 409);
    }
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db
        .insert(reservations)
        .values({
          reference: newReference(),
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          night: input.night,
          arrivalTime: input.arrivalTime,
          partySize: input.partySize,
          seating: input.seating,
          occasion: input.occasion || null,
          notes: input.notes || null,
          source,
          status: source === "staff" ? "confirmed" : "pending",
          handledById: actor?.id ?? null,
          clientRef: input.ref ?? null,
        })
        .returning();

      if (source === "website") {
        const managers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.role, MANAGERS), eq(users.active, true), isNull(users.deletedAt)));
        const when = `${formatNightDate(row.night)}, ${formatArrival(row.arrivalTime)}`;
        await Promise.all(
          managers.map((m) =>
            notify(m.id, {
              title: `New reservation: ${row.name}, ${row.partySize} guest${row.partySize === 1 ? "" : "s"}`,
              body: `${when} · ${row.reference}`,
              link: `/reservations?night=${row.night}`,
            }),
          ),
        );
      }
      return { reservation: row, duplicate: false };
    } catch (e) {
      const err = pgError(e);
      if (err?.code === "23505" && err.constraint === "reservations_client_ref_unique" && input.ref) {
        const [dup] = await db.select().from(reservations).where(eq(reservations.clientRef, input.ref)).limit(1);
        if (dup) return { reservation: dup, duplicate: true };
      }
      // Reference collision (1 in ~33 million): try a new code.
      if (err?.code === "23505" && err.constraint === "reservations_reference_unique" && attempt < 3) continue;
      throw e;
    }
  }
}

export async function updateReservation(id: number, patch: z.infer<typeof reservationUpdateSchema>, actor: { id: number }) {
  const [current] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!current) throw new AppError("Reservation not found", 404);
  if (patch.night) assertBookableNight(patch.night, { staff: true });
  if (patch.tableId) {
    const [table] = await db.select({ id: loungeTables.id }).from(loungeTables).where(and(eq(loungeTables.id, patch.tableId), isNull(loungeTables.deletedAt)));
    if (!table) throw new AppError("Table not found", 404);
  }
  const [row] = await db
    .update(reservations)
    .set({ ...patch, handledById: actor.id })
    .where(eq(reservations.id, id))
    .returning();
  return row;
}

/** Sort key so that after-midnight arrivals come after 11:30 PM on the same night. */
const timeOrder = sql`case when ${reservations.arrivalTime} < '12:00' then 1 else 0 end`;

export type ReservationRow = Awaited<ReturnType<typeof listReservations>>[number];

export async function listReservations(opts: { from: string; to: string; statuses?: ReservationStatus[] }) {
  return db
    .select({
      r: reservations,
      tableName: loungeTables.name,
      handledBy: users.firstname,
    })
    .from(reservations)
    .leftJoin(loungeTables, eq(loungeTables.id, reservations.tableId))
    .leftJoin(users, eq(users.id, reservations.handledById))
    .where(
      and(
        gte(reservations.night, opts.from),
        lte(reservations.night, opts.to),
        opts.statuses?.length ? inArray(reservations.status, opts.statuses) : undefined,
      ),
    )
    .orderBy(asc(reservations.night), timeOrder, asc(reservations.arrivalTime), asc(reservations.id))
    .limit(1000)
    .then((rows) => rows.map(({ r, tableName, handledBy }) => ({ ...r, tableName, handledBy })));
}

export async function reservationCounts(today: string) {
  const [row] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${reservations.status} = 'pending' and ${reservations.night} >= ${today})::int`,
      tonight: sql<number>`count(*) filter (where ${reservations.night} = ${today} and ${reservations.status} in ('pending', 'confirmed', 'seated'))::int`,
      tonightGuests: sql<number>`coalesce(sum(${reservations.partySize}) filter (where ${reservations.night} = ${today} and ${reservations.status} in ('pending', 'confirmed', 'seated')), 0)::int`,
    })
    .from(reservations);
  return row ?? { pending: 0, tonight: 0, tonightGuests: 0 };
}
