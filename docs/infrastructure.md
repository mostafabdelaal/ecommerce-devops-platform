# Infrastructure as Code (Terraform)

CloudMart's infrastructure is entirely managed by Terraform. The Terraform state is stored securely in an AWS S3 backend (`cloudmart-tfstate-<account-id>`) ensuring team collaboration and state locking.

## Provider Configuration
- **AWS Provider**: Provisions the underlying compute, networking, and storage.
- **Kubernetes Provider**: Authenticates to EKS using the short-lived token provided by `aws eks get-token`.
- **Helm Provider**: Deploys the necessary cluster add-ons natively through Terraform.

## AWS Infrastructure Components

### 1. VPC & Networking (`vpc.tf`)
- Leverages `terraform-aws-modules/vpc/aws`.
- 3 Public Subnets (for ALBs/NAT).
- 3 Private Subnets (for EKS Nodes and internal components).
- Contains necessary tags (`kubernetes.io/role/elb = 1`) required by the AWS Load Balancer Controller to discover subnets.

### 2. EKS Cluster (`eks.tf`)
- Kubernetes version `1.31`.
- A single managed node group (`cloudmart_nodes`) utilizing `m7i-flex.large` on-demand instances (Min: 2, Max: 5).
- Cluster endpoint public access is enabled.
- Pre-installs the `aws-ebs-csi-driver` EKS add-on for dynamic volume provisioning.

### 3. Edge Delivery (`frontend_cdn.tf`)
- Provisions a private S3 bucket to store the compiled React assets.
- Provisions a CloudFront Distribution with Origin Access Control (OAC). The S3 bucket policy strictly permits access only from CloudFront.
- Automatically handles SSL via ACM (`us-east-1`) and custom domain routing via Route53.

### 4. IAM & OIDC (`iam.tf`, `github_oidc.tf`)
- **IRSA (IAM Roles for Service Accounts)**: Terraform configures the OIDC provider for the EKS cluster, allowing Kubernetes Service Accounts to assume AWS IAM Roles directly.
  - Used for `aws-load-balancer-controller`
  - Used for `ebs-csi-controller`
  - Used for `external-dns`
- **GitHub Actions OIDC**: Uses AWS Identity Providers to establish trust with GitHub. The GitHub Actions CI/CD pipeline obtains temporary AWS credentials (via `sts:AssumeRoleWithWebIdentity`) without storing long-lived static Access Keys.

## Kubernetes Add-ons Installed via Terraform (`helm_controllers.tf`, `argocd.tf`)

While application code is managed by ArgoCD, foundational cluster controllers are bootstrapped by Terraform to avoid chicken-and-egg scenarios:
- **ArgoCD**: The GitOps engine itself is installed via Helm by Terraform.
- **ExternalDNS**: Synchronizes Kubernetes Ingress objects with AWS Route53.
