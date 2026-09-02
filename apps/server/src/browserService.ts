import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';

let browserInstance: Browser | null = null;
const activePages = new Map<string, { context: BrowserContext; page: Page; cdpSession: any; ws: any }>();

export async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  }
  return browserInstance;
}

function safeSend(ws: any, data: any) {
  try {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  } catch (e) { /* connection closed */ }
}

export async function createBrowserSession(id: string, initialUrl: string, ws: any) {
  // Clean up any existing session for this id
  await closeBrowserSession(id);

  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  activePages.set(id, { context, page, cdpSession, ws });

  // --- CDP Event Piping ---

  // Console
  cdpSession.on('Console.messageAdded', (msg: any) => {
    safeSend(ws, { type: 'console', data: msg });
  });

  // Network requests
  cdpSession.on('Network.requestWillBeSent', (req: any) => {
    safeSend(ws, { type: 'network-request', data: { 
      requestId: req.requestId,
      method: req.request?.method,
      url: req.request?.url,
      timestamp: req.timestamp,
    }});
  });

  // Network responses
  cdpSession.on('Network.responseReceived', (res: any) => {
    safeSend(ws, { type: 'network-response', data: {
      requestId: res.requestId,
      status: res.response?.status,
      mimeType: res.response?.mimeType,
      url: res.response?.url,
    }});
  });

  await cdpSession.send('Console.enable');
  await cdpSession.send('Network.enable');
  await cdpSession.send('DOM.enable');

  // Start screencast — streams JPEG frames of the page
  await cdpSession.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 60,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 2,
  });

  cdpSession.on('Page.screencastFrame', async (frame: any) => {
    safeSend(ws, { type: 'screencast', data: frame.data, sessionId: frame.sessionId });
    // Acknowledge frame so Chromium sends the next one
    try { await cdpSession.send('Page.screencastFrameAck', { sessionId: frame.sessionId }); } catch(e) {}
  });

  // On navigation complete, send DOM tree + new URL
  page.on('load', async () => {
    try {
      const root = await cdpSession.send('DOM.getDocument', { depth: 4 }); // depth 4 is enough for overview
      safeSend(ws, { type: 'dom', data: root });
      safeSend(ws, { type: 'navigated', url: page.url() });
    } catch(e) {}
  });

  // Navigate to initial URL
  if (initialUrl) {
    try {
      await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch(e) {
      safeSend(ws, { type: 'error', message: `Navigation failed: ${(e as Error).message}` });
    }
  }

  // Send initial DOM
  try {
    const root = await cdpSession.send('DOM.getDocument', { depth: 4 });
    safeSend(ws, { type: 'dom', data: root });
  } catch(e) {}
}

export async function closeBrowserSession(id: string) {
  const session = activePages.get(id);
  if (session) {
    try { await session.cdpSession.send('Page.stopScreencast'); } catch(e) {}
    try { await session.context.close(); } catch(e) {}
    activePages.delete(id);
  }
  // If no more sessions, close browser to save RAM
  if (activePages.size === 0 && browserInstance) {
    try { await browserInstance.close(); } catch(e) {}
    browserInstance = null;
  }
}

export async function navigateBrowser(id: string, url: string) {
  const session = activePages.get(id);
  if (!session || !url) return;
  try {
    await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch(e) {
    safeSend(session.ws, { type: 'error', message: `Navigation failed: ${(e as Error).message}` });
  }
}

export async function getDOM(id: string) {
  const session = activePages.get(id);
  if (!session) return null;
  try {
    return await session.cdpSession.send('DOM.getDocument', { depth: -1 });
  } catch(e) {
    return null;
  }
}

// Mouse/keyboard input forwarding from frontend
export async function dispatchInput(id: string, event: any) {
  const session = activePages.get(id);
  if (!session) return;
  try {
    if (event.type === 'mousedown' || event.type === 'mouseup' || event.type === 'mousemove') {
      await session.cdpSession.send('Input.dispatchMouseEvent', {
        type: event.type === 'mousedown' ? 'mousePressed' : event.type === 'mouseup' ? 'mouseReleased' : 'mouseMoved',
        x: event.x,
        y: event.y,
        button: 'left',
        clickCount: event.type === 'mousedown' ? 1 : 0,
      });
    } else if (event.type === 'keydown' || event.type === 'keyup') {
      await session.cdpSession.send('Input.dispatchKeyEvent', {
        type: event.type === 'keydown' ? 'keyDown' : 'keyUp',
        key: event.key,
        text: event.text || '',
        code: event.code || '',
      });
    } else if (event.type === 'scroll') {
      await session.cdpSession.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: event.x,
        y: event.y,
        deltaX: event.deltaX || 0,
        deltaY: event.deltaY || 0,
      });
    }
  } catch(e) {}
}
