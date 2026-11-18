ALTER TABLE "orders" ADD COLUMN "client_ref" text;--> statement-breakpoint
CREATE INDEX "bills_status_idx" ON "bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bills_updated_idx" ON "bills" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "categories_updated_idx" ON "categories" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "events_updated_idx" ON "events" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "lounge_tables_updated_idx" ON "lounge_tables" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_updated_idx" ON "orders" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_client_ref_unique" ON "orders" USING btree ("client_ref");--> statement-breakpoint
CREATE INDEX "products_updated_idx" ON "products" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "users_updated_idx" ON "users" USING btree ("updated_at");