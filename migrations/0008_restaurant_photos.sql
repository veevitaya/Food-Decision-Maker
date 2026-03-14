-- Add photos array column for storing multiple image URLs per restaurant
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';
