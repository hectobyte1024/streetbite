CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'CUSTOMER',
  display_name text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL
);

CREATE TABLE vendors (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'DRAFT',
  category text NOT NULL,
  price_level integer,
  description text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL
);

CREATE INDEX vendors_owner_id_idx ON vendors(owner_id);
CREATE INDEX vendors_status_category_idx ON vendors(status, category);

CREATE TABLE vendor_locations (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  accuracy_meters integer,
  captured_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_current boolean NOT NULL DEFAULT TRUE
);

CREATE INDEX vendor_locations_vendor_id_is_current_idx ON vendor_locations(vendor_id, is_current);
CREATE INDEX vendor_locations_captured_at_idx ON vendor_locations(captured_at);
CREATE INDEX vendor_locations_location_gist_idx ON vendor_locations USING GIST (location);

CREATE TABLE reviews (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  body text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL,
  CONSTRAINT reviews_vendor_user_key UNIQUE (vendor_id, user_id)
);

CREATE INDEX reviews_vendor_id_created_at_idx ON reviews(vendor_id, created_at);

CREATE TABLE vendor_follows (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendor_follows_vendor_user_key UNIQUE (vendor_id, user_id)
);

CREATE INDEX vendor_follows_user_id_created_at_idx ON vendor_follows(user_id, created_at);

CREATE TABLE vendor_hours (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  weekday integer NOT NULL,
  opens_at timestamp(3) NOT NULL,
  closes_at timestamp(3) NOT NULL
);

CREATE INDEX vendor_hours_vendor_id_weekday_idx ON vendor_hours(vendor_id, weekday);
