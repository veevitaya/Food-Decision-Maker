-- Ensure restaurants table has review_replies column for compatibility with existing code.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS review_replies jsonb;
