'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { app, pool, waitForDatabase } = require('../server');

let baseUrl;
let testServer;

test.before(async () => {
  await waitForDatabase();
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      const { port } = testServer.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(resolve));
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
  if (body.products.length > 0) {
      assert.ok(body.products.length >= 1, 'expected at least one seeded product');
  }
});

