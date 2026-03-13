CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" text DEFAULT 'admin' NOT NULL,
  "permissions" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_unique" ON "admin_users" USING btree ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_unique" ON "admin_users" USING btree ("email");
CREATE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users" USING btree ("email");

CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "channel" text DEFAULT 'line' NOT NULL,
  "type" text NOT NULL,
  "recipient_id" text,
  "campaign_id" integer,
  "session_code" text,
  "message_text" text NOT NULL,
  "status" text DEFAULT 'sent' NOT NULL,
  "sent_by" text,
  "sent_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notification_logs_type_idx" ON "notification_logs" USING btree ("type");
CREATE INDEX IF NOT EXISTS "notification_logs_sent_at_idx" ON "notification_logs" USING btree ("sent_at");
