import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import net from 'net';

interface P15Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P15Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P15: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P15: ${testName}`, err);
  throw new Error(`P15 Test Failed: ${testName} -> ${err}`);
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

async function runP15Tests() {
  console.log('================================================================');
  console.log('  P15 TERMINAL & PREVIEW INTEGRATION 2.0 VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });
  const tokenUserA = fastifyApp.jwt.sign({ id: 'p15_user_a', username: 'user_a' }, { expiresIn: '2h' });
  const tokenUserB = fastifyApp.jwt.sign({ id: 'p15_user_b', username: 'user_b' }, { expiresIn: '2h' });

  const testWorkspace = path.join(ALLOWED_ROOT, 'test_p15_workspace');

  try {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });

    // Create a mock lightweight HTTP server script in the test workspace
    const serverScript = `
const http = require('http');
const port = parseInt(process.env.TEST_PORT || '8991', 10);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from P15 Dev Server on ' + port);
});
server.listen(port, '127.0.0.1', () => {
  console.log('Mock server listening on ' + port);
});
`;
    await fs.writeFile(path.join(testWorkspace, 'mock_server.js'), serverScript);

    // 1. Invalid command rejection
    const invalidCmdRes = await requestJson('/api/workspace/processes/start', 'POST', tokenUserA, {
      command: 'curl_exploit',
      args: ['http://malicious.site'],
      cwd: testWorkspace
    });
    assert.strictEqual(invalidCmdRes.status, 400, 'Unallowed command must return 400');
    pass('Disallowed command rejected with 400');

    // 2. Path outside workspace rejection
    const sandboxRes = await requestJson('/api/workspace/processes/start', 'POST', tokenUserA, {
      command: 'node',
      args: ['-e', 'console.log(1)'],
      cwd: '/etc'
    });
    assert.strictEqual(sandboxRes.status, 403, 'Cwd outside ALLOWED_ROOT must return 403');
    pass('Cwd outside workspace sandbox rejected with 403');

    // 3. Start managed dev server process
    const startRes = await requestJson('/api/workspace/processes/start', 'POST', tokenUserA, {
      command: 'node',
      args: [path.join(testWorkspace, 'mock_server.js')],
      cwd: testWorkspace
    });
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.body.success, true);
    assert.ok(startRes.body.process.id, 'Process id must be assigned');
    assert.strictEqual(startRes.body.process.status, 'running');
    const procId = startRes.body.process.id;
    pass('Managed process started successfully with status running');

    // Wait for the mock server to bind port 8991
    await new Promise(r => setTimeout(r, 1200));

    // 4. Port detection and process association
    const procListRes = await requestJson(`/api/workspace/processes?workspace=${encodeURIComponent(testWorkspace)}`, 'GET', tokenUserA);
    assert.strictEqual(procListRes.status, 200);
    const foundProc = procListRes.body.processes.find((p: any) => p.id === procId);
    assert.ok(foundProc, 'Managed process must be listed');
    assert.ok(foundProc.ports.includes(8991), 'Process must be associated with port 8991');
    assert.strictEqual(foundProc.previewAvailable, true, 'previewAvailable must be true');
    assert.strictEqual(foundProc.previewUrl, 'http://127.0.0.1:8991');
    pass('Process <-> Port association and preview URL detected');

    // 5. Preview target endpoint
    const previewRes = await requestJson(`/api/preview/targets?workspace=${encodeURIComponent(testWorkspace)}`, 'GET', tokenUserA);
    assert.strictEqual(previewRes.status, 200);
    const target = previewRes.body.previews.find((p: any) => p.id === procId);
    assert.ok(target, 'Preview target must be discoverable');
    assert.strictEqual(target.port, 8991);
    assert.strictEqual(target.previewUrl, 'http://127.0.0.1:8991');
    pass('Preview target discoverable via /api/preview/targets');

    // Verify live response from preview socket
    const socketRes = await new Promise<string>((resolve, reject) => {
      http.get('http://127.0.0.1:8991', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    assert.ok(socketRes.includes('Hello from P15 Dev Server'), 'Preview server response verified');
    pass('Active HTTP preview server responding correctly on port 8991');

    // 6. Multi-user isolation: User B cannot stop User A's process
    const crossUserStopRes = await requestJson('/api/workspace/processes/stop', 'POST', tokenUserB, {
      id: procId
    });
    assert.strictEqual(crossUserStopRes.status, 403, 'Cross-user process termination must return 403');
    pass('Multi-user isolation: User B cannot stop User A process');

    // 7. Restart process
    const restartRes = await requestJson('/api/workspace/processes/restart', 'POST', tokenUserA, {
      id: procId
    });
    assert.strictEqual(restartRes.status, 200);
    assert.strictEqual(restartRes.body.success, true);
    assert.strictEqual(restartRes.body.process.status, 'running');
    pass('Process restart via /api/workspace/processes/restart verified');

    await new Promise(r => setTimeout(r, 1000));

    // 8. Stop process
    const stopRes = await requestJson('/api/workspace/processes/stop', 'POST', tokenUserA, {
      id: procId
    });
    assert.strictEqual(stopRes.status, 200);
    assert.strictEqual(stopRes.body.success, true);
    pass('Process stop via /api/workspace/processes/stop verified');

    await new Promise(r => setTimeout(r, 800));

    // 9. Port disappears and preview becomes unavailable
    const afterStopRes = await requestJson(`/api/workspace/processes?workspace=${encodeURIComponent(testWorkspace)}`, 'GET', tokenUserA);
    const stoppedProc = afterStopRes.body.processes.find((p: any) => p.id === procId);
    assert.ok(stoppedProc, 'Stopped process retained in history');
    assert.strictEqual(stoppedProc.status, 'stopped');
    assert.strictEqual(stoppedProc.previewAvailable, false);
    pass('Process stopped state confirmed and preview removed');

  } finally {
    await fs.rm(testWorkspace, { recursive: true, force: true });
  }

  console.log('\n================================================================');
  console.log(`  P15 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

runP15Tests().catch(err => {
  console.error('Fatal P15 test error:', err);
  process.exit(1);
});
