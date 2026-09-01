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
