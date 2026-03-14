-- Feature #5: Menu-level click tracking + dish affinity
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS menu_item_id INTEGER REFERENCES menus(id) ON DELETE SET NULL;
ALTER TABLE user_feature_snapshots ADD COLUMN IF NOT EXISTS menu_item_affinity JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS event_logs_menu_item_id_idx ON event_logs(menu_item_id);
