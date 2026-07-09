#!/bin/bash
# Cloud-init bootstrap for Amazon Linux 2023.
# Installs Docker + the Compose plugin, clones the repo, and starts the stack.
set -euxo pipefail

# System packages.
dnf update -y
dnf install -y docker git

# Docker engine.
systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose v2 as a CLI plugin (AL2023 ships docker without compose).
DOCKER_CLI_PLUGINS=/usr/local/lib/docker/cli-plugins
mkdir -p "$DOCKER_CLI_PLUGINS"
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o "$DOCKER_CLI_PLUGINS/docker-compose"
chmod +x "$DOCKER_CLI_PLUGINS/docker-compose"

# Clone and start the application.
cd /home/ec2-user
git clone --branch "${repo_branch}" "${repo_url}" app
chown -R ec2-user:ec2-user /home/ec2-user/app
cd app
docker compose up -d --build

echo "CloudMart bootstrap complete" > /home/ec2-user/BOOTSTRAP_DONE
