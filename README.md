<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/monitor.svg" width="100" alt="NebuDesk Logo" />
  
  # 🌌 NebuDesk
  
  **Your Lightweight Server Control Panel, Masquerading as a macOS Desktop**

  [![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC.svg)](https://tailwindcss.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  *NebuDesk transforms the daunting task of Linux Server Administration into a familiar, beautiful, and highly secure Desktop Experience.*
</div>

---

## ✨ Features

NebuDesk isn't just a control panel; it's a completely integrated web operating system built directly over your VPS.

| 🎛️ **App Manager** | 🌐 **Reverse Proxy Engine** |
| :--- | :--- |
| **Smart Discovery**: Automatically detects Docker Containers & PM2 Apps.<br>**Lifecycle Control**: Start, Stop, and Restart your apps with a single click.<br>**Live Logs**: View real-time terminal logs directly from the UI. | **Zero-Touch Config**: Auto-generates Nginx & Caddy blocks.<br>**Cloudflare Integration**: Instantly provisions DNS A-records.<br>**Zero Trust Ready**: Seamlessly works alongside Cloudflare Tunnels. |

| 📁 **File Explorer** | 📝 **NebuDocs Suite** |
| :--- | :--- |
| **macOS Finder Style**: Browse your server's filesystem effortlessly.<br>**1-Click Open**: Integrated seamlessly with the desktop window manager.<br>**File Actions**: Read, write, and manage server files securely. | **NebuDocs**: A robust Rich Text Editor synced to SQLite.<br>**NebuSheet**: A spreadsheet tool to manage tabular data.<br>**NebuSlides**: Build presentations right from your server. |

---

## 🚀 Quick Start (1-Click Install)

Got a fresh Ubuntu/Debian VPS? NebuDesk provides an interactive, fail-safe bash script that installs everything (Node, PM2, Docker, Caddy, Tailscale) and secures your server.

```bash
git clone https://github.com/your-username/nebudesk.git
cd nebudesk
sudo ./install.sh
```

> **Note on SSH:** The installer is strictly designed to **preserve your SSH connection**. It guarantees `ufw allow OpenSSH` and `22/tcp` before activating the firewall to prevent any accidental lockouts!

**After Installation:**
1. Run `sudo tailscale up` to securely link your server to your devices.
2. Open your browser and navigate to `http://100.x.x.x:5050` *(replace with your VPS Tailscale IP)*.
3. Open **App Manager > Discovery** to start adopting your internal apps!

---

## 🛡️ Military-Grade Security Architecture

NebuDesk is built with the philosophy of **"Observe and Route"**. We don't modify your host OS; we just securely orchestrate it.

### 1. The Tailscale + UFW Shield
By default, the installer activates UFW and **closes all ports** except `80` (HTTP) and `443` (HTTPS). 
However, it injects a special rule: `ufw allow in on tailscale0`. This means NebuDesk itself (running on port `5050`) is completely invisible to the public internet, but instantly accessible via your private VPN!

### 2. Beware of the "Docker Trap" 🐳
If you deploy your own applications via Docker Compose, remember that **Docker automatically bypasses UFW rules** if you publish ports publicly.
* ❌ **Bad (Publicly Exposed):** `ports: ["3000:3000"]`
* ✅ **Good (NebuDesk Shielded):** `ports: ["127.0.0.1:3000:3000"]` 

*By binding your Docker apps to `127.0.0.1`, you guarantee that nobody can access them except through NebuDesk's managed Reverse Proxy (Nginx/Caddy).*

---

## 🏗️ Technology Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons.
*   **Backend**: Node.js, Fastify, SQLite3 (No heavy database engines required).
*   **System Integrations**: 
    *   `dockerode` (Docker Socket API)
    *   `child_process` (PM2 API bridge)
    *   Native Node Fetch (Cloudflare DNS REST API)

<div align="center">
  <p>Built with ❤️ to make Server Administration peaceful again.</p>
</div>
