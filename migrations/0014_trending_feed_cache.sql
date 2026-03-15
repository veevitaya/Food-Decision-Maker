CREATE TABLE IF NOT EXISTS "trending_feed_cache" (
  "id" serial PRIMARY KEY NOT NULL,
  "posts" jsonb DEFAULT '[]' NOT NULL,
  "built_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL
);
