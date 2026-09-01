# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.0] - 2026-09-02
### 🎉 Initial Alpha Release
NebuDesk is officially born! This release establishes the core foundation of a lightweight, highly secure, macOS-style server control panel.

### ✨ Features
- **macOS-like Web Desktop**: Complete with a draggable window manager, Dock, and Menu Bar.
- **App Manager (Discovery Engine)**: Automatically detects running Docker containers and PM2 applications without any manual configuration.
- **Lifecycle Control**: Smart start/stop/restart toggle buttons and real-time log viewer directly from the UI.
- **Automated Reverse Proxy**: Automatically generates Caddy and Nginx proxy blocks when an application is "Adopted".
- **Native Cloudflare Integration**: 1-Click DNS A-record provisioning via Cloudflare REST API.
- **NebuDocs Suite**: Built-in rich text editor (`NebuDocs`) with an autosave feature linked to local SQLite.
- **File Explorer**: Finder-like application for navigating and managing host files securely.
- **Auto-Installer Script (`install.sh`)**: A fail-safe deployment script that installs Node, PM2, Docker, Caddy, Tailscale, and automatically hardens the UFW Firewall.
- **Zero Trust Ready**: Comprehensive architectural support for Proxmox LXC deployments behind Cloudflare Wildcard Tunnels.

### 🛡️ Security
- **Tailscale Shielding**: Automatic UFW configuration to block public access to internal ports, isolating the panel entirely to the Tailscale VPN.
- **Stateless Operation**: NebuDesk runs as an observer and router; it does not inject itself into your existing Docker or PM2 deployments without explicit "Adoption".
