-- Group sessions
CREATE TABLE IF NOT EXISTS group_sessions (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  settings jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  joined boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_members_session_id_idx ON group_members(session_id);

-- Places request logs
CREATE TABLE IF NOT EXISTS places_request_logs (
  id serial PRIMARY KEY,
  ts timestamp NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'osm',
  cache_hit boolean NOT NULL DEFAULT false,
  fallback_used boolean NOT NULL DEFAULT false,
  query text NOT NULL DEFAULT 'restaurant',
  result_count integer NOT NULL DEFAULT 0
);

-- Geo tile cache tracker
CREATE TABLE IF NOT EXISTS places_tiles (
  tile_key text PRIMARY KEY,
  last_fetched_at timestamp NOT NULL DEFAULT now(),
  result_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'osm'
);
