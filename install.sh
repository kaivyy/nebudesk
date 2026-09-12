#!/usr/bin/env bash
# ==============================================================================
# NebuDesk Production Installer & Setup Script
# Lightweight, Idempotent, Secure & Production-Ready
# ==============================================================================

set -Eeuo pipefail

# Trap unexpected errors
trap 'echo -e "\n\033[0;31m❌ Installation failed at line $LINENO on command: $BASH_COMMAND\033[0m"; exit 1' ERR

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}"
echo "=========================================================="
echo "          🌌 NebuDesk Production Installer               "
echo "=========================================================="
echo -e "${NC}"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# ------------------------------------------------------------------------------
# [1/7] Environment & OS Check
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/7] Checking system environment...${NC}"

OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" != "Linux" ]; then
  echo -e "${RED}❌ NebuDesk is designed for Linux systems. Detected OS: $OS_TYPE${NC}"
  exit 1
fi

ARCH="$(uname -m)"
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "arm64" ]; then
  echo -e "${YELLOW}⚠️ Notice: Detected architecture ($ARCH). Native addons (node-pty, sqlite3) have best support on x86_64 and arm64/aarch64.${NC}"
fi

IS_DEBIAN=0
if [ -f /etc/os-release ]; then
  . /etc/os-release
  if [[ "${ID:-}" =~ ^(debian|ubuntu|pop|mint)$ ]] || [[ "${ID_LIKE:-}" =~ (debian|ubuntu) ]]; then
    IS_DEBIAN=1
  fi
fi

echo -e "  ${GREEN}✓${NC} Linux environment confirmed ($ARCH)"

# ------------------------------------------------------------------------------
# [2/7] Node.js & Core System Dependencies Check
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[2/7] Checking Node.js and system dependencies...${NC}"

NODE_OK=0
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  NODE_MAJOR=$(echo "$NODE_VER" | sed -E 's/^v([0-9]+).*/\1/')
  if [ "$NODE_MAJOR" -ge 20 ]; then
    NODE_OK=1
    echo -e "  ${GREEN}✓${NC} Node.js $NODE_VER detected (>= 20 required)"
  else
    echo -e "  ${YELLOW}⚠️ Node.js $NODE_VER detected, but NebuDesk requires Node.js >= 20.x.${NC}"
  fi
fi

if [ "$NODE_OK" -eq 0 ]; then
  if [ "$IS_DEBIAN" -eq 1 ] && [ "$EUID" -eq 0 ]; then
    echo -e "  ${BLUE}--> Installing Node.js 22 LTS via NodeSource...${NC}"
    apt-get update -y
    apt-get install -y curl ca-certificates gnupg
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v) installed successfully."
  else
    echo -e "${RED}❌ Node.js >= 20.x is required. Please install or upgrade Node.js on your system.${NC}"
    exit 1
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ npm is required but not found in PATH.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} npm $(npm -v) detected"

# Check core utilities: git, tmux, ripgrep (rg), curl
MISSING_PKGS=()
for tool in git tmux rg curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    if [ "$tool" == "rg" ]; then
      MISSING_PKGS+=("ripgrep")
    else
      MISSING_PKGS+=("$tool")
    fi
  fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
  if [ "$IS_DEBIAN" -eq 1 ] && [ "$EUID" -eq 0 ]; then
    echo -e "  ${BLUE}--> Installing missing core tools: ${MISSING_PKGS[*]}...${NC}"
    apt-get update -y
    apt-get install -y "${MISSING_PKGS[@]}" build-essential
    echo -e "  ${GREEN}✓${NC} Core system utilities installed."
  else
    echo -e "${YELLOW}⚠️ Missing recommended utilities: ${MISSING_PKGS[*]}.${NC}"
    echo -e "${YELLOW}   Please install them using your package manager for full terminal & search functionality.${NC}"
  fi
else
  echo -e "  ${GREEN}✓${NC} Core system tools available (git, tmux, ripgrep, curl)"
fi

# Check PM2
if ! command -v pm2 >/dev/null 2>&1; then
  echo -e "  ${BLUE}--> Installing PM2 process manager globally...${NC}"
  npm install -g pm2
  echo -e "  ${GREEN}✓${NC} PM2 installed."
else
  echo -e "  ${GREEN}✓${NC} PM2 $(pm2 -v) available"
fi

# ------------------------------------------------------------------------------
# [3/7] Port & Pre-Flight Check
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[3/7] Checking ports and resources...${NC}"

check_port() {
  local port=$1
  local service_name=$2
  if command -v ss >/dev/null 2>&1; then
    local listener
    listener=$(ss -tlnp 2>/dev/null | grep ":$port " || true)
    if [ -n "$listener" ]; then
      # Check if it belongs to an existing NebuDesk PM2 process
      if echo "$listener" | grep -E "node" >/dev/null; then
        echo -e "  ${YELLOW}ℹ️ Port $port is currently active (existing $service_name process). It will be updated.${NC}"
      else
        echo -e "${RED}❌ Port $port is in use by another service:${NC}\n$listener"
        echo -e "${RED}   Please stop the conflicting service before proceeding.${NC}"
        exit 1
      fi
    else
      echo -e "  ${GREEN}✓${NC} Port $port is free ($service_name)"
    fi
  else
    echo -e "  ${GREEN}✓${NC} Port $port checked"
  fi
}

check_port 3030 "Backend API"
check_port 5050 "Frontend Web"

# ------------------------------------------------------------------------------
# [4/7] Installing Dependencies (Deterministic npm ci)
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[4/7] Installing dependencies deterministically via lockfiles...${NC}"

echo -e "  ${BLUE}--> Installing backend dependencies (apps/server)...${NC}"
npm --prefix "$DIR/apps/server" ci --loglevel=error
echo -e "  ${GREEN}✓${NC} Backend dependencies installed."

echo -e "  ${BLUE}--> Installing frontend dependencies (apps/web)...${NC}"
npm --prefix "$DIR/apps/web" ci --loglevel=error
echo -e "  ${GREEN}✓${NC} Frontend dependencies installed."

# ------------------------------------------------------------------------------
# [5/7] Building NebuDesk (Production Artifacts)
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[5/7] Building production artifacts...${NC}"

echo -e "  ${BLUE}--> Compiling backend TypeScript (tsc)...${NC}"
npm --prefix "$DIR/apps/server" run build
if [ ! -f "$DIR/apps/server/dist/index.js" ]; then
  echo -e "${RED}❌ Backend compilation failed: dist/index.js not found.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Backend built successfully (apps/server/dist/index.js)."

echo -e "  ${BLUE}--> Building frontend SPA bundle (Vite)...${NC}"
npm --prefix "$DIR/apps/web" run build
if [ ! -f "$DIR/apps/web/dist/index.html" ]; then
  echo -e "${RED}❌ Frontend compilation failed: dist/index.html not found.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Frontend built successfully (apps/web/dist)."

# ------------------------------------------------------------------------------
# [6/7] Initializing Database & Configuration
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[6/7] Initializing database and workspace configuration...${NC}"

DB_PATH="$DIR/apps/server/dev.db"
if [ -f "$DB_PATH" ]; then
  echo -e "  ${GREEN}✓${NC} Existing database found at $DB_PATH. Preserving existing users and settings."
else
  echo -e "  ${GREEN}✓${NC} Fresh installation. Database will be created on first service start."
fi

# ------------------------------------------------------------------------------
# [7/7] Starting & Configuring Services (PM2)
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[7/7] Configuring and launching services with PM2...${NC}"

# Backend process management (idempotent restart or start)
if pm2 describe nebudesk-backend >/dev/null 2>&1; then
  echo -e "  ${BLUE}--> Restarting existing nebudesk-backend...${NC}"
  pm2 restart nebudesk-backend --update-env >/dev/null
else
  echo -e "  ${BLUE}--> Registering and starting nebudesk-backend...${NC}"
  pm2 start dist/index.js --name nebudesk-backend --cwd "$DIR/apps/server" >/dev/null
fi

# Frontend process management (idempotent restart or start)
if pm2 describe nebudesk-frontend >/dev/null 2>&1; then
  echo -e "  ${BLUE}--> Restarting existing nebudesk-frontend...${NC}"
  pm2 restart nebudesk-frontend --update-env >/dev/null
else
  echo -e "  ${BLUE}--> Registering and starting nebudesk-frontend...${NC}"
  pm2 serve dist 5050 --name nebudesk-frontend --spa --cwd "$DIR/apps/web" >/dev/null
fi

# Save PM2 process list
pm2 save --force >/dev/null

# Configure systemd startup if root
if [ "$EUID" -eq 0 ]; then
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${SUDO_USER:-root}" --hp "${HOME:-/root}" >/dev/null 2>&1 || true
fi

# ------------------------------------------------------------------------------
# Health Check Verification
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}Verifying service health...${NC}"
HEALTH_PASS=0
for i in $(seq 1 15); do
  BACKEND_RES=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/api/health 2>/dev/null || true)
  FRONTEND_RES=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5050 2>/dev/null || true)
  if [ "$BACKEND_RES" == "200" ] && [ "$FRONTEND_RES" == "200" ]; then
    HEALTH_PASS=1
    break
  fi
  sleep 1
done

if [ "$HEALTH_PASS" -eq 1 ]; then
  echo -e "  ${GREEN}✓${NC} Backend API health check passed (HTTP 200 on port 3030)"
  echo -e "  ${GREEN}✓${NC} Frontend SPA server health check passed (HTTP 200 on port 5050)"
else
  echo -e "${RED}❌ Health check timed out. Backend or Frontend failed to respond.${NC}"
  echo -e "${RED}   Run 'pm2 logs' to check runtime errors.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# Network & Access Summary
# ------------------------------------------------------------------------------
TAILSCALE_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || true)
fi

echo -e "\n${GREEN}${BOLD}=========================================================="
echo "          ✅ NebuDesk Installation Complete! ✅           "
echo "=========================================================="
echo -e "${NC}"
echo -e "${BOLD}Access Information:${NC}"
if [ -n "$TAILSCALE_IP" ]; then
  echo -e "  🌐 Tailscale Private URL : ${GREEN}http://${TAILSCALE_IP}:5050${NC}"
fi
echo -e "  🌐 Local Server URL      : ${GREEN}http://127.0.0.1:5050${NC}"
echo -e "  🔑 Initial Credentials   : ${BOLD}admin${NC} / ${BOLD}admin${NC}"
echo -e "     (You will be prompted to change your password upon first login)"
echo ""
echo -e "${BOLD}Service Management:${NC}"
echo "  • View status  : pm2 status"
echo "  • View logs    : pm2 logs"
echo "  • Restart      : pm2 restart all"
echo "  • Stop         : pm2 stop all"
echo ""
