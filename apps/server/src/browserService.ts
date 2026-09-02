import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';

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
