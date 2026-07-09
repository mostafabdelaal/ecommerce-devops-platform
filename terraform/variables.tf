variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "cloudmart-eks-cluster"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "The domain name for the application (unused in domain-less deploy)"
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "The Route 53 Hosted Zone ID for the domain (unused in domain-less deploy)"
  type        = string
  default     = ""
}

