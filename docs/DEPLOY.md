# Deploy Runbook (domain-less EKS via ArgoCD)

Manual step-by-step to bring CloudMart up on EKS from the `deploy-eks` branch.
For where each real secret lives, see [../SECRETS.md](../SECRETS.md).

Prerequisites: `aws` CLI, `terraform`, `kubectl`, `docker`, and an AWS account
with credit. All commands run from the `terraform/` directory unless noted.

## 1. AWS credentials (local)

Skip if `aws sts get-caller-identity` already returns account `004595030618`.

```bash
aws configure                 # Access Key, Secret, region eu-central-1
aws sts get-caller-identity   # confirm account 004595030618
```

## 2. Terraform account guard

```bash
cd terraform
cp .env.example .env           # has AWS_ACCOUNT_ID=004595030618; edit if different
```

## 3. Remote state bucket (once per account)

```bash
./backend-bootstrap.sh         # creates cloudmart-tfstate-<account>, versioned+encrypted
```

## 4. Provision infrastructure (~20 min)

```bash
terraform init -backend-config="bucket=cloudmart-tfstate-004595030618"
terraform apply                # EKS, VPC, ECR x4, GitHub OIDC role, ArgoCD
aws eks update-kubeconfig --name cloudmart-eks-cluster --region eu-central-1
kubectl get nodes              # expect 2 Ready
```

## 5. Build & push images

```bash
aws ecr get-login-password --region eu-central-1 \
  | docker login --username AWS --password-stdin 004595030618.dkr.ecr.eu-central-1.amazonaws.com

REG=004595030618.dkr.ecr.eu-central-1.amazonaws.com
docker build -t $REG/cloudmart-frontend:v1        ../Frontend
docker build -t $REG/cloudmart-product-service:v1 ../services/product-service
docker build -t $REG/cloudmart-user-service:v1    ../services/user-service
docker build -t $REG/cloudmart-order-service:v1   ../services/order-service
for r in frontend product-service user-service order-service; do
  docker push $REG/cloudmart-$r:v1
done
```

> Image tag must match `helm/cloudmart/values.yaml` (`tag: v1`).

## 6. Database secret (real password, not in git)

```bash
kubectl create secret generic cloudmart-db \
  --from-literal=db-password="$(openssl rand -base64 24)"
```

Then set `global.existingDbSecret: cloudmart-db` in `helm/cloudmart/values.yaml`,
commit and push `deploy-eks` so ArgoCD uses it.

## 7. Deploy via ArgoCD

```bash
kubectl apply -f ../argocd/aws-load-balancer-controller.yaml
kubectl apply -f ../argocd/cloudmart.yaml
kubectl get applications -n argocd -w        # wait Synced + Healthy
kubectl get ingress -n default               # ALB DNS -> open in browser
```

Optional monitoring (Prometheus/Grafana/ELK):

```bash
kubectl apply -f ../argocd/monitoring.yaml
kubectl get ingress -n monitoring            # Grafana ALB DNS
```

ArgoCD UI:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
kubectl port-forward svc/argocd-server -n argocd 8080:443    # https://localhost:8080  (user: admin)
```

## GitHub Actions

Nothing to add — the CI/CD pipeline authenticates with **OIDC**, no repo
secrets. It works once step 4 has created `github-actions-ecr-role`. Pushes to
`main` under `services/**` or `Frontend/**` build, scan (Trivy), push to ECR,
and bump the image tag in `values.yaml`.

## Teardown (stop billing)

Delete ingresses first so the ALBs are removed before the VPC:

```bash
kubectl delete -f ../argocd/cloudmart.yaml -f ../argocd/monitoring.yaml
kubectl delete ingress --all -n default; kubectl delete ingress --all -n monitoring
# wait until ALBs are gone:
aws elbv2 describe-load-balancers --region eu-central-1 --query "length(LoadBalancers[?starts_with(LoadBalancerName,'k8s-')])"
kubectl delete -f ../argocd/aws-load-balancer-controller.yaml
terraform destroy
# ECR repos with images need force delete:
for r in frontend product-service user-service order-service; do
  aws ecr delete-repository --repository-name cloudmart-$r --region eu-central-1 --force
done
```
