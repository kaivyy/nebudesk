# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.2] - 2026-09-02
### ✨ Features & Polishing
- **Activity Monitor Consolidation**: Merged the old "System Monitor" and "Task Manager" into a single, unified macOS-style Activity Monitor. Features real-time background caching via `top` to guarantee flawless instantaneous CPU reporting, and a new Force Kill modal for precision task management.
- **Docker Manager Revamp**: Entirely rebuilt the Docker App. Fixed uppercase `dockerode` API mismatches that caused empty lists, and added full GUI controls (Start, Stop, Restart, Remove) alongside dynamic status badges.
- **MenuBar & Tray Enhancement**: Added macOS-style system tray icons (Spotlight, Control Center, Wi-Fi, Battery) to the right side. Fixed a critical z-index bug to ensure dropdown menus reliably float above all application windows. Restored missing Logout functionality.
- **NebuDesk Custom Branding**: Transformed the generic web title to "NebuDesk", injected a modern SVG favicon, and shipped a stunning new cosmic nebula 4K wallpaper as the default background.
- **Touch-Friendly Controls**: Stripped hover-only opacity states from critical buttons (like Task Manager's Kill action) to ensure 100% usability on mobile devices operating in Desktop Mode.

## [v0.1.1] - 2026-09-02
### 🚀 Dependency Upgrades & Fixes
- **Port 5050 Fix**: Resolved an issue where the Vite frontend server failed to bind correctly to port 5050.
- **Bleeding-Edge Resources**: Verified and updated all core dependencies to their absolute latest versions (React v19.2.8, Vite v8.2.2, Tailwind v4.3.3). NebuDesk is now running on the most modern tech stack available!

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
