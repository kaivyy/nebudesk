# NebuDesk

NebuDesk is a modern, web-based lightweight server control panel masquerading as a beautiful macOS-like desktop environment. It allows you to observe and manage your server, applications, domains, files, and documents through an intuitive graphical interface.

## 🚀 1-Click Installation (Fresh VPS)

For a brand new Ubuntu/Debian VPS, NebuDesk provides an automated installation script that sets up everything securely: Node.js, PM2, Docker, Caddy, Tailscale, and UFW Firewall.

```bash
git clone https://github.com/your-username/nebudesk.git
cd nebudesk
sudo ./install.sh
```

**Post-Installation Steps:**
1. Connect your server to your VPN: `sudo tailscale up`
2. Access NebuDesk securely via your browser: `http://100.x.x.x:8080` (Replace with your VPS Tailscale IP).
3. (Optional) Inside NebuDesk, go to **App Manager -> Discovery**, Adopt `nebudesk-frontend`, and map it to a public domain via Cloudflare Proxy!

---

## 🛡️ Security Best Practices

### The Tailscale + UFW Architecture
The `install.sh` script automatically configures an impenetrable UFW firewall setup for your server:
* Port `22` (SSH), `80` (HTTP), and `443` (HTTPS) are open to the public internet.
* All other ports (e.g., `8080`, `3001`, `8000`) are **blocked** from the public internet.
* **The Tailscale Exception:** UFW is configured to allow ALL traffic coming from the `tailscale0` network interface. This means you (and only you) can access any raw application port directly via your `100.x.x.x` IP.

### Beware of the "Docker Trap"
If you deploy other apps via Docker Compose, remember that **Docker automatically bypasses UFW rules** when you map ports openly.
* ❌ **Bad:** `ports: ["3000:3000"]` (This exposes port 3000 to the entire internet, ignoring UFW).
* ✅ **Good:** `ports: ["127.0.0.1:3000:3000"]` (This binds the app only to local memory. It is incredibly safe and can only be accessed through NebuDesk's Reverse Proxy).

---

## 💡 Features

- **macOS-like UI**: Complete with Dock, MenuBar, Window Management, and full-rounded corners.
- **Application Discovery**: Automatically detects running Docker containers and PM2 applications on the host server.
- **Application Management**: Adopt running processes, assign them to a public domain, and manage their lifecycle (Start, Stop, Restart, View Logs) directly from the Discovery tab.
- **Automated Reverse Proxy**: Generates and applies Caddy and Nginx configurations dynamically based on your app targets.
- **Cloudflare Integration**: Interacts natively with the Cloudflare API to provision DNS A-Records when apps are exposed to the public.
- **File Explorer**: A finder-like app that lets you navigate the server's filesystem, manage files/folders, and open documents.
- **NebuDocs Suite**: Built-in rich text editor (Docs), spreadsheet (Sheet), and slides viewer, capable of reading and saving directly to the host OS filesystem or local SQLite database.

## 🏗️ Architecture
- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Fastify (with WebSockets for future live streaming), SQLite3 for lightweight state management.
- **Integrations**: `dockerode` for Docker socket communication, `child_process` for PM2 & systemctl bridging, and native Fetch API for Cloudflare operations.
