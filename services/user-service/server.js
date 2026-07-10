'use strict';

/**
 * CloudMart User Service.
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const promClient = require('prom-client');

// Initialize Prometheus metrics collection
promClient.collectDefaultMetrics({ prefix: 'user_service_' });

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
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
    service: 'cloudmart-user-service',
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

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY id ASC');
    res.status(200).json({ users: result.rows });
  } catch (err) {
    log('error', 'Failed to list users', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, email } = req.body || {};

  if (typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'Field "username" is required' });
  }
  if (typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'Field "email" is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email, created_at`,
      [username.trim(), email.trim()]
    );
    log('info', 'User created', { userId: result.rows[0].id });
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    log('error', 'Failed to create user', { error: err.message });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'cloudmart-user-service',
    endpoints: ['/health', '/metrics', 'GET /api/users', 'POST /api/users'],
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
