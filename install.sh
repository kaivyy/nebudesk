#!/bin/bash
# NebuDesk Auto-Installer Script
# Run this script as root on a fresh Ubuntu/Debian VPS.

set -e

echo "========================================="
echo "🚀 Starting NebuDesk Auto-Installation 🚀"
echo "========================================="

# 1. Update OS and Install Core Dependencies
echo "[1/6] Updating OS and installing core dependencies (Docker, Caddy, Git, UFW)..."
apt-get update -y
apt-get install -y curl git ufw docker.io caddy

# 2. Install Node.js 20 & PM2
echo "[2/6] Installing Node.js 20 and PM2..."
if ! command -v node > /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2 typescript

# 3. Install Tailscale
echo "[3/6] Installing Tailscale VPN..."
if ! command -v tailscale > /dev/null; then
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# 4. Configure UFW (Firewall) specifically for Tailscale & Web
echo "[4/6] Configuring UFW Firewall (Safely preserving SSH)..."
# ALWAYS ALLOW SSH FIRST to prevent disconnection!
ufw allow OpenSSH
ufw allow 22/tcp

# Set defaults
ufw default deny incoming
ufw default allow outgoing

# Allow specific traffic
ufw allow 80/tcp          # For public web/Caddy
ufw allow 443/tcp         # For public web/Caddy
ufw allow in on tailscale0 # Allow ALL traffic but ONLY from Tailscale VPN

# Enable Firewall
ufw --force enable

# 5. Build and Deploy NebuDesk
echo "[5/6] Building NebuDesk..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Backend
echo "--> Installing Backend Dependencies..."
cd $DIR/apps/server
npm install

# Frontend
echo "--> Installing & Building Frontend..."
cd $DIR/apps/web
npm install
npm run build

# Start with PM2
echo "--> Daemonizing with PM2..."
pm2 stop nebudesk-backend 2>/dev/null || true
pm2 stop nebudesk-frontend 2>/dev/null || true

cd $DIR/apps/server
pm2 start "npx tsx src/index.ts" --name nebudesk-backend --cwd "$DIR/apps/server"

cd $DIR/apps/web
pm2 serve dist 8080 --name nebudesk-frontend --spa --cwd "$DIR/apps/web"

pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root || true

echo "========================================="
echo "✅ NebuDesk Installation Complete! ✅"
echo "========================================="
echo "Important Next Steps:"
echo "1. Run 'sudo tailscale up' to connect this server."
echo "2. Access securely via: http://100.x.x.x:8080"
echo "3. Go to Discovery -> Adopt 'nebudesk-frontend' for a public domain."
echo ""
