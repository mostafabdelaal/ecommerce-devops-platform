# CloudMart AWS Infrastructure (Terraform)

Provisions a VPC, a public EC2 instance running the app via docker-compose, and
an S3 static-website bucket for the frontend. See the design doc at
`docs/superpowers/specs/2026-07-05-aws-ec2-s3-terraform-design.md`.

## Prerequisites

- AWS account + `aws` CLI configured (`aws sts get-caller-identity` works)
- Terraform >= 1.5
- An SSH key pair (public key path goes in `terraform.tfvars`)

## Setup

1. Create your variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
2. Find your public IP and put it in `terraform.tfvars` as `my_ip = "x.x.x.x/32"`:
   ```bash
   curl -s https://checkip.amazonaws.com
   ```
3. Set `ssh_public_key_path` to your `.pub` key.

## Deploy

```bash
terraform init      # first time only
terraform plan      # review what will be created
terraform apply     # type "yes" to confirm
```

Apply prints the API URL, S3 website URL, and SSH command as outputs.

## Verify

```bash
# Backend (allow ~2 min after apply for the instance to bootstrap):
curl http://<ec2_public_ip>:3000/health      # -> {"status":"ok","database":"connected"}
curl http://<ec2_public_ip>:3000/api/products

# Frontend: open the s3_website_url output in a browser.
```

If `/health` is not up yet, SSH in and watch the bootstrap:
```bash
ssh ec2-user@<ip>
sudo cat /var/log/cloud-init-output.log     # bootstrap progress
cd app && docker compose ps                 # container status
```

## Redeploy the app after code changes

```bash
ssh ec2-user@<ip>
cd app && git pull && docker compose up -d --build
```

## Tear down (stop all charges)

```bash
terraform destroy
```

## Later iterations (not built yet)

Remote state (S3 + DynamoDB), RDS for Postgres, ALB + HTTPS, Jenkins CI/CD,
EKS, monitoring, Ansible. Tracked in the project README.
