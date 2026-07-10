# Credentials, Keys & Paths

Where every real secret lives and how to set it. **No real secret values are
committed** — the repo ships `.example` templates and references to Secrets you
create out-of-band. `.env`, `*.tfvars`, and `*.tfstate` are gitignored.

## 1. AWS credentials (local / Terraform)

Terraform and the AWS CLI use your local AWS credentials — nothing repo-side.

```bash
aws configure            # or: aws configure --profile cloudmart
# writes ~/.aws/credentials  (never committed)
aws sts get-caller-identity   # verify account 004595030618
```

`terraform/.env` (copy from `.env.example`) holds `AWS_ACCOUNT_ID`; `providers.tf`
reads it to pin `allowed_account_ids` so you can't apply against the wrong account.

## 2. CI/CD pipeline (GitHub Actions → ECR)

No static keys. The workflow authenticates via **GitHub OIDC** and assumes an
AWS role:

| Path | Value |
|------|-------|
| `.github/workflows/ci-cd.yml` `ECR_REGISTRY` | `004595030618.dkr.ecr.eu-central-1.amazonaws.com` |
| `.github/workflows/ci-cd.yml` `OIDC_ROLE_ARN` | `arn:aws:iam::004595030618:role/github-actions-ecr-role` |

The OIDC provider + role are created by `terraform/github_oidc.tf` (allowed repo
set via `var.github_repo`). No GitHub repo secrets are required. Run
`terraform apply` once so the role exists before the pipeline runs.

## 3. Database password (Kubernetes)

The chart reads the DB password from a Secret, not from `values.yaml`.

- **Dev default:** leave `global.existingDbSecret: ""` — the chart renders a
  `cloudmart-db` Secret from `global.dbPassword` (dev-only placeholder).
- **Real deploy:** create your own Secret and point the chart at it:

```bash
kubectl create secret generic cloudmart-db \
  --from-literal=db-password="$(openssl rand -base64 24)"
# then in values.yaml:  global.existingDbSecret: cloudmart-db
```

Local `docker-compose` uses `cloudmart/cloudmart` (dev only) — override via a
`.env` next to `docker-compose.yml` if you want.

## 4. Terraform remote state (S3 backend)

State lives in an account-specific S3 bucket. Bootstrap once, then init:

```bash
cd terraform
./backend-bootstrap.sh            # creates cloudmart-tfstate-<account>
terraform init -backend-config="bucket=cloudmart-tfstate-004595030618"
```

Prefer a throwaway local run? Comment out the `backend "s3"` block in
`providers.tf` (falls back to local state).

## File map

| Template (committed) | Real file (gitignored) |
|----------------------|------------------------|
| `terraform/.env.example` | `terraform/.env` |
| `terraform/terraform.tfvars.example` | `terraform/terraform.tfvars` |
| — (create in cluster) | `cloudmart-db` k8s Secret |
| — (local) | `~/.aws/credentials` |
