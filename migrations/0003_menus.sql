CREATE TABLE IF NOT EXISTS "menus" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "image_url" text,
  "price_approx" integer,
  "tags" text[] DEFAULT '{}'::text[],
  "diet_flags" text[] DEFAULT '{}'::text[],
  "is_active" boolean DEFAULT true NOT NULL,
  "is_sponsored" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menus_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "menus"
      ADD CONSTRAINT "menus_restaurant_id_restaurants_id_fk"
      FOREIGN KEY ("restaurant_id")
      REFERENCES "public"."restaurants"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "menus_restaurant_id_idx" ON "menus" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "menus_name_idx" ON "menus" USING btree ("name");

INSERT INTO "menus" ("restaurant_id", "name", "description", "price_approx", "tags", "diet_flags")
SELECT r.id, 'Chef Special', 'House recommendation and top seller', 220, ARRAY['popular'], ARRAY[]::text[]
FROM "restaurants" r
WHERE NOT EXISTS (
  SELECT 1 FROM "menus" m WHERE m.restaurant_id = r.id
)
ORDER BY r.id
LIMIT 30;
