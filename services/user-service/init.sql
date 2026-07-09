CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(255)   NOT NULL,
    email       VARCHAR(255)   NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

INSERT INTO users (username, email)
SELECT * FROM (VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com')
) AS seed(username, email)
WHERE NOT EXISTS (SELECT 1 FROM users);
