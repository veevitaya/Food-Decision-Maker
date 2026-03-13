ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "is_sponsored" boolean NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "sponsored_until" text;

CREATE TABLE IF NOT EXISTS "sponsored_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "owner_id" integer NOT NULL REFERENCES "restaurant_owners"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_start_date" text,
  "requested_end_date" text,
  "notes" text,
  "review_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "reviewed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "sponsored_requests_restaurant_id_idx" ON "sponsored_requests" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "sponsored_requests_owner_id_idx" ON "sponsored_requests" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "sponsored_requests_status_idx" ON "sponsored_requests" USING btree ("status");
