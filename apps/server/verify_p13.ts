import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, dbAll, dbRun, initDb } from './src/db.js';
import { safeResolve, ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface P13Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P13Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P13: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P13: ${testName}`, err);
  throw new Error(`P13 Test Failed: ${testName} -> ${err}`);
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

async function runP13Tests() {
  console.log('================================================================');
  console.log('  P13 GIT & SOURCE CONTROL VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });
  const token = fastifyApp.jwt.sign({ id: 'admin', username: 'admin' }, { expiresIn: '2h' });

  const testDir = path.join(ALLOWED_ROOT, 'test_p13_git_workspace');
  const nonGitDir = path.join(ALLOWED_ROOT, 'test_p13_nongit');

  try {
    // Cleanup previous runs if existing
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(nonGitDir, { recursive: true, force: true });

    await fs.mkdir(nonGitDir, { recursive: true });
    await fs.mkdir(testDir, { recursive: true });

    // 1. Non-git directory check
    const nonGitRes = await requestJson(`/api/git/status?p=${encodeURIComponent(nonGitDir)}`, 'GET', token);
    assert.strictEqual(nonGitRes.status, 200, 'Non-git directory should return 200 with notRepo flag');
    assert.strictEqual(nonGitRes.body.notRepo, true, 'notRepo flag must be true');
    assert.strictEqual(nonGitRes.body.isRepo, false, 'isRepo flag must be false');
    pass('Non-git directory returns isRepo: false and notRepo: true');

    // Initialize git repo in testDir
    await execFileAsync('git', ['init', '-b', 'main'], { cwd: testDir });
    await execFileAsync('git', ['config', 'user.name', 'NebuTest'], { cwd: testDir });
    await execFileAsync('git', ['config', 'user.email', 'test@nebudesk.local'], { cwd: testDir });

    // 2. Empty Git repository check
    const emptyRepoRes = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.strictEqual(emptyRepoRes.status, 200);
    assert.strictEqual(emptyRepoRes.body.isRepo, true);
    assert.strictEqual(emptyRepoRes.body.clean, true);
    assert.strictEqual(emptyRepoRes.body.staged.length, 0);
    assert.strictEqual(emptyRepoRes.body.unstaged.length, 0);
    assert.strictEqual(emptyRepoRes.body.untracked.length, 0);
    pass('Empty repository detected with clean state');

    // 3. Create initial file & commit
    await fs.writeFile(path.join(testDir, 'README.md'), '# Initial P13 Project\n', 'utf8');
    
    // Status should show README.md as untracked
    const untrackedRes = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.strictEqual(untrackedRes.status, 200);
    assert.strictEqual(untrackedRes.body.clean, false);
    assert.ok(untrackedRes.body.untracked.some((f: any) => f.file === 'README.md'), 'README.md should be untracked');
    pass('Untracked file detected in git status');

    // 4. Stage the untracked file
    const stageRes = await requestJson('/api/git/stage', 'POST', token, {
      p: testDir,
      file: 'README.md'
    });
    assert.strictEqual(stageRes.status, 200);
    assert.strictEqual(stageRes.body.success, true);

    const stagedStatusRes = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.ok(stagedStatusRes.body.staged.some((f: any) => f.file === 'README.md'), 'README.md must be staged');
    assert.strictEqual(stagedStatusRes.body.untracked.length, 0, 'No untracked files should remain');
    pass('File staging via /api/git/stage verified');

    // 5. Unstage the file
    const unstageRes = await requestJson('/api/git/unstage', 'POST', token, {
      p: testDir,
      file: 'README.md'
    });
    assert.strictEqual(unstageRes.status, 200);
    assert.strictEqual(unstageRes.body.success, true);

    const afterUnstageRes = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.strictEqual(afterUnstageRes.body.staged.length, 0, 'File should no longer be staged');
    pass('File unstaging via /api/git/unstage verified');

    // Stage all & commit
    await requestJson('/api/git/stage', 'POST', token, { p: testDir, all: true });
    const commitRes = await requestJson('/api/git/commit', 'POST', token, {
      p: testDir,
      message: 'Initial commit for P13 test'
    });
    assert.strictEqual(commitRes.status, 200);
    assert.strictEqual(commitRes.body.success, true);
    pass('Commit via /api/git/commit verified');

    // 6. Modified file (unstaged)
    await fs.appendFile(path.join(testDir, 'README.md'), 'Added modification line\n', 'utf8');
    const modRes = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.ok(modRes.body.unstaged.some((f: any) => f.file === 'README.md'), 'README.md should be in unstaged list');
    pass('Unstaged modification detected');

    // 7. Diff inspection
    const diffRes = await requestJson(`/api/git/diff?p=${encodeURIComponent(testDir)}&file=README.md`, 'GET', token);
    assert.strictEqual(diffRes.status, 200);
    assert.ok(diffRes.body.diff.includes('+Added modification line'), 'Diff must contain added line');
    pass('File diff generated correctly via /api/git/diff');

    // 8. Discard changes
    const discardRes = await requestJson('/api/git/discard', 'POST', token, {
      p: testDir,
      file: 'README.md'
    });
    assert.strictEqual(discardRes.status, 200);
    assert.strictEqual(discardRes.body.success, true);

    const postDiscardContent = await fs.readFile(path.join(testDir, 'README.md'), 'utf8');
    assert.strictEqual(postDiscardContent, '# Initial P13 Project\n', 'Modifications must be discarded');
    pass('Discard changes via /api/git/discard verified');

    // 9. Branch list and detection
    const branchRes = await requestJson(`/api/git/branches?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.strictEqual(branchRes.status, 200);
    assert.strictEqual(branchRes.body.current, 'main');
    assert.ok(branchRes.body.branches.includes('main'), 'main branch must be listed');
    pass('Branch listing via /api/git/branches verified');

    // 10. Branch creation and checkout
    const checkoutRes = await requestJson('/api/git/checkout', 'POST', token, {
      p: testDir,
      branch: 'feature-p13',
      create: true
    });
    assert.strictEqual(checkoutRes.status, 200);
    assert.strictEqual(checkoutRes.body.branch, 'feature-p13');

    const statusAfterBranch = await requestJson(`/api/git/status?p=${encodeURIComponent(testDir)}`, 'GET', token);
    assert.strictEqual(statusAfterBranch.body.branch, 'feature-p13');
    pass('Branch creation and checkout verified');

    // 11. Switch back to main
    const switchBackRes = await requestJson('/api/git/checkout', 'POST', token, {
      p: testDir,
      branch: 'main'
    });
    assert.strictEqual(switchBackRes.status, 200);
    assert.strictEqual(switchBackRes.body.branch, 'main');
    pass('Branch switching verified');

    // 12. Security Test: Sandbox violation on repository path
    const sandboxPathRes = await requestJson('/api/git/status?p=/etc', 'GET', token);
    assert.strictEqual(sandboxPathRes.status, 403, 'Arbitrary path outside workspace must return 403');
    pass('Sandbox traversal protection: /etc rejected with 403');

    // 13. Security Test: Relative path traversal in file parameter
    const traversalDiffRes = await requestJson(`/api/git/diff?p=${encodeURIComponent(testDir)}&file=../../../../etc/passwd`, 'GET', token);
    assert.strictEqual(traversalDiffRes.status, 403, 'Path traversal in diff file parameter must return 403');
    pass('Path traversal in diff file parameter rejected with 403');

    // 14. Security Test: Invalid branch name with shell metas
    const badBranchRes = await requestJson('/api/git/checkout', 'POST', token, {
      p: testDir,
      branch: 'feature; rm -rf /; echo hack'
    });
    assert.strictEqual(badBranchRes.status, 400, 'Malicious branch name must return 400');
    pass('Malicious branch name rejected with 400');

    // 15. Push / Pull without remote returns clean error (no crash, no 500 unhandled)
    const pullRes = await requestJson('/api/git/pull', 'POST', token, { p: testDir });
    assert.ok(pullRes.status === 400 || pullRes.status === 422 || pullRes.status === 500, 'Pull without remote should fail gracefully');
    assert.ok(pullRes.body.error, 'Clean error message must be returned');
    pass('Git pull without upstream fails gracefully with structured error');

  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(nonGitDir, { recursive: true, force: true });
  }

  console.log('\n================================================================');
  console.log(`  P13 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

runP13Tests().catch(err => {
  console.error('Fatal P13 test error:', err);
  process.exit(1);
});
