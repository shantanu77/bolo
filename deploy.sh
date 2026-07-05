#!/usr/bin/env bash
# Deploys the current main branch to the AuraXpress production server.
# Usage: ./deploy.sh
set -euo pipefail

SSH_KEY="${DEPLOY_SSH_KEY:-/home/shantanu/mykey.key}"
REMOTE_USER="${DEPLOY_USER:-auraxpress}"
REMOTE_HOST="${DEPLOY_HOST:-auraxpress.com}"
REMOTE_APP_DIR="${DEPLOY_APP_DIR:-/var/www/auraxpress/app}"
PM2_APP_NAME="${DEPLOY_PM2_NAME:-auraxpress-app}"

ssh_remote() {
  ssh -i "$SSH_KEY" -o ConnectTimeout=10 "${REMOTE_USER}@${REMOTE_HOST}" "$@"
}

echo "==> Deploying $(git rev-parse --short HEAD) to ${REMOTE_HOST}"

echo "==> Pulling latest code on server"
ssh_remote "cd '${REMOTE_APP_DIR}' && git fetch origin && git reset --hard origin/main"

echo "==> Installing dependencies"
ssh_remote "cd '${REMOTE_APP_DIR}' && npm ci"

echo "==> Building"
ssh_remote "cd '${REMOTE_APP_DIR}' && npm run build"

echo "==> Restarting PM2 process"
ssh_remote "pm2 restart '${PM2_APP_NAME}' --update-env && pm2 save"

echo "==> Deploy complete"
ssh_remote "pm2 status '${PM2_APP_NAME}'"
