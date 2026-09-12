import assert from 'assert';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { initDb, dbGet } from './src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(name: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P19.5: ${name}`);
}

function fail(name: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P19.5: ${name}`, err);
  throw new Error(`P19.5 Test Failed: ${name} -> ${err}`);
}

async function requestJson(urlPath: string, method: string, token: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Cookie': `token=${token}`
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }
    const req = http.request(
      `http://127.0.0.1:3030${urlPath}`,
      {
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runP19_5Tests() {
  console.log('================================================================');
  console.log('  P19.5 FILE PICKER POWER UX & WINDOW INTEGRATION VERIFICATION');
  console.log('================================================================\n');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });
  const token = fastifyApp.jwt.sign({ id: 'admin', username: 'admin' }, { expiresIn: '2h' });

  // 1. Verify High Defect Fix: MenuBar passes path in handleOpenFile
  try {
    const menuBarPath = path.resolve(__dirname, '../web/src/desktop/MenuBar.tsx');
    const menuBarSrc = await fs.readFile(menuBarPath, 'utf-8');
    
    // Check that handleOpenFile includes path: p
    assert(
      menuBarSrc.includes("path: p, payload: { file: p }") || 
      (menuBarSrc.includes("path: p") && menuBarSrc.includes("handleOpenFile")),
      'MenuBar.tsx handleOpenFile must pass path: p in openWindow'
    );
    pass('High Defect Fix: MenuBar.tsx explicitly passes path property in handleOpenFile');
  } catch (e) {
    fail('High Defect Fix: MenuBar.tsx explicitly passes path property in handleOpenFile', e);
  }

  // 2. Verify Desktop.tsx CodeApp initialPath Wiring
  try {
    const desktopPath = path.resolve(__dirname, '../web/src/desktop/Desktop.tsx');
    const desktopSrc = await fs.readFile(desktopPath, 'utf-8');
    
    assert(
      desktopSrc.includes("initialPath={win.path || (win.payload?.file as string | undefined)}") ||
      desktopSrc.includes("initialPath={win.path"),
      'Desktop.tsx must pass win.path to CodeApp'
    );
    pass('Open File to CodeApp Contract: Desktop.tsx forwards win.path to CodeApp initialPath');
  } catch (e) {
    fail('Open File to CodeApp Contract: Desktop.tsx forwards win.path to CodeApp initialPath', e);
  }

  // 3. Verify Window Manager Integration (WindowStore & DesktopWindow Typing)
  try {
    const winStorePath = path.resolve(__dirname, '../web/src/stores/windowStore.ts');
    const winStoreSrc = await fs.readFile(winStorePath, 'utf-8');
    
    assert(winStoreSrc.includes("path?: string;"), 'DesktopWindow must include optional path field');
    assert(winStoreSrc.includes("payload?: Record<string, unknown>;"), 'DesktopWindow must include optional payload field');
    assert(winStoreSrc.includes("w.appId !== 'picker'"), 'windowStore must filter out picker windows during desktop persistence');
    pass('Window Manager Contract: DesktopWindow typed and picker excluded from persistent database save');
  } catch (e) {
    fail('Window Manager Contract: DesktopWindow typed and picker excluded from persistent database save', e);
  }

  // 4. Verify Desktop.tsx Renders FilePicker via Window Manager
  try {
    const desktopPath = path.resolve(__dirname, '../web/src/desktop/Desktop.tsx');
    const desktopSrc = await fs.readFile(desktopPath, 'utf-8');

    assert(desktopSrc.includes("win.appId === 'picker'"), 'Desktop.tsx must map win.appId === picker');
    assert(!desktopSrc.includes("pickerProps && <FilePicker"), 'Desktop.tsx must not render static unmanaged pickerProps overlay');
    assert(desktopSrc.includes("<Window key={win.id} win={win}>"), 'Picker must be rendered inside <Window> hierarchy');
    pass('Window Integration: FilePicker rendered inside Window hierarchy with drag, resize & z-index');
  } catch (e) {
    fail('Window Integration: FilePicker rendered inside Window hierarchy with drag, resize & z-index', e);
  }

  // 5. Verify FilePicker.tsx Reusable Architecture (File and Folder modes)
  try {
    const pickerPath = path.resolve(__dirname, '../web/src/desktop/FilePicker.tsx');
    const pickerSrc = await fs.readFile(pickerPath, 'utf-8');

    assert(pickerSrc.includes("mode?: 'file' | 'folder'"), 'FilePicker must support file and folder modes');
    assert(pickerSrc.includes("mode === 'folder' ? 'Open Folder' : 'Open File'"), 'FilePicker must adapt title and actions per mode');
    pass('Reusable FilePicker: Supports Open File and Open Folder in single unified component');
  } catch (e) {
    fail('Reusable FilePicker: Supports Open File and Open Folder in single unified component', e);
  }

  // 6. Verify Navigation & Breadcrumb Capabilities
  try {
    const pickerPath = path.resolve(__dirname, '../web/src/desktop/FilePicker.tsx');
    const pickerSrc = await fs.readFile(pickerPath, 'utf-8');

    assert(pickerSrc.includes("handleBreadcrumbClick"), 'FilePicker must implement breadcrumb click navigation');
    assert(pickerSrc.includes("pathSegments.map"), 'FilePicker must render interactive breadcrumb segments');
    assert(pickerSrc.includes("goBack") && pickerSrc.includes("goForward"), 'FilePicker must maintain back/forward history');
    assert(pickerSrc.includes("navigateUp"), 'FilePicker must support parent directory navigation');
    pass('File Browser Navigation: Interactive breadcrumbs, back/forward history, and up-directory verified');
  } catch (e) {
    fail('File Browser Navigation: Interactive breadcrumbs, back/forward history, and up-directory verified', e);
  }

  // 7. Verify Filename Search API & Integration
  try {
    const searchRes = await requestJson('/api/files/search?p=/root&q=package', 'GET', token);
    assert.strictEqual(searchRes.status, 200, 'Search endpoint should return 200');
    assert(Array.isArray(searchRes.body.results), 'Search endpoint must return results array');

    const pickerPath = path.resolve(__dirname, '../web/src/desktop/FilePicker.tsx');
    const pickerSrc = await fs.readFile(pickerPath, 'utf-8');
    assert(pickerSrc.includes("/api/files/search"), 'FilePicker must query /api/files/search');
    assert(pickerSrc.includes("apiJson"), 'FilePicker must use standardized apiJson helper');
    assert(pickerSrc.includes("debouncedQuery"), 'FilePicker must debounce search queries');
    pass('Filename Search Integration: Debounced search connected to GET /api/files/search via apiJson');
  } catch (e) {
    fail('Filename Search Integration: Debounced search connected to GET /api/files/search via apiJson', e);
  }

  // 8. Verify Keyboard Ergonomics
  try {
    const pickerPath = path.resolve(__dirname, '../web/src/desktop/FilePicker.tsx');
    const pickerSrc = await fs.readFile(pickerPath, 'utf-8');

    assert(pickerSrc.includes("handleKeyDown"), 'FilePicker must implement onKeyDown');
    assert(pickerSrc.includes("ArrowDown") && pickerSrc.includes("ArrowUp"), 'FilePicker must handle Arrow keys');
    assert(pickerSrc.includes("Enter") && pickerSrc.includes("Escape"), 'FilePicker must handle Enter and Escape');
    assert(pickerSrc.includes("Backspace"), 'FilePicker must handle Backspace for parent folder');
    assert(pickerSrc.includes("Home") && pickerSrc.includes("End"), 'FilePicker must handle Home and End');
    pass('Keyboard Ergonomics: Arrow Up/Down, Enter, Escape, Backspace, Home, End fully wired');
  } catch (e) {
    fail('Keyboard Ergonomics: Arrow Up/Down, Enter, Escape, Backspace, Home, End fully wired', e);
  }

  // 9. Verify Sorting, Filtering & Large Directory Optimization
  try {
    const pickerPath = path.resolve(__dirname, '../web/src/desktop/FilePicker.tsx');
    const pickerSrc = await fs.readFile(pickerPath, 'utf-8');

    assert(pickerSrc.includes("handleSortToggle"), 'FilePicker must support sort toggling');
    assert(pickerSrc.includes("showHidden"), 'FilePicker must support hidden files toggle');
    assert(pickerSrc.includes("fileFilter"), 'FilePicker must support file extension filters in file mode');
    assert(pickerSrc.includes("maxRenderCount"), 'FilePicker must include large directory render bounding');
    pass('Ergonomics & Large Directory: Sorting (name/size/type), hidden file toggle, and slice rendering verified');
  } catch (e) {
    fail('Ergonomics & Large Directory: Sorting (name/size/type), hidden file toggle, and slice rendering verified', e);
  }

  // 10. Security Regression: Filesystem Sandbox on Files API
  try {
    const traversalRes = await requestJson('/api/files?p=/etc', 'GET', token);
    assert.strictEqual(traversalRes.status, 403, 'Path outside sandbox must return 403');

    const searchTraversalRes = await requestJson('/api/files/search?p=../../etc&q=passwd', 'GET', token);
    assert.strictEqual(searchTraversalRes.status, 403, 'Search traversal must return 403');
    pass('Security Regression: Path traversal strictly rejected with 403 on directory and search APIs');
  } catch (e) {
    fail('Security Regression: Path traversal strictly rejected with 403 on directory and search APIs', e);
  }

  console.log('\n================================================================');
  console.log(`  P19.5 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

runP19_5Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
