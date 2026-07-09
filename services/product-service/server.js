'use strict';

/**
 * CloudMart backend service.
 *
 * A deliberately small Express + PostgreSQL application whose purpose is to
 * exercise the standard operational surfaces a DevOps engineer manages:
 *   - configuration purely from environment variables
 *   - a database-aware health check for load balancers / k8s probes
 *   - startup connection retries so container start order does not matter
 *   - structured JSON logs on stdout/stderr for log shippers
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// Configuration (everything comes from the environment)
// ---------------------------------------------------------------------------
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'cloudmart',
    password: process.env.DB_PASSWORD || 'cloudmart',
    database: process.env.DB_NAME || 'cloudmart',
  },
  // Startup DB connection resilience.
  dbRetries: parseInt(process.env.DB_CONNECT_RETRIES || '5', 10),
  dbRetryDelayMs: parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '3000', 10),
};

// ---------------------------------------------------------------------------
// Structured logging (JSON lines to stdout/stderr)
// ---------------------------------------------------------------------------
function log(level, message, extra = {}) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'cloudmart-backend',
    message,
    ...extra,
  });
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

// ---------------------------------------------------------------------------
// Database pool
// ---------------------------------------------------------------------------
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

// A pool-level error handler keeps a dropped backend connection from crashing
// the process (e.g. the DB restarting behind us).
pool.on('error', (err) => {
  log('error', 'Unexpected error on idle database client', { error: err.message });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Try to reach the database, retrying a bounded number of times. This lets the
 * backend container start before Postgres has finished initializing.
 */
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
        throw new Error(
          `Could not connect to database after ${config.dbRetries} attempts: ${err.message}`
        );
      }
      await sleep(config.dbRetryDelayMs);
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP application
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Lightweight request logging.
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

/**
 * Health check. Returns 200 only when the process is alive AND the database is
 * reachable, so it is safe to wire to a load balancer target group or a
 * Kubernetes readiness/liveness probe.
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    log('error', 'Health check failed', { error: err.message });
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// GET /api/products - list all products.
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, created_at FROM products ORDER BY id ASC'
    );
    res.status(200).json({ products: result.rows });
  } catch (err) {
    log('error', 'Failed to list products', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products - create a product.
app.post('/api/products', async (req, res) => {
  const { name, description, price } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Field "name" is required' });
  }
  if (price === undefined || price === null || Number.isNaN(Number(price))) {
    return res.status(400).json({ error: 'Field "price" must be a number' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, price, created_at`,
      [name.trim(), description || null, Number(price)]
    );
    log('info', 'Product created', { productId: result.rows[0].id });
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    log('error', 'Failed to create product', { error: err.message });
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Root convenience endpoint.
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'cloudmart-backend',
    endpoints: ['/health', 'GET /api/products', 'POST /api/products'],
  });
});

// ---------------------------------------------------------------------------
// Startup / graceful shutdown
// ---------------------------------------------------------------------------
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
  await pool.end().catch((err) =>
    log('error', 'Error closing database pool', { error: err.message })
  );
  process.exit(0);
}

if (require.main === module) {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  start();
}

module.exports = { app, pool, config, start, waitForDatabase, shutdown };
