# Changelog

All notable changes to this project will be documented in this file.

## [v0.2.0] - 2026-09-03
### ✨ Features & Polishing
- **NebuBrowser (Full Chromium Engine)**: Completely rebuilt the internal browser. Replaced restricted iframes with a live Playwright Chromium CDP screencast streamed via WebSockets. Bypasses iframe restrictions, Google captchas, and includes a built-in DevTools Elements Inspector.
- **NebuCode IDE Upgrades**: Elevated the text editor to IDE status by adding a Global Command Palette (`Cmd+P`), Quick File Open, Rename, Document Formatting, and Horizontal Split Panes for side-by-side editing.
- **Terminal Multi-Tabs**: Introduced macOS-style multiple tabs for the Terminal app, allowing concurrent, isolated shell sessions.
- **Finder File Uploads**: Integrated `@fastify/multipart` to support seamless file uploading directly from your host PC to the server via the Finder UI.
- **Window & Dock Animations**: Added a buttery smooth `cubic-bezier` spring zoom animation when windows open, and introduced a toggleable macOS-style Auto-Hide feature for the Dock.
- **Interactive Installation**: The `install.sh` script now prompts before downloading the ~300MB Playwright Chromium engine. If skipped, NebuDesk gracefully handles the missing dependency with a UI error screen rather than crashing.

### 🐛 Bug Fixes & Mobile Support
- **Mobile Keyboard & Touch Engine**: Major overhaul of touch event handling. Fixed the Chromium mobile virtual keyboard glitch by mapping precise High-DPI screen coordinates and intercepting native touch scrolling.
- **Fluid Grid Layouts**: Ripped out rigid Tailwind screen breakpoints (`md:grid-cols-6`) in Finder and App Manager in favor of true CSS Container Queries (`auto-fill`). Grids now flow perfectly regardless of the window's physical width.
- **Z-Index Stacking Context**: Resolved an infinite z-index leak where windows would eventually overlap the Menu Bar and Dock. Implemented strict flex boundaries to restrict maximized windows precisely between the top bar and dock.
- **Toolbar Responsive Limits**: Added strict `minWidth` bounds (550px) to prevent complex app toolbars from getting crushed, and fixed floating macOS traffic lights overlapping with the Back/Forward navigation controls.

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
