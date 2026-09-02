# NebuBrowser DevTools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade NebuBrowser from a simple iframe to a real remote developer browser with Chromium CDP integration on-demand, featuring Elements, Console, and Network panels.

**Architecture:** 
- Frontend: React + existing `windowStore` UI. Add split-pane DevTools UI. Connects to Fastify via WebSocket.
- Backend: Fastify WebSocket that spans `playwright-core` (Chromium headless) on-demand per user session. Passes CDP events down to the frontend.

**Tech Stack:** React, Fastify, `@fastify/websocket`, `playwright-core`

## Global Constraints

- Never expose CDP port publically (e.g., 0.0.0.0:9222).
- Keep iframe for lightweight mode. Chromium must run on-demand only when DevTools are opened.
- Reuse existing NebuDesk UI/UX components. No new design systems.
- Do not use Electron or Tauri.

---

### Task 1: Backend Playwright Core Installation & Service Setup

**Files:**
- Create: `apps/server/src/browserService.ts`
- Modify: `apps/server/package.json`
- Modify: `apps/server/src/index.ts`

**Interfaces:**
- Produces: `ws/browser` endpoint for frontend to connect to.

- [ ] **Step 1: Install playwright-core**

```bash
cd apps/server
npm install playwright-core
```

- [ ] **Step 2: Create browserService.ts**

```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';

let browserInstance: Browser | null = null;
const activePages = new Map<string, { context: BrowserContext; page: Page; cdpSession: any }>();

export async function getBrowser() {
  if (!browserInstance) {
    // Only launch when needed, use local chromium
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function createBrowserSession(id: string, initialUrl: string, ws: any) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  activePages.set(id, { context, page, cdpSession });

  // Pipe basic CDP events to WS
  cdpSession.on('Console.messageAdded', (msg) => ws.send(JSON.stringify({ type: 'console', data: msg })));
  cdpSession.on('Network.requestWillBeSent', (req) => ws.send(JSON.stringify({ type: 'network', data: req })));
  
  await cdpSession.send('Console.enable');
  await cdpSession.send('Network.enable');
  await cdpSession.send('DOM.enable');

  if (initialUrl) await page.goto(initialUrl).catch(() => {});
}

export async function closeBrowserSession(id: string) {
  const session = activePages.get(id);
  if (session) {
    await session.context.close();
    activePages.delete(id);
  }
}
```

- [ ] **Step 3: Add WS route to index.ts**

```bash
sed -i "/registerExtensions/i \\
fastify.get('/ws/browser', { websocket: true }, (connection: any, req: any) => {\\
  const id = req.id;\\
  connection.socket.on('message', async (message: any) => {\\
    // Handle URL navigation and DevTools commands\\
  });\\
  connection.socket.on('close', () => {\\
    import('./browserService.js').then(m => m.closeBrowserSession(id));\\
  });\\
});\\
" apps/server/src/index.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/package.json apps/server/package-lock.json apps/server/src/browserService.ts apps/server/src/index.ts
git commit -m "feat: add on-demand playwright-core browser service and websocket binding"
```

### Task 2: Frontend DevTools Panel UI in BrowserApp

**Files:**
- Modify: `apps/web/src/apps/browser/BrowserApp.tsx`

**Interfaces:**
- Consumes: User actions to toggle DevTools.

- [ ] **Step 1: Add DevTools UI State**

Modify BrowserApp to include `const [devMode, setDevMode] = useState(false);` and add a layout split pane.
If `devMode` is false, it uses the iframe. If `true`, it opens a WebSocket to `/ws/browser`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/apps/browser/BrowserApp.tsx
git commit -m "feat: add devtools toggle and UI panel to NebuBrowser"
```
