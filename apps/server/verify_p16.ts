import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import net from 'net';

interface P16Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P16Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P16: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P16: ${testName}`, err);
  throw new Error(`P16 Test Failed: ${testName} -> ${err}`);
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
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('  P16 DEVELOPER COMMAND CENTER VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const userA = await dbGet('SELECT * FROM User LIMIT 1') as { id: string; username: string };
  const userBId = 'user_b_test_p16';

  const jwtSigner = Fastify();
  await jwtSigner.register(jwt, { secret: jwtSecret });
  const tokenA = jwtSigner.jwt.sign({ id: userA.id, username: userA.username });
  const tokenB = jwtSigner.jwt.sign({ id: userBId, username: 'testuser_b' });

  const testDir = path.join(ALLOWED_ROOT, 'test_p16_command_center');
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(testDir, { recursive: true });

  const getFreePort = async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, '127.0.0.1', () => {
        const port = (srv.address() as net.AddressInfo).port;
        srv.close(() => resolve(port));
      });
      srv.on('error', reject);
    });
  };

  let serverPort = await getFreePort();
  let serverInstance: http.Server | null = null;
  let startedProcessId = '';

  try {
    // 1. GET /api/command-center/summary on a valid project
    try {
      const res = await requestJson(`/api/command-center/summary?p=${encodeURIComponent('/root/nebudesk/apps/web')}`, 'GET', tokenA);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert(res.body.project, 'Project awareness should be present');
      assert.strictEqual(res.body.project.isProject, true, 'isProject should be true');
      assert.strictEqual(res.body.project.packageManager, 'npm', 'packageManager should be npm');
      assert(Array.isArray(res.body.actions), 'Actions should be an array');
      const actionIds = res.body.actions.map((a: any) => a.id);
      assert(actionIds.includes('dev'), 'Should include dev action');
      assert(actionIds.includes('build'), 'Should include build action');
      assert(res.body.git, 'Git info should be present');
      assert.strictEqual(res.body.git.isRepo, true, 'Should be detected as a Git repo');
      pass('Command Center summary provides unified project awareness, git status & actions');
    } catch (e) {
      fail('Command Center summary provides unified project awareness, git status & actions', e);
    }

    // 2. Path outside workspace sandbox rejected with 403
    try {
      const res = await requestJson('/api/command-center/summary?p=/etc', 'GET', tokenA);
      assert.strictEqual(res.status, 403, `Expected 403 for /etc, got ${res.status}`);
      pass('Filesystem sandbox: Path outside workspace rejected with 403');
    } catch (e) {
      fail('Filesystem sandbox: Path outside workspace rejected with 403', e);
    }

    // 3. POST /api/command-center/run-action path traversal rejected with 403
    try {
      const res = await requestJson('/api/command-center/run-action', 'POST', tokenA, {
        p: '../../etc',
        actionId: 'dev'
      });
      assert.strictEqual(res.status, 403, `Expected 403 for path traversal, got ${res.status}`);
      pass('Path traversal in run-action rejected with 403');
    } catch (e) {
      fail('Path traversal in run-action rejected with 403', e);
    }

    // 4. POST /api/command-center/run-action with unconfigured action returns 400
    try {
      const res = await requestJson('/api/command-center/run-action', 'POST', tokenA, {
        p: testDir,
        actionId: 'nonexistent_action_xyz'
      });
      assert.strictEqual(res.status, 400, `Expected 400 for unconfigured action, got ${res.status}`);
      pass('Unconfigured action rejected gracefully with 400 Bad Request');
    } catch (e) {
      fail('Unconfigured action rejected gracefully with 400 Bad Request', e);
    }

    // 5. Setup test project with custom scripts and run action via processManager
    await fs.writeFile(
      path.join(testDir, 'server.js'),
      `const http = require('http');
const server = http.createServer((req, res) => res.end('P16_OK'));
server.listen(${serverPort}, () => console.log('Listening on ${serverPort}'));
setInterval(() => {}, 1000);
`
    );

    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-p16-app',
        scripts: {
          test: 'node -e "console.log(\'testing\')"',
          custom_server: 'node server.js'
        }
      }, null, 2)
    );

    startedProcessId = '';
    try {
      const res = await requestJson('/api/command-center/run-action', 'POST', tokenA, {
        p: testDir,
        actionId: 'custom_server'
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert(res.body.success, 'Expected success: true');
      assert(res.body.process?.id, 'Expected process object with id');
      assert.strictEqual(res.body.process.status, 'running', 'Process status should be running');
      startedProcessId = res.body.process.id;
      pass('POST /api/command-center/run-action launches managed process cleanly');
    } catch (e) {
      fail('POST /api/command-center/run-action launches managed process cleanly', e);
    }

    // Allow process to bind port
    await new Promise(r => setTimeout(r, 1200));

    // 6. GET /api/command-center/summary dynamically reflects running action & process
    try {
      const res = await requestJson(`/api/command-center/summary?p=${encodeURIComponent(testDir)}`, 'GET', tokenA);
      assert.strictEqual(res.status, 200);
      const action = res.body.actions.find((a: any) => a.id === 'custom_server');
      assert(action, 'custom_server action should be present');
      assert.strictEqual(action.isRunning, true, 'Running action should be marked isRunning: true');
      assert.strictEqual(action.processId, startedProcessId, 'Running action should reference processId');

      const runningProc = res.body.processes.find((p: any) => p.id === startedProcessId);
      assert(runningProc, 'Running process should be in processes list');
      assert(runningProc.ports.includes(serverPort), `Process should be bound to port ${serverPort}`);
      pass('Command Center summary reflects live process state, bound ports & running actions');
    } catch (e) {
      fail('Command Center summary reflects live process state, bound ports & running actions', e);
    }

    // 7. Preview target discovery
    try {
      const res = await requestJson(`/api/command-center/summary?p=${encodeURIComponent(testDir)}`, 'GET', tokenA);
      assert.strictEqual(res.status, 200);
      const preview = res.body.previews.find((pr: any) => pr.port === serverPort);
      assert(preview, `Preview target should exist for port ${serverPort}`);
      assert.strictEqual(preview.previewUrl, `http://127.0.0.1:${serverPort}`);
      pass('Preview targets automatically discovered and mapped in Command Center summary');
    } catch (e) {
      fail('Preview targets automatically discovered and mapped in Command Center summary', e);
    }

    // 8. Multi-user isolation: User B cannot stop User A's process
    try {
      const res = await requestJson('/api/command-center/stop-action', 'POST', tokenB, {
        processId: startedProcessId
      });
      assert.strictEqual(res.status, 403, `Expected 403 for unauthorized process stop, got ${res.status}`);
      pass('Multi-user isolation: User B cannot stop User A process');
    } catch (e) {
      fail('Multi-user isolation: User B cannot stop User A process', e);
    }

    // 9. User A stops process cleanly
    try {
      const res = await requestJson('/api/command-center/stop-action', 'POST', tokenA, {
        processId: startedProcessId
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      pass('POST /api/command-center/stop-action terminates process cleanly');
    } catch (e) {
      fail('POST /api/command-center/stop-action terminates process cleanly', e);
    }

    // 10. Verify CodeApp frontend contracts
    try {
      const codeAppContent = await fs.readFile(path.join('/root/nebudesk/apps/web/src/apps/code/CodeApp.tsx'), 'utf-8');
      assert(codeAppContent.includes("'commandCenter'"), 'CodeApp should include commandCenter activity');
      assert(codeAppContent.includes('Ctrl+Shift+C'), 'CodeApp should document and support Ctrl+Shift+C');
      assert(codeAppContent.includes('loadCommandCenter'), 'CodeApp should implement loadCommandCenter');
      assert(codeAppContent.includes('handleRunCommandCenterAction'), 'CodeApp should implement handleRunCommandCenterAction');
      assert(codeAppContent.includes('handleStopCommandCenterAction'), 'CodeApp should implement handleStopCommandCenterAction');
      assert(codeAppContent.includes('/api/command-center/summary'), 'CodeApp should call /api/command-center/summary');
      assert(codeAppContent.includes('/api/command-center/run-action'), 'CodeApp should call /api/command-center/run-action');
      assert(codeAppContent.includes('Quick Jump'), 'CodeApp should feature Quick Jump Hub');
      assert(codeAppContent.includes('Project Actions'), 'CodeApp should feature Project Actions');
      pass('CodeApp frontend contracts for Command Center verified');
    } catch (e) {
      fail('CodeApp frontend contracts for Command Center verified', e);
    }

  } finally {
    if (startedProcessId) {
      await requestJson('/api/command-center/stop-action', 'POST', tokenA, { processId: startedProcessId }).catch(() => {});
    }
    if (serverInstance) {
      (serverInstance as http.Server).close();
    }
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log('\n================================================================');
  console.log(`  P16 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (${Math.round(stats.passed / stats.total * 100)}%)`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
