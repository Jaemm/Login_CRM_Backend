#!/bin/bash
set -e

APP_DIR="/home/ubuntu/repositories/BE_nodejs_login_crm_v1"
BRANCH="main"
APP_NAME="Login-CRM"

echo "Starting deployment..."

cd $APP_DIR

echo "Syncing with remote branch..."
git fetch origin
git reset --hard origin/$BRANCH

echo "Loading Node environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Installing dependencies..."
sudo npm ci

echo "Building application..."
sudo npm run build

echo "Restarting application..."
if pm2 describe $APP_NAME > /dev/null; then
  sudo pm2 reload $APP_NAME
else
  sudo pm2 start ecosystem.config.js
fi

echo "Notifying Airbrake deployment..."
npm run airbrake:deploy || echo "Airbrake deploy notification skipped or failed"

echo "Deployment completed successfully."
