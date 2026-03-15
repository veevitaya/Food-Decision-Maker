-- Baseline tables required for fresh database bootstrap.
-- This file is intentionally idempotent for safe execution on existing environments.

CREATE TABLE IF NOT EXISTS "restaurants" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "image_url" text NOT NULL,
  "lat" text NOT NULL,
  "lng" text NOT NULL,
  "category" text NOT NULL,
  "price_level" integer NOT NULL,
  "rating" text NOT NULL,
  "address" text NOT NULL,
  "is_new" boolean DEFAULT false,
  "trending_score" integer DEFAULT 0,
  "phone" text,
  "opening_hours" jsonb,
  "reviews" jsonb,
  "is_sponsored" boolean NOT NULL DEFAULT false,
  "sponsored_until" text,
  "vibes" text[] DEFAULT '{}'::text[],
  "district" text,
  "photos" text[] DEFAULT '{}'::text[],
  "google_place_id" text,
  "osm_id" text,
  "review_count" integer NOT NULL DEFAULT 0,
  "review_replies" jsonb
);

CREATE TABLE IF NOT EXISTS "restaurant_owners" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer,
  "line_user_id" text,
  "display_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "password_hash" text,
  "is_verified" boolean DEFAULT false NOT NULL,
  "verification_status" text DEFAULT 'pending' NOT NULL,
  "subscription_tier" text DEFAULT 'free' NOT NULL,
  "subscription_expiry" text,
  "payment_connected" boolean DEFAULT false NOT NULL,
  "payment_method" text,
  "stripe_customer_id" text,
  "omise_customer_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_owners_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "restaurant_owners"
      ADD CONSTRAINT "restaurant_owners_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_owners_email_unique" ON "restaurant_owners" USING btree ("email");
CREATE INDEX IF NOT EXISTS "restaurant_owners_restaurant_id_idx" ON "restaurant_owners" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_owners_email_idx" ON "restaurant_owners" USING btree ("email");

-- Ensure optional restaurant source columns exist before index creation on older DBs
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "google_place_id" text;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "osm_id" text;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "review_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "review_replies" jsonb;

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "deal_type" text,
  "deal_value" text,
  "restaurant_owner_key" text NOT NULL,
  "start_date" text,
  "end_date" text,
  "target_groups" text[] DEFAULT '{}'::text[],
  "impressions" integer NOT NULL DEFAULT 0,
  "clicks" integer NOT NULL DEFAULT 0,
  "daily_budget" integer NOT NULL DEFAULT 0,
  "total_budget" integer NOT NULL DEFAULT 0,
  "spent" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" USING btree ("status");
CREATE INDEX IF NOT EXISTS "campaigns_owner_key_idx" ON "campaigns" USING btree ("restaurant_owner_key");

CREATE TABLE IF NOT EXISTS "ad_banners" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "image_url" text NOT NULL,
  "link_url" text,
  "position" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "start_date" text,
  "end_date" text,
  "impressions" integer NOT NULL DEFAULT 0,
  "clicks" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "config_key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_configs_config_key_unique" UNIQUE("config_key")
);

CREATE TABLE IF NOT EXISTS "analytics_daily_rollups" (
  "date" text PRIMARY KEY NOT NULL,
  "total_events" integer NOT NULL DEFAULT 0,
  "unique_users" integer NOT NULL DEFAULT 0,
  "unique_items" integer NOT NULL DEFAULT 0,
  "by_type" jsonb DEFAULT '{}'::jsonb,
  "funnel_views" integer NOT NULL DEFAULT 0,
  "funnel_swipes" integer NOT NULL DEFAULT 0,
  "funnel_favorites" integer NOT NULL DEFAULT 0,
  "funnel_orders" integer NOT NULL DEFAULT 0,
  "d1_retention_pct" integer NOT NULL DEFAULT 0,
  "d7_retention_pct" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "line_user_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "display_name" text NOT NULL,
  "picture_url" text,
  "status_message" text,
  "dietary_restrictions" text[] DEFAULT '{}'::text[],
  "cuisine_preferences" text[] DEFAULT '{}'::text[],
  "default_budget" integer DEFAULT 2,
  "default_distance" text DEFAULT '5km',
  "partner_line_user_id" text,
  "partner_display_name" text,
  "partner_picture_url" text,
  "gender" text,
  "age_group" text,
  CONSTRAINT "user_profiles_line_user_id_unique" UNIQUE("line_user_id")
);

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "restaurant_id" integer NOT NULL,
  "preference" text NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  "amount" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'thb',
  "provider" text NOT NULL,
  "method" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "provider_charge_id" text,
  "tier" text NOT NULL DEFAULT 'free',
  "slip_url" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_owner_id_restaurant_owners_id_fk'
  ) THEN
    ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "payment_transactions_owner_id_restaurant_owners_id_fk"
      FOREIGN KEY ("owner_id")
      REFERENCES "public"."restaurant_owners"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payment_transactions_owner_id_idx" ON "payment_transactions" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "payment_transactions_created_at_idx" ON "payment_transactions" USING btree ("created_at");

CREATE TABLE IF NOT EXISTS "partner_invites" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "initiator_line_user_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  CONSTRAINT "partner_invites_token_unique" UNIQUE("token")
);

CREATE INDEX IF NOT EXISTS "partner_invites_token_idx" ON "partner_invites" USING btree ("token");
CREATE INDEX IF NOT EXISTS "partner_invites_initiator_idx" ON "partner_invites" USING btree ("initiator_line_user_id");

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "priority" text NOT NULL DEFAULT 'medium',
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_owner_id_restaurant_owners_id_fk'
  ) THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_owner_id_restaurant_owners_id_fk"
      FOREIGN KEY ("owner_id")
      REFERENCES "public"."restaurant_owners"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "support_tickets_owner_id_idx" ON "support_tickets" USING btree ("owner_id");

CREATE INDEX IF NOT EXISTS "restaurants_google_place_id_idx" ON "restaurants" ("google_place_id")
  WHERE "google_place_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "restaurants_osm_id_idx" ON "restaurants" ("osm_id")
  WHERE "osm_id" IS NOT NULL;
