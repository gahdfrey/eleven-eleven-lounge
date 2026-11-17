import { z } from "zod";
/** Request schemas shared between create (POST) and edit (PATCH) routes. */

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(40),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  description: z.string().trim().max(300).nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  /** Kobo. */
  price: z.number().int().min(0, "Price can't be negative").max(1_000_000_000),
  trackStock: z.boolean().optional(),
  lowStockAt: z.number().int().min(0).max(100000).optional(),
  available: z.boolean().optional(),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(100),
    description: z.string().trim().max(2000).nullable().optional(),
    startsAt: z.coerce.date({ error: "Start date and time is required" }),
    endsAt: z.coerce.date().nullable().optional(),
    entry: z.string().trim().max(100).nullable().optional(),
    published: z.boolean().optional(),
  })
  .refine((d) => !d.endsAt || d.endsAt > d.startsAt, { path: ["endsAt"], message: "End must be after the start" });
