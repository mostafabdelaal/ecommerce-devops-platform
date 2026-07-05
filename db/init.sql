-- -----------------------------------------------------------------------------
-- CloudMart database initialization.
--
-- Scripts placed in /docker-entrypoint-initdb.d are executed automatically by
-- the official postgres image the first time the data directory is empty.
-- This creates the products table and seeds a few sample rows.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)   NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Seed sample products only if the table is empty, so re-running is harmless.
INSERT INTO products (name, description, price)
SELECT * FROM (VALUES
    ('Wireless Mouse',      'Ergonomic 2.4GHz wireless mouse with USB receiver', 24.99),
    ('Mechanical Keyboard', 'RGB backlit mechanical keyboard, blue switches',     79.50),
    ('27" 4K Monitor',      'UHD IPS display with USB-C and HDMI inputs',        329.00),
    ('USB-C Hub',           '7-in-1 hub: HDMI, USB-A, SD card and PD charging',   45.00),
    ('Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with ANC',    129.99)
) AS seed(name, description, price)
WHERE NOT EXISTS (SELECT 1 FROM products);
