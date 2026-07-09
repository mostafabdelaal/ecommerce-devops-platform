# CloudMart on AWS — EC2 + S3 + VPC via Terraform

**Date:** 2026-07-05
**Status:** Approved
**Scope:** First cloud iteration of the DEPI DevOps graduation project.

## Goal

Provision AWS infrastructure as code with Terraform so that a single
`terraform apply` yields:

- The CloudMart backend (Express + PostgreSQL) running on an EC2 instance via
  the existing `docker-compose.yml`.
- The CloudMart frontend (static `CloudMart.dc.html` + `support.js`) served
  from an S3 static website bucket.
- A dedicated VPC with public networking, all created and destroyable via
  Terraform.

`terraform destroy` must tear everything down cleanly (free-tier hygiene).

## Non-goals (future iterations)

RDS, Application Load Balancer, HTTPS/ACM, Jenkins CI/CD, Kubernetes (EKS),
monitoring (Prometheus/Grafana/ELK), Ansible configuration management, ECR
image registry. These remain listed in the project README as planned work.

## Architecture

```
VPC 10.0.0.0/16
 └── public subnet 10.0.1.0/24
     ├── Internet Gateway + public route table (0.0.0.0/0 → IGW)
     └── EC2 t3.micro (Amazon Linux 2023, public IP)
         └── user_data bootstrap:
               - install docker + docker compose plugin + git
               - git clone https://github.com/mostafabdelaal/ecommerce-devops-platform (main)
               - docker compose up -d   (backend + postgres)
Security Group:
   :22   SSH  ← my_ip/32 only
   :3000 API  ← 0.0.0.0/0
EC2 key pair ← user's existing SSH public key
S3 bucket (static website hosting, public read)
   ← Frontend/CloudMart.dc.html (as index.html) + support.js
```

The frontend is a self-contained static demo that loads React/Babel from public
CDNs and makes **no** calls to the backend API, so the S3 site and the EC2 API
are independent — no runtime URL wiring between them is required.

## Terraform file layout (`infra/`)

| File | Responsibility |
|------|----------------|
| `provider.tf` | AWS provider + required_providers, region from var |
| `network.tf` | VPC, public subnet, IGW, route table + association |
| `security.tf` | security group (22/3000), EC2 key pair |
| `compute.tf` | EC2 instance, AMI data source, user_data bootstrap |
| `storage.tf` | S3 bucket, public-access + website config, object uploads |
| `variables.tf` | region, instance_type, my_ip, ssh_public_key_path, repo_url, project name |
| `outputs.tf` | ec2_public_ip, api_url, s3_website_url, ssh_command |
| `terraform.tfvars` | user's real values (gitignored) |
| `user_data.sh` | cloud-init bootstrap script referenced by compute.tf |

## State

Local state (`infra/terraform.tfstate`), gitignored. Documented migration path
to an S3 + DynamoDB remote backend for a later iteration.

## Deploy flow

1. `cd infra && terraform init`
2. `terraform plan`
3. `terraform apply`
4. Read outputs: API URL (`http://<ip>:3000`), S3 website URL, SSH command.
5. Verify: `curl http://<ip>:3000/health` → `{"status":"ok","database":"connected"}`
6. Redeploy app: SSH in, `git pull && docker compose up -d --build`.
7. `terraform destroy` to remove all resources.

## Security notes

- SSH restricted to `my_ip/32` (a required variable, no default).
- Port 3000 open to the world (demo API, no auth) — acceptable for a graduation
  demo; flagged for hardening (ALB + auth) in a later iteration.
- No secrets in Terraform: DB credentials use the compose defaults; documented
  as a follow-up to move to SSM Parameter Store / Secrets Manager.

## Cost

All resources free-tier eligible (t3.micro 750 h/mo for 12 months, S3 5 GB).
Expected ~$0 within limits. `terraform destroy` prevents ongoing charges.
