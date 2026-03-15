ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS plus_code text,
  ADD COLUMN IF NOT EXISTS editorial_summary text,
  ADD COLUMN IF NOT EXISTS service_options jsonb,
  ADD COLUMN IF NOT EXISTS amenities jsonb,
  ADD COLUMN IF NOT EXISTS payment_options jsonb;
