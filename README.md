# NebuDesk

NebuDesk is a modern, web-based lightweight server control panel masquerading as a beautiful macOS-like desktop environment. It allows you to observe and manage your server, applications, domains, files, and documents through an intuitive graphical interface.

## Features

- **macOS-like UI**: Complete with Dock, MenuBar, Window Management, and full-rounded corners.
- **Application Discovery**: Automatically detects running Docker containers and PM2 applications on the host server.
- **Application Management**: Adopt running processes, assign them to a public domain, and manage their lifecycle (Start, Stop, Restart, View Logs).
- **Automated Reverse Proxy**: Generates and applies Caddy and Nginx configurations dynamically based on your app targets.
- **Cloudflare Integration**: Interacts natively with the Cloudflare API to provision DNS A-Records when apps are exposed to the public.
- **File Explorer**: A finder-like app that lets you navigate the server's filesystem, manage files/folders, and open documents.
- **NebuDocs Suite**: Built-in rich text editor (Docs), spreadsheet (Sheet), and slides viewer, capable of reading and saving directly to the host OS filesystem or local SQLite database.

## Architecture

- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Fastify (with WebSockets for future live streaming), SQLite3 for lightweight state management.
- **Integrations**: `dockerode` for Docker socket communication, `child_process` for PM2 & systemctl bridging, and native Fetch API for Cloudflare operations.

## Running Locally

NebuDesk is managed via PM2 to ensure background stability.
\`\`\`bash
cd /root/nebudesk/apps/server
npm install
pm2 start "npx tsx src/index.ts" --name nebudesk-backend

cd /root/nebudesk/apps/web
npm install
npm run dev # Or build and serve statically
\`\`\`

## Security & Observability

NebuDesk adheres to a strict "Read-Only Discovery" pattern. It does not alter your existing Docker or PM2 deployments until you explicitly "Adopt" them and perform configuration changes.

## Deployment Scenarios

### 1. Standard VPS (With Public IP)
If your server has a dedicated Public IP:
1. Go to **Settings** and input your Cloudflare API Token & Zone ID.
2. In the **App Manager**, click "Adopt" on a running app.
3. Check **both** "Enable Reverse Proxy" and "Cloudflare Proxy".
4. NebuDesk will automatically write the Caddy/Nginx config AND create the DNS A-Record in Cloudflare pointing to your public IP.

### 2. Proxmox LXC / NAT Environment (Via Cloudflare Tunnel)
If your server is behind a NAT, router, or running inside a Proxmox LXC container without a public IP, you must use **Cloudflare Zero Trust (cloudflared)**.

**Recommended Architecture (Wildcard Tunnel):**
Instead of creating a new tunnel route for every single app, set up one master tunnel to handle all incoming traffic, and let NebuDesk's Reverse Proxy handle the internal routing.

**Step-by-step Setup:**
1. Install `cloudflared` on your LXC/Host.
2. Create a tunnel and route a **Wildcard Domain** (e.g., `*.yourdomain.com`) to your local reverse proxy port (e.g., `http://localhost:80`).
3. Inside **NebuDesk App Manager**, adopt your application and enter the desired subdomain (e.g., `app.yourdomain.com`).
4. **Check** "Enable Reverse Proxy".
5. ⚠️ **UNCHECK** "Cloudflare Proxy" (DNS is already handled by your Wildcard Tunnel).
6. Click Save. 

**Traffic Flow:**
`Internet` ➡️ `Cloudflare Tunnel (*.yourdomain.com)` ➡️ `LXC Localhost:80` ➡️ `Caddy/Nginx (NebuDesk Managed)` ➡️ `Target Application`

This approach completely automates your LXC deployments. You never need to touch the Cloudflare Zero Trust dashboard again when adding new internal apps.
