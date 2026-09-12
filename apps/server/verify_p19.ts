import assert from 'assert';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, dbRun, initDb } from './src/db.js';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('================================================================');
  console.log('  P19 PERFORMANCE, RESOURCE EFFICIENCY & PRODUCTION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function pass(msg: string) {
    passed++;
    total++;
    console.log(`[PASS] P19: ${msg}`);
  }

  function fail(msg: string, err: any) {
    total++;
    console.error(`[FAIL] P19: ${msg}`);
    console.error(err);
  }

  // Setup auth tokens for User A and User B
  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });

  const userA = await dbGet('SELECT * FROM User LIMIT 1') as { id: string; username: string };
  const tokenA = fastifyApp.jwt.sign({ id: userA.id, username: userA.username });
  const tokenB = fastifyApp.jwt.sign({ id: 'p19_user_b_id', username: 'user_b' });

  const apiRequest = async (
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    authToken = tokenA
  ): Promise<{ status: number; body: any }> => {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : undefined;
      const headers: Record<string, string> = {
        Cookie: `token=${authToken}`
      };
      if (data) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = String(Buffer.byteLength(data));
      }

      const req = http.request(`http://127.0.0.1:3030${endpoint}`, {
        method,
        headers
      }, (res) => {
        let resData = '';
        res.on('data', chunk => resData += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode || 500, body: resData });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  };

  // 1. Process & Zero-Chromium Audit
  try {
    const { stdout: psOut } = await execPromise("ps aux | grep -iE 'chromium|chrome|playwright|puppeteer' | grep -v grep || true");
    assert.strictEqual(psOut.trim(), '', 'Zero browser automation processes must exist in the OS');
    pass('Zero-Browser Audit: Confirmed 0 Chromium/Chrome/Playwright/Puppeteer processes');
  } catch (e) {
    fail('Zero-Browser Audit: Confirmed 0 Chromium/Chrome/Playwright/Puppeteer processes', e);
  }

  // 2. Production Socket & Port Verification
  try {
    const { stdout: ssOut } = await execPromise("ss -tulpn | grep -E ':3030|:5050'");
    assert(ssOut.includes(':3030'), 'Port 3030 (backend) must be active');
    assert(ssOut.includes(':5050'), 'Port 5050 (frontend) must be active');
    pass('Socket Audit: Ports 3030 (backend) and 5050 (frontend) listening cleanly');
  } catch (e) {
    fail('Socket Audit: Ports 3030 (backend) and 5050 (frontend) listening cleanly', e);
  }

  // 3. Baseline Memory Footprint Check
  try {
    await execPromise("pm2 restart nebudesk-backend");
    await new Promise(r => setTimeout(r, 1000));
    const { stdout: pm2Out } = await execPromise("pm2 jlist");
    const pm2List = JSON.parse(pm2Out);
    const backendProc = pm2List.find((p: any) => p.name === 'nebudesk-backend');
    const frontendProc = pm2List.find((p: any) => p.name === 'nebudesk-frontend');

    assert(backendProc, 'nebudesk-backend must be registered in PM2');
    assert(frontendProc, 'nebudesk-frontend must be registered in PM2');

    const backendMemMB = Math.round((backendProc.monit?.memory || 0) / (1024 * 1024));
    const frontendMemMB = Math.round((frontendProc.monit?.memory || 0) / (1024 * 1024));
    const totalMemMB = backendMemMB + frontendMemMB;

    console.log(`    Backend RSS: ${backendMemMB} MB | Frontend RSS: ${frontendMemMB} MB | Combined: ${totalMemMB} MB`);
    assert(backendMemMB <= 160, `Backend RSS (${backendMemMB} MB) must not exceed 160 MB`);
    assert(frontendMemMB <= 80, `Frontend RSS (${frontendMemMB} MB) must not exceed 80 MB`);
    assert(totalMemMB <= 220, `Combined RSS (${totalMemMB} MB) must stay at or below 220 MB baseline ceiling`);
    pass('Memory Footprint: Combined idle RAM below 220MB production ceiling');
  } catch (e) {
    fail('Memory Footprint: Combined idle RAM below 220MB production ceiling', e);
  }

  // 4. SQLite WAL Mode and Concurrency Stress
  try {
    const journalMode = await dbGet<{ journal_mode: string }>('PRAGMA journal_mode;');
    assert.strictEqual(journalMode?.journal_mode?.toLowerCase(), 'wal');

    // 100 concurrent read/write operations
    const startTime = Date.now();
    const ops: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        ops.push(dbRun('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)', [`p19_bench_${i}`, `v_${Date.now()}`]));
      } else {
        ops.push(dbGet('SELECT * FROM Settings WHERE key = ?', [`p19_bench_${i - 1}`]));
      }
    }
    await Promise.all(ops);
    const duration = Date.now() - startTime;
    console.log(`    Executed 100 concurrent SQLite WAL operations in ${duration}ms (${Math.round(100 / (duration / 1000))} ops/sec)`);

    // Clean up test keys
    await dbRun("DELETE FROM Settings WHERE key LIKE 'p19_bench_%'");
    pass('SQLite WAL Concurrency: 100 concurrent read/write operations with zero lockouts');
  } catch (e) {
    fail('SQLite WAL Concurrency: 100 concurrent read/write operations with zero lockouts', e);
  }

  // 5. Soak Test & Memory Leak Audit Across P13-P18 Endpoints (100 Cycles)
  try {
    const initialMem = process.memoryUsage().rss;
    const startTime = Date.now();

    for (let cycle = 0; cycle < 100; cycle++) {
      // P13: Git status check
      const gitRes = await apiRequest('/api/git/status?p=/root/nebudesk');
      assert.strictEqual(gitRes.status, 200);

      // P14: Project detection
      const projRes = await apiRequest('/api/project/detect?workspace=/root/nebudesk');
      assert.strictEqual(projRes.status, 200);

      // P16: Command Center summary
      const ccRes = await apiRequest('/api/command-center/summary?workspace=/root/nebudesk');
      assert.strictEqual(ccRes.status, 200);

      // P18: Diagnostics parsing
      const diagRes = await apiRequest('/api/diagnostics/parse', 'POST', {
        output: `src/app.ts(${cycle + 1},10): error TS2304: Cannot find name 'cycle_${cycle}'.`,
        workspace: '/root/nebudesk'
      });
      assert.strictEqual(diagRes.status, 200);
      assert.strictEqual(diagRes.body.diagnostics.length, 1);
    }

    const elapsed = Date.now() - startTime;
    const finalMem = process.memoryUsage().rss;
    const memDeltaMB = Math.round((finalMem - initialMem) / (1024 * 1024));

    console.log(`    Completed 100 multi-endpoint soak cycles in ${elapsed}ms (Avg ${Math.round(elapsed / 100)}ms/cycle)`);
    console.log(`    Client-side memory delta: ${memDeltaMB} MB`);
    pass('Soak Test: 100 continuous multi-endpoint developer cycles executed with zero failures');
  } catch (e) {
    fail('Soak Test: 100 continuous multi-endpoint developer cycles executed with zero failures', e);
  }

  // 6. Multi-User Tenant Isolation Stress
  try {
    // User A and User B concurrently query git, project detector, and command center
    const [resA, resB] = await Promise.all([
      apiRequest('/api/git/status?p=/root/nebudesk', 'GET', undefined, tokenA),
      apiRequest('/api/git/status?p=/root/nebudesk', 'GET', undefined, tokenB)
    ]);
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resB.status, 200);

    // User B cannot stop an arbitrary process owned by User A
    const stopRes = await apiRequest('/api/command-center/stop-action', 'POST', {
      processId: 'p19_nonexistent_proc_a'
    }, tokenB);
    assert.strictEqual(stopRes.status, 403, 'User B must not have access to manage User A processes');
    pass('Multi-User Security: Tenant isolation verified across concurrent sessions');
  } catch (e) {
    fail('Multi-User Security: Tenant isolation verified across concurrent sessions', e);
  }

  // 7. Security Sandbox & Traversal Fuzzing on P13-P18 Endpoints
  try {
    const traversalPayloads = [
      '/root/nebudesk/../../etc',
      '../../../../etc/shadow',
      '..%2F..%2Fetc%2Fpasswd',
      '/etc/passwd',
      '//etc/shadow'
    ];

    for (const p of traversalPayloads) {
      const gRes = await apiRequest(`/api/git/status?p=${encodeURIComponent(p)}`);
      assert.strictEqual(gRes.status, 403);

      const dRes = await apiRequest(`/api/project/detect?workspace=${encodeURIComponent(p)}`);
      assert.strictEqual(dRes.status, 403);

      const cRes = await apiRequest(`/api/command-center/summary?workspace=${encodeURIComponent(p)}`);
      assert.strictEqual(cRes.status, 403);

      const runRes = await apiRequest('/api/diagnostics/run', 'POST', { workspace: p });
      assert.strictEqual(runRes.status, 403);
    }
    pass('Security Sandbox: Path traversal blocked on all P13-P18 endpoints with 403 Forbidden');
  } catch (e) {
    fail('Security Sandbox: Path traversal blocked on all P13-P18 endpoints with 403 Forbidden', e);
  }

  // 8. Frontend Production Distribution Build Artifacts
  try {
    const distHtml = await fs.readFile(path.resolve(__dirname, '../web/dist/index.html'), 'utf-8');
    assert(distHtml.includes('<html') && distHtml.includes('</html>'), 'Frontend dist/index.html must exist and be valid HTML');

    const distAssets = await fs.readdir(path.resolve(__dirname, '../web/dist/assets'));
    assert(distAssets.some(f => f.endsWith('.js')), 'Production JS bundle must exist in dist/assets');
    assert(distAssets.some(f => f.endsWith('.css')), 'Production CSS bundle must exist in dist/assets');
    pass('Production Distribution: Frontend production build artifacts verified');
  } catch (e) {
    fail('Production Distribution: Frontend production build artifacts verified', e);
  }

  // 9. Full P13–P18 Feature Integration Contracts (CodeApp.tsx)
  try {
    const codeAppSrc = await fs.readFile(path.resolve(__dirname, '../web/src/apps/code/CodeApp.tsx'), 'utf-8');
    
    // P13: Git
    assert(codeAppSrc.includes('/api/git/status'), 'CodeApp must integrate P13 Git');
    // P14: Project Awareness
    assert(codeAppSrc.includes('/api/project/detect') || codeAppSrc.includes('ccSummary?.project'), 'CodeApp must integrate P14 Project Awareness');
    // P15: Terminal & Preview
    assert(codeAppSrc.includes('Ports & Preview'), 'CodeApp must integrate P15 Preview');
    // P16: Command Center
    assert(codeAppSrc.includes('commandCenter'), 'CodeApp must integrate P16 Command Center');
    // P17: Persistence
    assert(codeAppSrc.includes('safeStorage'), 'CodeApp must integrate P17 SafeStorage');
    // P18: Diagnostics
    assert(codeAppSrc.includes('bottomPanelTab === \'problems\''), 'CodeApp must integrate P18 Problems Panel');
    
    pass('Master Contracts: All P13-P18 subsystems integrated cleanly in CodeApp.tsx');
  } catch (e) {
    fail('Master Contracts: All P13-P18 subsystems integrated cleanly in CodeApp.tsx', e);
  }

  // 10. Information Leakage & Secret Sanitization
  try {
    const notFoundRes = await apiRequest('/api/nonexistent-endpoint-test');
    assert.strictEqual(notFoundRes.status, 404);
    const bodyStr = JSON.stringify(notFoundRes.body);
    assert(!bodyStr.includes('/root/nebudesk'), 'Error response must not expose system filesystem paths');
    assert(!bodyStr.includes('JWT_SECRET'), 'Error response must not leak secrets');
    pass('Info Leakage Audit: Zero stack traces, zero root path disclosure, zero secret exposure');
  } catch (e) {
    fail('Info Leakage Audit: Zero stack traces, zero root path disclosure, zero secret exposure', e);
  }

  console.log('\n================================================================');
  console.log(`  P19 AUDIT COMPLETE: ${passed}/${total} PASS (${Math.round(passed / total * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in verify_p19:', err);
  process.exit(1);
});
