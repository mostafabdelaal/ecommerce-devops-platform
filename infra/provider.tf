# AWS provider configuration.
# Region comes from a variable so the whole stack can be moved between regions.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

# Used to build a globally-unique S3 bucket name from the account id.
data "aws_caller_identity" "current" {}
