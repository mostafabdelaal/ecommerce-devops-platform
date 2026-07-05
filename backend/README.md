# CloudMart Backend

A minimal, self-contained **Node.js (Express) + PostgreSQL** service built to
practice DevOps workflows (Docker, Compose, Terraform, Ansible, CI/CD, k8s).
It is intentionally small but includes the operational surfaces a DevOps
engineer manages in production.

## Features

| Requirement | Implementation |
| --- | --- |
| Environment-driven config | All settings read from env vars; see `.env.example` |
| Health check | `GET /health` verifies the process **and** a live DB query |
| Startup DB resilience | Retries the DB connection (default 5×, 3s apart) before serving |
| CRUD API | `GET /api/products`, `POST /api/products` |
| DB seeding | `db/init.sql` creates `products` and inserts sample rows on first boot |
| Dockerization | Multi-stage `Dockerfile` (alpine) + `docker-compose.yml` |
| Structured logging | JSON log lines to stdout/stderr |

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | `200` when alive + DB reachable, `503` otherwise |
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Create a product (`{ "name", "description", "price" }`) |

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port the backend listens on |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `cloudmart` | PostgreSQL user |
| `DB_PASSWORD` | `cloudmart` | PostgreSQL password |
| `DB_NAME` | `cloudmart` | PostgreSQL database name |
| `DB_CONNECT_RETRIES` | `5` | Startup DB connection attempts |
| `DB_CONNECT_RETRY_DELAY_MS` | `3000` | Delay between startup attempts (ms) |

## Run with Docker Compose (recommended)

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose up --build
```

This starts PostgreSQL (with a persistent volume and the seed script) and the
backend, which waits for the database to be healthy before it starts serving.

Verify:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/products

curl -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Webcam","description":"1080p USB webcam","price":39.99}'
```

Tear down (add `-v` to also drop the database volume):

```bash
docker compose down
```

## Run locally without Docker

You need a PostgreSQL instance and the schema from `db/init.sql` applied.

```bash
cd backend
cp .env.example .env      # edit values to match your local Postgres
# export the variables (or use a tool like dotenv/direnv)
set -a && . ./.env && set +a
npm install
npm start
```

## Notes for orchestration

- `/health` is DB-aware, so it maps directly to a **load balancer target group
  health check** or a Kubernetes **readiness/liveness probe**.
- The container runs as the unprivileged `node` user.
- Logs are single-line JSON on stdout/stderr, ready for Fluent Bit / the ELK
  stack / CloudWatch without extra parsing config.
