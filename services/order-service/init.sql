CREATE TABLE IF NOT EXISTS orders (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER        NOT NULL,
    total       NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status      VARCHAR(50)    NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

INSERT INTO orders (user_id, total, status)
SELECT * FROM (VALUES
    (1, 104.49, 'COMPLETED'),
    (2, 329.00, 'PENDING')
) AS seed(user_id, total, status)
WHERE NOT EXISTS (SELECT 1 FROM orders);
