'use strict';

/**
 * CloudMart Order Service.
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const promClient = require('prom-client');

// Initialize Prometheus metrics collection
promClient.collectDefaultMetrics({ prefix: 'order_service_' });

const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'cloudmart',
    password: process.env.DB_PASSWORD || 'cloudmart',
    database: process.env.DB_NAME || 'cloudmart',
  },
  dbRetries: parseInt(process.env.DB_CONNECT_RETRIES || '5', 10),
  dbRetryDelayMs: parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '3000', 10),
};

function log(level, message, extra = {}) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'cloudmart-order-service',
    message,
    ...extra,
  });
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  log('error', 'Unexpected error on idle database client', { error: err.message });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase() {
  for (let attempt = 1; attempt <= config.dbRetries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      log('info', 'Database connection established', { attempt });
      return;
    } catch (err) {
      log('warn', 'Database not ready, will retry', {
        attempt,
        maxAttempts: config.dbRetries,
        retryDelayMs: config.dbRetryDelayMs,
        error: err.message,
      });
      if (attempt === config.dbRetries) {
        throw new Error(`Could not connect to database after ${config.dbRetries} attempts: ${err.message}`);
      }
      await sleep(config.dbRetryDelayMs);
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    log('error', 'Health check failed', { error: err.message });
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// GET /metrics - Prometheus metrics
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    log('error', 'Failed to generate metrics', { error: err.message });
    res.status(500).end(err.message);
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, user_id, total, status, created_at FROM orders ORDER BY id ASC');
    res.status(200).json({ orders: result.rows });
  } catch (err) {
    log('error', 'Failed to list orders', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { user_id, total } = req.body || {};

  if (typeof user_id !== 'number') {
    return res.status(400).json({ error: 'Field "user_id" is required and must be a number' });
  }
  if (typeof total !== 'number' || total < 0) {
    return res.status(400).json({ error: 'Field "total" must be a positive number' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id, user_id, total, status, created_at`,
      [user_id, total]
    );
    log('info', 'Order created', { orderId: result.rows[0].id });
    res.status(201).json({ order: result.rows[0] });
  } catch (err) {
    log('error', 'Failed to create order', { error: err.message });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'cloudmart-order-service',
    endpoints: ['/health', '/metrics', 'GET /api/orders', 'POST /api/orders'],
  });
});

let server;

async function start() {
  try {
    await waitForDatabase();
    server = app.listen(config.port, () => {
      log('info', 'Server listening', { port: config.port });
    });
  } catch (err) {
    log('error', 'Fatal startup error', { error: err.message });
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

async function shutdown(signal) {
  log('info', 'Shutting down', { signal });
  if (server) {
    server.close(() => log('info', 'HTTP server closed'));
  }
  await pool.end().catch((err) => log('error', 'Error closing database pool', { error: err.message }));
  process.exit(0);
}

if (require.main === module) {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  start();
}

module.exports = { app, pool, config, start, waitForDatabase, shutdown };
