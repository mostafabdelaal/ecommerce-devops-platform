terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  required_version = ">= 1.3.0"

  # Partial S3 backend. The bucket name is account-specific, so it is supplied
  # at init time (see backend-bootstrap.sh which creates the bucket first):
  #   ./backend-bootstrap.sh
  #   terraform init -backend-config="bucket=cloudmart-tfstate-004595030618"
  # For a quick local run instead, comment this block out (defaults to local).
  backend "s3" {
    key     = "cloudmart/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
}

locals {
  # Parse the .env file natively in Terraform to read AWS_ACCOUNT_ID
  env_content = fileexists("${path.module}/.env") ? file("${path.module}/.env") : ""
  envs        = { for tuple in regexall("([^=\\n]+)=([^\\n]*)", local.env_content) : trimspace(tuple[0]) => trimspace(tuple[1]) }

  account_id = lookup(local.envs, "AWS_ACCOUNT_ID", "UNKNOWN_ACCOUNT_ID")
}

provider "aws" {
  region              = var.aws_region
  allowed_account_ids = local.account_id != "UNKNOWN_ACCOUNT_ID" ? [local.account_id] : null

  default_tags {
    tags = {
      Environment = "Production"
      Project     = "CloudMart"
      AccountId   = local.account_id
      ManagedBy   = "Terraform"
    }
  }
}
