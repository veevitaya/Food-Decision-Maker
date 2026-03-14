-- Add source IDs to allow re-fetching/updating from Google Places and OSM
-- Add reviewCount to track total reviews separately from the stored sample

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS osm_id text,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS restaurants_google_place_id_idx ON restaurants (google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurants_osm_id_idx ON restaurants (osm_id)
  WHERE osm_id IS NOT NULL;
