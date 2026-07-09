'use strict';

/**
 * Endpoint tests for the CloudMart backend.
 *
 * Uses Node's built-in test runner (`node --test`) and the global `fetch`, so
 * there are no extra dependencies to install.
 *
 * The two request-validation tests need no database (the handler rejects bad
 * input before touching Postgres). The health / list tests exercise the DB and
 * therefore expect a reachable Postgres with the schema from `db/init.sql`
 * applied — which CI provides via a Postgres service container.
 */

const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');

let server;
let baseUrl;

// Start the Express app on an ephemeral port before the tests run.
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

// Close the server (and the pool) after the tests finish.
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const { pool } = require('../server');
  await pool.end().catch(() => {});
});

test('POST /api/products rejects a missing name with 400', async () => {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: 9.99 }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /name/);
});

test('POST /api/products rejects a non-numeric price with 400', async () => {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Widget', price: 'not-a-number' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /price/);
});

test('GET /health reports the service and database as healthy', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.database, 'connected');
});

test('GET /api/products returns the seeded products', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.products));
  assert.ok(body.products.length >= 1, 'expected at least one seeded product');
});
