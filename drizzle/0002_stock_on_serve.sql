ALTER TABLE "orders" ADD COLUMN "stock_deducted_at" timestamp with time zone;--> statement-breakpoint
-- Before this migration, stock was deducted when an order was accepted. Mark
-- those orders as already deducted so serving them later doesn't deduct twice.
-- (Voided orders had their stock returned already, so they stay unmarked.)
UPDATE "orders" SET "stock_deducted_at" = COALESCE("accepted_at", "created_at")
WHERE "status" IN ('accepted', 'served');
