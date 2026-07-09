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

test('POST /api/orders rejects a missing user_id with 400', async () => {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total_price: 100 }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /user_id/);
});

test('GET /health reports the service and database as healthy', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.database, 'connected');
});

test('GET /api/orders returns the seeded orders', async () => {
  const res = await fetch(`${baseUrl}/api/orders`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.orders));
});

