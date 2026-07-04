CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE vendors
  ADD CONSTRAINT vendors_price_level_check
  CHECK (price_level IS NULL OR price_level BETWEEN 1 AND 5);

ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_check
  CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE vendor_hours
  ADD CONSTRAINT vendor_hours_weekday_check
  CHECK (weekday BETWEEN 0 AND 6);

ALTER TABLE vendor_hours
  ADD CONSTRAINT vendor_hours_time_range_check
  CHECK (opens_at < closes_at);

ALTER TABLE vendor_locations
  ADD CONSTRAINT vendor_locations_accuracy_check
  CHECK (accuracy_meters IS NULL OR accuracy_meters > 0);

CREATE UNIQUE INDEX vendor_locations_one_current_per_vendor_idx
  ON vendor_locations (vendor_id)
  WHERE is_current = TRUE;

CREATE INDEX vendor_locations_current_location_gist_idx
  ON vendor_locations
  USING GIST (location)
  WHERE is_current = TRUE;

CREATE INDEX vendors_active_category_idx
  ON vendors (category, id)
  WHERE status = 'ACTIVE';

CREATE INDEX reviews_vendor_rating_idx
  ON reviews (vendor_id, rating);

CREATE INDEX vendor_follows_vendor_id_created_at_idx
  ON vendor_follows (vendor_id, created_at);

CREATE UNIQUE INDEX refresh_tokens_token_hash_idx
  ON refresh_tokens (token_hash);
