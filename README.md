# ☁️ CloudMart - DevOps E-Commerce Platform

This repository serves as a highly scalable, production-ready demonstration of modern **DevOps, GitOps, and Cloud-Native** engineering practices. Originally developed as the DEPI Final Graduation Project, it has been evolved into a robust microservices architecture deployed entirely on AWS.

---

## 🏗️ Quick Links & Documentation

We treat documentation as a first-class citizen. Dive deep into how this platform is built and deployed:

- [📐 System Architecture](docs/architecture.md): Microservices breakdown, Database-per-service pattern, and CloudFront integration.
- [🛠️ Infrastructure as Code](docs/infrastructure.md): Terraform configuration, AWS EKS, IAM Roles for Service Accounts (IRSA), and VPC design.
- [🚀 Deployment & CI/CD](docs/deployment-and-cicd.md): GitHub Actions, Trivy Security Scanning, and ArgoCD GitOps pipelines.
- [📊 Observability & Monitoring](docs/monitoring.md): Prometheus, Grafana, Fluent-bit, and the Elasticsearch (EFK) stack.

---

## 🌐 Live Environments

The platform is automatically deployed and exposed via AWS Route53 and ACM SSL Certificates:

- **Frontend / Storefront**: `https://cloudmart.abdallahgabr.me` (Served globally via AWS CloudFront & S3)
- **Backend APIs**: `https://api.cloudmart.abdallahgabr.me/api/products` (Routed via ALB Ingress)
- **ArgoCD Dashboard**: `https://argocd.abdallahgabr.me`
- **Grafana Metrics**: `https://grafana.abdallahgabr.me`
- **Kibana Logs**: `https://kibana.abdallahgabr.me`

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Cloud Provider** | AWS (EKS, S3, CloudFront, ECR, Route53, ACM, VPC, EBS) |
| **Infrastructure as Code** | Terraform, Helm |
| **Microservices Backend** | Node.js, Express, PostgreSQL |
| **Frontend** | React, Vite |
| **CI/CD pipeline** | GitHub Actions, AWS OIDC |
| **GitOps Delivery** | ArgoCD |
| **Monitoring** | Prometheus, Grafana |
| **Logging** | Fluent-bit, Elasticsearch, Kibana |
| **Security** | Trivy (Container Scanning) |

---

## 🚀 Key Features

- **Decoupled Edge UI**: The React frontend is completely decoupled from the Kubernetes cluster, hosted on S3 and distributed globally via CloudFront.
- **Microservices Architecture**: Three independent backend services (`product`, `user`, `order`) utilizing the Database-per-service pattern.
- **GitOps Methodology**: The EKS cluster state is automatically reconciled with the `helm/cloudmart` definitions by ArgoCD.
- **OIDC Security**: The GitHub Actions pipeline uses OpenID Connect to securely authenticate with AWS, eliminating the need for long-lived, static access keys.
- **Automated DNS & SSL**: `ExternalDNS` automatically creates Route53 records for new Kubernetes Ingress resources, secured by AWS Certificate Manager.
- **Centralized Logging**: `Fluent-bit` aggregates logs directly from the Docker container sockets on the EKS nodes and ships them to a centralized Elasticsearch cluster.

---

## 🧑‍💻 Running Locally

To run the full stack (Microservices + PostgreSQL databases + React Frontend) locally for development:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mostafabdelaal/ecommerce-devops-platform.git
   cd ecommerce-devops-platform
   ```
2. **Start Docker Compose**:
   ```bash
   docker-compose up --build
   ```
3. **Access the Application**:
   - The React UI will be available at `http://localhost:80`
   - The backend APIs will be exposed on ports `3000`, `3001`, and `3002`.
