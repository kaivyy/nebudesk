# Phase 3: Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement interactive Terminal using xterm.js, WebSocket, and node-pty.

**Tech Stack:** Fastify WebSocket, node-pty, xterm.js, React.

## Global Constraints
- Backend must use Node.js and node-pty.
- Frontend must use xterm.js and xterm-addon-fit.

---

### Task 1: Setup Backend WebSocket and PTY

**Files:**
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json`

- [x] **Step 1: Install node-pty and fastify-websocket**

```bash
cd /root/nebudesk/apps/server
npm install @fastify/websocket node-pty
npm install -D @types/node-pty
```

- [x] **Step 2: Update Server to Support WebSocket and PTY**

Update `/root/nebudesk/apps/server/src/index.ts` to include websocket registration and terminal handler:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fs from 'fs/promises';
import path from 'path';
import pty from 'node-pty';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: '*' });
await fastify.register(websocket);

const ALLOWED_ROOT = '/root/nebudesk';

fastify.get('/api/files', async (request, reply) => {
  // ... existing code ...
  const { dir = '/' } = request.query as { dir: string };
  const targetPath = path.resolve(ALLOWED_ROOT, dir.replace(/^\/+/, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const stat = await fs.stat(path.join(targetPath, entry.name));
      return { name: entry.name, isDirectory: entry.isDirectory(), size: stat.size, modified: stat.mtime };
    }));
    return { path: dir, files };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/ws/terminal', { websocket: true }, (socket, req) => {
  const shell = process.env.SHELL || 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || '/',
    env: process.env as Record<string, string>
  });

  ptyProcess.onData((data) => {
    socket.send(JSON.stringify({ type: 'terminal.output', data }));
  });

  socket.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'terminal.input') {
        ptyProcess.write(msg.data);
      } else if (msg.type === 'terminal.resize') {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    } catch (e) {}
  });

  socket.on('close', () => {
    ptyProcess.kill();
  });
});

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) { fastify.log.error(err); process.exit(1); }
});
```

- [x] **Step 3: Commit**

```bash
git add apps/server
git commit -m "feat: implement backend terminal websocket and pty"
```

---

### Task 2: Implement Terminal App in Frontend

**Files:**
- Create: `apps/web/src/apps/terminal/TerminalApp.tsx`
- Modify: `apps/web/src/desktop/Desktop.tsx`
- Modify: `apps/web/src/desktop/Dock.tsx`

- [x] **Step 1: Install xterm in web**

```bash
cd /root/nebudesk/apps/web
npm install xterm @xterm/addon-fit
```

- [x] **Step 2: Write Terminal App Component**

Write `/root/nebudesk/apps/web/src/apps/terminal/TerminalApp.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalApp() {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'monospace',
      theme: { background: '#1e1e1e' }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const ws = new WebSocket('ws://localhost:3001/ws/terminal');

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal.output') {
          term.write(msg.data);
        }
      } catch (e) {}
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal.input', data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal.resize', cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="w-full h-full bg-[#1e1e1e] p-1" />;
}
```

- [x] **Step 3: Connect TerminalApp to Desktop and Dock**

Update `/root/nebudesk/apps/web/src/desktop/Desktop.tsx` to include `TerminalApp`:
```tsx
import TerminalApp from '../apps/terminal/TerminalApp';
// ...
            <div className="flex-1 overflow-hidden relative text-black">
              {win.appId === 'files' && <FilesApp />}
              {win.appId === 'terminal' && <TerminalApp />}
            </div>
```

Update `/root/nebudesk/apps/web/src/desktop/Dock.tsx`:
Add terminal button:
```tsx
      <button 
        onClick={() => openWindow({
          appId: 'terminal', title: 'Terminal', x: 150, y: 150, width: 600, height: 400, minWidth: 400, minHeight: 300, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        💻
      </button>
```

- [x] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat: implement frontend terminal app using xterm"
```
