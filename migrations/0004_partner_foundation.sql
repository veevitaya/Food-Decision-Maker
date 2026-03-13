CREATE TABLE IF NOT EXISTS "restaurant_owners" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "line_user_id" text,
  "display_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "is_verified" boolean DEFAULT false NOT NULL,
  "verification_status" text DEFAULT 'pending' NOT NULL,
  "subscription_tier" text DEFAULT 'free' NOT NULL,
  "subscription_expiry" text,
  "payment_connected" boolean DEFAULT false NOT NULL,
  "payment_method" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_owners_email_unique" ON "restaurant_owners" USING btree ("email");
CREATE INDEX IF NOT EXISTS "restaurant_owners_restaurant_id_idx" ON "restaurant_owners" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_owners_email_idx" ON "restaurant_owners" USING btree ("email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_owners_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "restaurant_owners"
      ADD CONSTRAINT "restaurant_owners_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "restaurant_claims" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "owner_id" integer NOT NULL,
  "ownership_type" text DEFAULT 'single_location',
  "status" text DEFAULT 'pending' NOT NULL,
  "submitted_at" timestamp DEFAULT now() NOT NULL,
  "review_notes" text,
  "proof_documents" text[] DEFAULT '{}'::text[],
  "verification_checklist" jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS "restaurant_claims_restaurant_id_idx" ON "restaurant_claims" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_claims_owner_id_idx" ON "restaurant_claims" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "restaurant_claims_status_idx" ON "restaurant_claims" USING btree ("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_claims_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "restaurant_claims"
      ADD CONSTRAINT "restaurant_claims_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_claims_owner_id_restaurant_owners_id_fk'
  ) THEN
    ALTER TABLE "restaurant_claims"
      ADD CONSTRAINT "restaurant_claims_owner_id_restaurant_owners_id_fk"
      FOREIGN KEY ("owner_id")
      REFERENCES "public"."restaurant_owners"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "promotions" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "start_date" text,
  "end_date" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "promotions_restaurant_id_idx" ON "promotions" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "promotions_is_active_idx" ON "promotions" USING btree ("is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promotions_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "promotions"
      ADD CONSTRAINT "promotions_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;
