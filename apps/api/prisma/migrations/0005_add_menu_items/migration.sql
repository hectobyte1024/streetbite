CREATE TABLE menu_items (
  id text PRIMARY KEY,
  vendor_id text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  is_available boolean NOT NULL DEFAULT TRUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL,
  CONSTRAINT menu_items_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT menu_items_price_cents_check CHECK (price_cents >= 0),
  CONSTRAINT menu_items_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX menu_items_vendor_id_category_sort_order_idx
  ON menu_items (vendor_id, category, sort_order);

CREATE INDEX menu_items_vendor_id_is_available_idx
  ON menu_items (vendor_id, is_available);
