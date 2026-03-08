CREATE TABLE IF NOT EXISTS event_logs (
  id serial PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id text,
  session_id text,
  item_id integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);

CREATE TABLE IF NOT EXISTS user_feature_snapshots (
  id serial PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  cuisine_affinity jsonb DEFAULT '{}'::jsonb,
  preferred_price_level integer DEFAULT 2,
  active_hours integer[] DEFAULT '{}',
  location_clusters text[] DEFAULT '{}',
  disliked_item_ids integer[] DEFAULT '{}',
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feature_snapshots_updated_at ON user_feature_snapshots(updated_at);

CREATE TABLE IF NOT EXISTS item_feature_snapshots (
  id serial PRIMARY KEY,
  item_id integer NOT NULL UNIQUE,
  item_type text NOT NULL DEFAULT 'restaurant',
  ctr integer NOT NULL DEFAULT 0,
  like_rate integer NOT NULL DEFAULT 0,
  super_like_rate integer NOT NULL DEFAULT 0,
  conversion_rate integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_logs (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  consent_type text NOT NULL DEFAULT 'behavior_tracking',
  granted boolean NOT NULL DEFAULT false,
  version text NOT NULL DEFAULT 'v1',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_type_created_at
ON consent_logs(user_id, consent_type, created_at DESC);
