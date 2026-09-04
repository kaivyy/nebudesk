import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

interface P17Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P17Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P17: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P17: ${testName}`, err);
  throw new Error(`P17 Test Failed: ${testName} -> ${err}`);
}

// Mock browser localStorage for node test runner
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('  P17 ADVANCED WORKSPACE PERSISTENCE VERIFICATION SUITE');
  console.log('================================================================\n');

  // Setup mock browser window & localStorage
  const mockStorage = new MockLocalStorage();
  (global as any).window = { localStorage: mockStorage };
  (global as any).localStorage = mockStorage;

  // Dynamically import safeStorage from web codebase
  const safeStoragePath = path.resolve('../web/src/utils/safeStorage.ts');
  const safeStorageModule = await import(safeStoragePath);
  const safeStorage = safeStorageModule.safeStorage;

  try {
    // 1. Storage Sanitization: Sensitive keys blocked
    try {
      mockStorage.clear();
      const tokenBlocked = safeStorage.setItem('user_token', 'jwt_secret_token_12345');
      const passBlocked = safeStorage.setItem('account_password', 'p@ssword');
      const jwtBlocked = safeStorage.setItem('auth_jwt_value', 'eyJh...');
      const secretBlocked = safeStorage.setItem('api_secret_key', 'sec_123');

      assert.strictEqual(tokenBlocked, false, 'Should block user_token');
      assert.strictEqual(passBlocked, false, 'Should block account_password');
      assert.strictEqual(jwtBlocked, false, 'Should block auth_jwt_value');
      assert.strictEqual(secretBlocked, false, 'Should block api_secret_key');

      assert.strictEqual(mockStorage.getItem('user_token'), null);
      assert.strictEqual(mockStorage.getItem('account_password'), null);
      pass('Storage Sanitization: Sensitive keys (tokens, passwords, secrets) strictly blocked');
    } catch (e) {
      fail('Storage Sanitization: Sensitive keys (tokens, passwords, secrets) strictly blocked', e);
    }

    // 2. Safe persistence of legitimate editor state
    try {
      mockStorage.clear();
      const stored = safeStorage.setItem('nebucode_workspace_win1', '/root/nebudesk');
      assert.strictEqual(stored, true, 'Should allow nebucode_workspace key');
      const retrieved = safeStorage.getItem('nebucode_workspace_win1', '');
      assert.strictEqual(retrieved, '/root/nebudesk');
      pass('Safe persistence: Standard editor state stored and retrieved cleanly');
    } catch (e) {
      fail('Safe persistence: Standard editor state stored and retrieved cleanly', e);
    }

    // 3. Graceful Corruption Recovery: Malformed JSON
    try {
      mockStorage.setItem('corrupt_open_files', '{"unclosed_json: [1,2,3');
      const fallback = ['/root/nebudesk/README.md'];
      const recovered = safeStorage.getItem('corrupt_open_files', fallback, Array.isArray);
      assert.deepStrictEqual(recovered, fallback, 'Should return fallback on corrupted JSON');
      // Corrupt key should be auto-purged
      assert.strictEqual(mockStorage.getItem('corrupt_open_files'), null, 'Corrupt key should be purged');
      pass('Corruption Recovery: Malformed JSON handled gracefully and purged without crash');
    } catch (e) {
      fail('Corruption Recovery: Malformed JSON handled gracefully and purged without crash', e);
    }

    // 4. Graceful Corruption Recovery: Schema / Type validation failure
    try {
      mockStorage.setItem('invalid_type_recent', JSON.stringify({ notAnArray: true }));
      const fallback: string[] = [];
      const recovered = safeStorage.getItem('invalid_type_recent', fallback, Array.isArray);
      assert.deepStrictEqual(recovered, fallback, 'Should return fallback when validator fails');
      assert.strictEqual(mockStorage.getItem('invalid_type_recent'), null, 'Invalid schema key should be purged');
      pass('Corruption Recovery: Schema mismatch detected and reset to fallback safely');
    } catch (e) {
      fail('Corruption Recovery: Schema mismatch detected and reset to fallback safely', e);
    }

    // 5. Size bounding: 500KB cap prevents quota exhaustion
    try {
      mockStorage.clear();
      const largePayload = 'X'.repeat(600 * 1024); // 600 KB
      const result = safeStorage.setItem('large_key', largePayload);
      assert.strictEqual(result, false, 'Should reject values over 500KB');
      assert.strictEqual(mockStorage.getItem('large_key'), null);

      // Oversized existing item purged on read
      mockStorage.setItem('existing_large', JSON.stringify('Y'.repeat(550 * 1024)));
      const readResult = safeStorage.getItem('existing_large', 'fallback_val');
      assert.strictEqual(readResult, 'fallback_val');
      assert.strictEqual(mockStorage.getItem('existing_large'), null, 'Oversized existing entry should be purged');
      pass('Quota Protection: Bounded storage limit (500KB) enforced on write & read');
    } catch (e) {
      fail('Quota Protection: Bounded storage limit (500KB) enforced on write & read', e);
    }

    // 6. Multi-Workspace Isolation: getWorkspaceKey prevents cross-workspace leaks
    try {
      const wsA = '/root/project_alpha';
      const wsB = '/root/project_beta';
      const keyA = safeStorage.getWorkspaceKey(wsA, 'open_files', 'win1');
      const keyB = safeStorage.getWorkspaceKey(wsB, 'open_files', 'win1');
      assert.notStrictEqual(keyA, keyB, 'Keys for different workspaces must not collide');

      safeStorage.setItem(keyA, ['/root/project_alpha/src/index.ts', '/root/project_alpha/package.json']);
      safeStorage.setItem(keyB, ['/root/project_beta/main.py', '/root/project_beta/requirements.txt']);

      const filesA = safeStorage.getItem<string[]>(keyA, [], Array.isArray);
      const filesB = safeStorage.getItem<string[]>(keyB, [], Array.isArray);

      assert.deepStrictEqual(filesA, ['/root/project_alpha/src/index.ts', '/root/project_alpha/package.json']);
      assert.deepStrictEqual(filesB, ['/root/project_beta/main.py', '/root/project_beta/requirements.txt']);
      assert(!filesA.some(f => f.includes('project_beta')), 'Workspace A must not contain files from Workspace B');
      assert(!filesB.some(f => f.includes('project_alpha')), 'Workspace B must not contain files from Workspace A');
      pass('Multi-Workspace Isolation: Workspace state isolated with zero cross-workspace data leakage');
    } catch (e) {
      fail('Multi-Workspace Isolation: Workspace state isolated with zero cross-workspace data leakage', e);
    }

    // 7. Cursor and Scroll Position Persistence
    try {
      const ws = '/root/my_code';
      const cursorKey = safeStorage.getWorkspaceKey(ws, 'cursor_positions', 'win1');
      const positions: Record<string, { lineNumber: number; column: number; scrollTop?: number }> = {
        '/root/my_code/index.ts': { lineNumber: 42, column: 15, scrollTop: 250 },
        '/root/my_code/app.ts': { lineNumber: 108, column: 1 }
      };
      safeStorage.setItem(cursorKey, positions);

      const retrieved = safeStorage.getItem<typeof positions>(cursorKey, {}, (v): v is typeof positions => typeof v === 'object' && v !== null);
      assert.strictEqual(retrieved['/root/my_code/index.ts']?.lineNumber, 42);
      assert.strictEqual(retrieved['/root/my_code/index.ts']?.column, 15);
      assert.strictEqual(retrieved['/root/my_code/index.ts']?.scrollTop, 250);
      assert.strictEqual(retrieved['/root/my_code/app.ts']?.lineNumber, 108);
      pass('Cursor & Scroll Position Persistence: Saved per file and restored accurately');
    } catch (e) {
      fail('Cursor & Scroll Position Persistence: Saved per file and restored accurately', e);
    }

    // 8. Terminal Session Persistence and Recovery
    try {
      const termKey = 'nebucode_terminals_win1';
      // Store valid terminals
      safeStorage.setItem(termKey, [
        { id: '1', cwd: '/root/nebudesk', name: 'bash' },
        { id: '2', cwd: '/root/nebudesk/apps/web', name: 'web' }
      ]);
      const terms = safeStorage.getItem<any[]>(termKey, [{ id: '1', cwd: '/root', name: 'bash' }], Array.isArray);
      assert.strictEqual(terms.length, 2);
      assert.strictEqual(terms[1].name, 'web');

      // Corrupt terminal entry recovery
      mockStorage.setItem(termKey, '{not_valid_json');
      const fallback = [{ id: '1', cwd: '/root', name: 'bash' }];
      const recoveredTerms = safeStorage.getItem<any[]>(termKey, fallback, Array.isArray);
      assert.deepStrictEqual(recoveredTerms, fallback);
      pass('Terminal Session Persistence: Terminal states preserved with graceful fallback on corruption');
    } catch (e) {
      fail('Terminal Session Persistence: Terminal states preserved with graceful fallback on corruption', e);
    }

    // 9. CodeApp Frontend Integration Contracts
    try {
      const codeAppContent = await fs.readFile(path.join('/root/nebudesk/apps/web/src/apps/code/CodeApp.tsx'), 'utf-8');
      assert(codeAppContent.includes('safeStorage'), 'CodeApp must import and use safeStorage');
      assert(codeAppContent.includes('saveCursorPosition'), 'CodeApp must implement saveCursorPosition');
      assert(codeAppContent.includes('cursorMapRef'), 'CodeApp must maintain cursorMapRef');
      assert(codeAppContent.includes('onDidChangeCursorPosition'), 'CodeApp must listen for onDidChangeCursorPosition');
      assert(codeAppContent.includes('onDidScrollChange'), 'CodeApp must listen for onDidScrollChange');
      assert(codeAppContent.includes('getWorkspaceKey'), 'CodeApp must use getWorkspaceKey for workspace scoping');
      pass('CodeApp Frontend Contracts: safeStorage, cursor persistence & workspace scoping fully wired');
    } catch (e) {
      fail('CodeApp Frontend Contracts: safeStorage, cursor persistence & workspace scoping fully wired', e);
    }

    // 10. Server Service Health Verification
    try {
      await initDb();
      const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
      const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
      const fastifyApp = Fastify();
      await fastifyApp.register(jwt, { secret: jwtSecret });
      const user = await dbGet('SELECT * FROM User LIMIT 1') as { id: string; username: string };
      const token = fastifyApp.jwt.sign({ id: user.id, username: user.username });

      // Verify server is responsive and healthy
      const healthReq = await new Promise<{ status: number; body: any }>((resolve, reject) => {
        const req = http.request('http://127.0.0.1:3030/api/settings', {
          headers: { Cookie: `token=${token}` }
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve({ status: res.statusCode || 500, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode || 500, body: data }); }
          });
        });
        req.on('error', reject);
        req.end();
      });

      assert.strictEqual(healthReq.status, 200, `Expected 200 from /api/settings, got ${healthReq.status}`);
      pass('Server Production Health: Backend online, responsive and authenticated');
    } catch (e) {
      fail('Server Production Health: Backend online, responsive and authenticated', e);
    }

  } finally {
    delete (global as any).window;
    delete (global as any).localStorage;
  }

  console.log('\n================================================================');
  console.log(`  P17 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (${Math.round(stats.passed / stats.total * 100)}%)`);
  console.log('================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
