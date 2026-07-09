# Input variables. Real values go in terraform.tfvars (gitignored).

variable "project" {
  description = "Project name, used as a prefix / tag on all resources."
  type        = string
  default     = "cloudmart"
}

variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro is free-tier eligible."
  type        = string
  default     = "t3.micro"
}

variable "my_ip" {
  description = "Your public IP in CIDR form (e.g. 197.x.x.x/32). Used to lock down SSH. No default on purpose."
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to your SSH public key (e.g. ~/.ssh/id_ed25519.pub). Uploaded as the EC2 key pair."
  type        = string
}

variable "repo_url" {
  description = "Public Git URL the EC2 instance clones and runs via docker compose."
  type        = string
  default     = "https://github.com/mostafabdelaal/ecommerce-devops-platform.git"
}

variable "repo_branch" {
  description = "Branch to deploy (main has backend + docker-compose)."
  type        = string
  default     = "main"
}
