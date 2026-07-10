#!/usr/bin/env bash
# Creates the S3 bucket that holds Terraform remote state. Run once per account
# before the first `terraform init`. Idempotent-ish: re-running on an existing
# bucket is harmless (the create call just errors and is ignored).
set -euo pipefail

REGION="${AWS_REGION:-eu-central-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="cloudmart-tfstate-${ACCOUNT_ID}"

echo "Creating state bucket: ${BUCKET} (${REGION})"
aws s3api create-bucket \
  --bucket "${BUCKET}" \
  --region "${REGION}" \
  --create-bucket-configuration LocationConstraint="${REGION}" 2>/dev/null || true

aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo
echo "Done. Initialize Terraform with:"
echo "  terraform init -backend-config=\"bucket=${BUCKET}\""
