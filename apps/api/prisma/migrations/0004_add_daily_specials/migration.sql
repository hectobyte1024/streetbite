CREATE TABLE daily_specials (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'MXN',
  starts_at timestamp(3) NOT NULL,
  ends_at timestamp(3) NOT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL,
  CONSTRAINT daily_specials_title_check CHECK (length(btrim(title)) > 0),
  CONSTRAINT daily_specials_price_cents_check CHECK (price_cents IS NULL OR price_cents >= 0),
  CONSTRAINT daily_specials_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT daily_specials_time_range_check CHECK (starts_at < ends_at)
);

CREATE INDEX daily_specials_vendor_id_starts_at_idx
  ON daily_specials (vendor_id, starts_at);

CREATE INDEX daily_specials_active_window_idx
  ON daily_specials (is_active, starts_at, ends_at);
