# Cloud-Native E-Commerce Microservices Platform

[![CI](https://github.com/mostafabdelaal/ecommerce-devops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/mostafabdelaal/ecommerce-devops-platform/actions/workflows/ci.yml)
[![CodeQL](https://github.com/mostafabdelaal/ecommerce-devops-platform/actions/workflows/codeql.yml/badge.svg)](https://github.com/mostafabdelaal/ecommerce-devops-platform/actions/workflows/codeql.yml)

This project is developed as the **DEPI Final Graduation Project (DevOps Track)**.  
It demonstrates the design and implementation of a production-ready, cloud-native e-commerce platform built using microservices architecture and complete DevOps automation practices.

## Project Overview

The platform consists of multiple backend services, a frontend application, and supporting infrastructure components, all fully containerized and deployed on a Kubernetes cluster with automated CI/CD pipelines.

The main objective of this project is to showcase practical DevOps skills including:

- Infrastructure as Code (Terraform)
- Configuration Management (Ansible)
- Containerization (Docker)
- Orchestration (Kubernetes)
- CI/CD Automation (GitHub Actions)
- Monitoring & Logging (Prometheus, Grafana, ELK)
- Security Scanning (Trivy, SonarQube)
- Cloud Deployment (AWS/Azure)

## Key Features

- Microservices-based architecture (Product, User, Order services)
- Automated build, test, and deployment pipelines
- Blue-Green / Canary deployment strategy
- Auto-scaling using Kubernetes HPA
- Centralized logging and monitoring
- Secure container image scanning
- Infrastructure provisioning via Terraform
- Production-ready architecture with load balancing and SSL

## Objective

To simulate a real-world enterprise DevOps environment by building, automating, deploying, monitoring, and maintaining a scalable cloud-native application from development to production.

## CI/CD (GitHub Actions)

Automation lives in `.github/`:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **CI** | `ci.yml` | every push / PR | Lints and tests the backend against a Postgres service, and validates the Docker image build + `docker-compose.yml` |
| **Docker Publish** | `docker-publish.yml` | push to `main`, `v*` tags | Builds the backend image, pushes it to GHCR (`ghcr.io`), and scans it with Trivy |
| **CodeQL** | `codeql.yml` | push / PR to `main`, weekly | Static analysis (SAST) of the JavaScript code |
| **Dependabot** | `dependabot.yml` | weekly | Opens PRs for npm, Docker base image, and Actions updates |

Backend developer commands (run from `backend/`):

```bash
npm ci        # install exactly per package-lock.json
npm run lint  # ESLint
npm test      # node --test (DB-backed tests need a reachable Postgres)
```

> **Repo settings to finish the setup (one-time, in the GitHub UI):**
> enable branch protection on `main` requiring the **CI** and **CodeQL**
> checks to pass before merge. GHCR publishing needs no extra secrets — the
> workflow uses the built-in `GITHUB_TOKEN`.

---

This repository serves as a comprehensive demonstration of DevOps engineering practices applied in a real-world scenario.
