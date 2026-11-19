CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"night" text NOT NULL,
	"arrival_time" text NOT NULL,
	"party_size" integer NOT NULL,
	"seating" text DEFAULT 'standard' NOT NULL,
	"occasion" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"table_id" integer,
	"handled_by_id" integer,
	"staff_note" text,
	"client_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_lounge_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."lounge_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_reference_unique" ON "reservations" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_client_ref_unique" ON "reservations" USING btree ("client_ref");--> statement-breakpoint
CREATE INDEX "reservations_night_idx" ON "reservations" USING btree ("night","status");--> statement-breakpoint
CREATE INDEX "reservations_updated_idx" ON "reservations" USING btree ("updated_at");