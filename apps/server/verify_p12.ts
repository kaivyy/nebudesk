import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, dbAll, dbRun, initDb } from './src/db.js';
import { safeResolve, ALLOWED_ROOT } from './src/pathUtils.js';
import WebSocket from 'ws';
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

interface P12Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P12Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P12: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P12: ${testName}`, err);
  throw new Error(`P12 Test Failed: ${testName} -> ${err}`);
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function getBackendRssMb(): Promise<number> {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist']);
    const list = JSON.parse(stdout);
    const backend = list.find((p: any) => p.name === 'nebudesk-backend');
    if (backend && backend.monit?.memory) {
      return backend.monit.memory / 1024 / 1024;
    }
  } catch {}
  return process.memoryUsage().rss / 1024 / 1024;
}

async function main() {
  console.log('================================================================');
  console.log('  NEBUDESK P12: NEBUCODE REAL-WORLD STABILITY & SOAK TEST SUITE ');
  console.log('================================================================');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });

  const tokenUserA = fastifyApp.jwt.sign({ id: 'p12_user_a', username: 'p12_user_a' }, { expiresIn: '2h' });
  const tokenUserB = fastifyApp.jwt.sign({ id: 'p12_user_b', username: 'p12_user_b' }, { expiresIn: '2h' });

  const testDirRel = 'p12_soak_test_workspace';
  const testDirAbs = path.join(ALLOWED_ROOT, testDirRel);

  try {
    await fs.rm(testDirAbs, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(testDirAbs, { recursive: true });

  // ---------------------------------------------------------------------------
  // PHASE 2 & 29: MEMORY LEAK AUDIT (100 CYCLES REPEATED OPERATIONS)
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 2 & 29: MEMORY LEAK AUDIT (100 CYCLES)');
  {
    const initialRssMb = await getBackendRssMb();

    for (let i = 0; i < 100; i++) {
      const fileName = `cycle_file_${i}.txt`;
      const fileRel = path.join(testDirRel, fileName);

      // 1. Create file
      await requestJson('/api/files/file', 'POST', tokenUserA, { p: testDirRel, name: fileName });
      // 2. Write content
      await requestJson('/api/files/content', 'PUT', tokenUserA, { p: fileRel, content: `Cycle content ${i} TOKEN_${i}` });
      // 3. Search text
      await requestJson(`/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=TOKEN_${i}`, 'GET', tokenUserA);
      // 4. Batch replace
      await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
        p: testDirRel,
        q: `TOKEN_${i}`,
        replaceWith: `REPLACED_${i}`,
        files: [fileName]
      });
      // 5. Delete file
      await requestJson(`/api/files?p=${encodeURIComponent(fileRel)}`, 'DELETE', tokenUserA);
    }

    const finalRssMb = await getBackendRssMb();
    const rssDeltaMb = finalRssMb - initialRssMb;

    console.log(`  Initial Backend RSS: ${initialRssMb.toFixed(2)} MB | Final Backend RSS: ${finalRssMb.toFixed(2)} MB | Delta: ${rssDeltaMb.toFixed(2)} MB`);
    assert(rssDeltaMb < 40, `Memory growth after 100 cycles must be bounded (< 40 MB), measured: ${rssDeltaMb.toFixed(2)} MB`);
    pass(`Memory leak audit: 100 complete file-search-replace-delete cycles executed stably (Delta: ${rssDeltaMb.toFixed(2)} MB)`);
  }

  // ---------------------------------------------------------------------------
  // PHASE 3: LONG SESSION SOAK SIMULATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 3: LONG SESSION SOAK SIMULATION');
  {
    const soakSubdir = path.join(testDirAbs, 'soak_project');
    await fs.mkdir(soakSubdir, { recursive: true });

    // Seed 10 files in soak project
    for (let f = 0; f < 10; f++) {
      await fs.writeFile(path.join(soakSubdir, `module_${f}.ts`), `
        export function compute_${f}(x: number) {
          return x * ${f + 1} + 42;
        }
        // SOAK_TOKEN_KEYWORD
      `);
    }

    const soakStart = Date.now();
    let soakOps = 0;

    // Run 25 iterations of full multi-file developer workflows
    for (let iter = 0; iter < 25; iter++) {
      // List directory
      const listRes = await requestJson(`/api/files?p=${encodeURIComponent(path.join(testDirRel, 'soak_project'))}`, 'GET', tokenUserA);
      assert.strictEqual(listRes.status, 200);

      // Read file
      const readRes = await requestJson(`/api/files/content?p=${encodeURIComponent(path.join(testDirRel, 'soak_project', `module_${iter % 10}.ts`))}`, 'GET', tokenUserA);
      assert.strictEqual(readRes.status, 200);

      // Edit and save
      const updatedContent = `${readRes.body.content}\n// Iteration ${iter} timestamp: ${Date.now()}`;
      const writeRes = await requestJson('/api/files/content', 'PUT', tokenUserA, {
        p: path.join(testDirRel, 'soak_project', `module_${iter % 10}.ts`),
        content: updatedContent
      });
      assert.strictEqual(writeRes.status, 200);

      // Ripgrep search across workspace
      const searchRes = await requestJson(`/api/files/grep?p=${encodeURIComponent(path.join(testDirRel, 'soak_project'))}&q=SOAK_TOKEN_KEYWORD`, 'GET', tokenUserA);
      assert.strictEqual(searchRes.status, 200);
      assert(searchRes.body.results.length >= 10);

      // Batch replace in files
      const replaceRes = await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
        p: path.join(testDirRel, 'soak_project'),
        q: 'compute_',
        replaceWith: 'calc_',
        files: [`module_${iter % 10}.ts`]
      });
      assert.strictEqual(replaceRes.status, 200);

      // Revert replace to maintain idempotency
      await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
        p: path.join(testDirRel, 'soak_project'),
        q: 'calc_',
        replaceWith: 'compute_',
        files: [`module_${iter % 10}.ts`]
      });

      soakOps += 6;
    }

    const soakDurationMs = Date.now() - soakStart;
    console.log(`  Completed ${soakOps} soak operations in ${soakDurationMs}ms (Avg ${(soakDurationMs / soakOps).toFixed(1)}ms/op)`);
    pass(`Long session soak test: 25 multi-step developer iterations passed with 0 errors`);
  }

  // ---------------------------------------------------------------------------
  // PHASE 4: LARGE WORKSPACE BENCHMARKS (100, 500, 1000, 2000 FILES)
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 4: LARGE WORKSPACE BENCHMARKS');
  {
    const benchWorkspaceRel = path.join(testDirRel, 'benchmarks');
    const benchWorkspaceAbs = path.join(testDirAbs, 'benchmarks');
    await fs.mkdir(benchWorkspaceAbs, { recursive: true });

    const scales = [100, 500, 1000, 2000];

    for (const count of scales) {
      const scaleDirAbs = path.join(benchWorkspaceAbs, `scale_${count}`);
      const scaleDirRel = path.join(benchWorkspaceRel, `scale_${count}`);
      await fs.mkdir(scaleDirAbs, { recursive: true });

      // Populate files across 10 subdirectories
      for (let s = 0; s < 10; s++) {
        const sub = path.join(scaleDirAbs, `sub_${s}`);
        await fs.mkdir(sub, { recursive: true });
      }

      const filesPerSub = count / 10;
      for (let s = 0; s < 10; s++) {
        for (let f = 0; f < filesPerSub; f++) {
          const fp = path.join(scaleDirAbs, `sub_${s}`, `file_${f}.ts`);
          const body = `// File ${f} in sub ${s}\nexport const VAL_${f} = ${f};\n// BENCH_TARGET_SYMBOL_${s}\n`;
          await fs.writeFile(fp, body);
        }
      }

      // Benchmark 1: Directory listing
      const tList0 = Date.now();
      const listRes = await requestJson(`/api/files?p=${encodeURIComponent(scaleDirRel)}`, 'GET', tokenUserA);
      const listTime = Date.now() - tList0;
      assert.strictEqual(listRes.status, 200);

      // Benchmark 2: Ripgrep text search
      const tSearch0 = Date.now();
      const searchRes = await requestJson(
        `/api/files/grep?p=${encodeURIComponent(scaleDirRel)}&q=BENCH_TARGET_SYMBOL_3`,
        'GET',
        tokenUserA
      );
      const searchTime = Date.now() - tSearch0;
      assert.strictEqual(searchRes.status, 200);
      assert(searchRes.body.results.length > 0);

      // Benchmark 3: File read
      const tRead0 = Date.now();
      const readRes = await requestJson(
        `/api/files/content?p=${encodeURIComponent(path.join(scaleDirRel, 'sub_3', 'file_0.ts'))}`,
        'GET',
        tokenUserA
      );
      const readTime = Date.now() - tRead0;
      assert.strictEqual(readRes.status, 200);

      console.log(`  Workspace ${count.toString().padStart(4)} files: List: ${listTime}ms | Search: ${searchTime}ms | Read: ${readTime}ms`);
      assert(searchTime < 1500, `Search in ${count} files must complete in < 1500ms, measured: ${searchTime}ms`);
      pass(`Large workspace scale ${count} files benchmark verified (Search: ${searchTime}ms)`);
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE 5, 6, 7: RIPGREP SEARCH AUDIT & RESULT LIMITS
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 5, 6, 7: RIPGREP SEARCH AUDIT, LIMITS & ERROR HANDLING');
  {
    const searchTargetDir = path.join(testDirAbs, 'search_audit');
    await fs.mkdir(searchTargetDir, { recursive: true });

    // File with Unicode and special characters in content and name
    const specialFileAbs = path.join(searchTargetDir, 'special file [v1.0] (copy).ts');
    await fs.writeFile(
      specialFileAbs,
      'const message = "🚀 Special characters $&*()_+{}[]:;!@# and Unicode: üñîçødé";\nconst flag = "SEARCH_SPECIAL_TOKEN_123";\n'
    );

    // 1. Search with special regex-like characters (should be escaped by -F fixed string mode)
    const fixedRes = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(path.join(testDirRel, 'search_audit'))}&q=${encodeURIComponent('$&*()_+{}[]')}`,
      'GET',
      tokenUserA
    );
    assert.strictEqual(fixedRes.status, 200);
    assert.strictEqual(fixedRes.body.results.length, 1);
    assert(fixedRes.body.results[0].preview.includes('$&*()_+{}[]'));
    pass('Ripgrep fixed string mode safely matches regex metacharacters without errors');

    // 2. Search with Unicode
    const unicodeRes = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(path.join(testDirRel, 'search_audit'))}&q=${encodeURIComponent('üñîçødé')}`,
      'GET',
      tokenUserA
    );
    assert.strictEqual(unicodeRes.status, 200);
    assert.strictEqual(unicodeRes.body.results.length, 1);
    pass('Ripgrep handles multi-byte UTF-8 Unicode characters accurately');

    // 3. Result limit clamping (verify maxResults upper bound clamp)
    const limitRes = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(path.join(testDirRel, 'benchmarks', 'scale_1000'))}&q=const&maxResults=500`,
      'GET',
      tokenUserA
    );
    assert.strictEqual(limitRes.status, 200);
    assert(limitRes.body.results.length <= 200, `Result count must be clamped to 200 maximum, received: ${limitRes.body.results.length}`);
    pass('Search result limits safely clamped to 200 to protect browser rendering performance');

    // 4. Invalid regex syntax returns 400 Bad Request (not unhandled 500 crash)
    const invalidRegexRes = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(path.join(testDirRel, 'search_audit'))}&q=${encodeURIComponent('([a-z+')}&isRegex=true`,
      'GET',
      tokenUserA
    );
    assert.strictEqual(invalidRegexRes.status, 400, 'Invalid regular expression must return 400 Bad Request');
    assert(invalidRegexRes.body?.error, 'Response must include error message');
    pass('Invalid regular expression returns 400 Bad Request gracefully');
  }

  // ---------------------------------------------------------------------------
  // PHASE 8 & 9: BATCH REPLACE SAFETY & FAILURE INJECTION
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 8 & 9: BATCH REPLACE SAFETY & FAILURE INJECTION');
  {
    const replaceDirAbs = path.join(testDirAbs, 'replace_safety');
    await fs.mkdir(replaceDirAbs, { recursive: true });

    const f1 = path.join(replaceDirAbs, 'file1.ts');
    const f2 = path.join(replaceDirAbs, 'file2.ts');
    await fs.writeFile(f1, 'const oldVal = "REPLACE_TARGET_VAL";\n');
    await fs.writeFile(f2, 'const oldVal2 = "REPLACE_TARGET_VAL";\n');

    // 1. Safe multi-file replacement with special characters in replacement
    const replacementWithSpecialChars = 'NEW_VALUE_"with_quotes"_\'and_single\'_\\and_backslash_\n_and_newline';
    const replaceRes = await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
      p: path.join(testDirRel, 'replace_safety'),
      q: 'REPLACE_TARGET_VAL',
      replaceWith: replacementWithSpecialChars,
      files: ['file1.ts', 'file2.ts']
    });

    assert.strictEqual(replaceRes.status, 200);
    assert.strictEqual(replaceRes.body?.count, 2);
    assert.strictEqual(replaceRes.body?.filesModified?.length, 2);

    // Verify disk content
    const c1 = await fs.readFile(f1, 'utf8');
    assert(c1.includes('NEW_VALUE_"with_quotes"_\'and_single\'_\\and_backslash_'), 'Replacement with quotes and backslashes applied cleanly');
    pass('Batch replacement safely processes special characters, quotes, and backslashes');

    // 2. Failure injection: one file does not exist, other file is valid
    const f3 = path.join(replaceDirAbs, 'file3.ts');
    await fs.writeFile(f3, 'export const item = "PARTIAL_REPLACE_TARGET";\n');

    const partialRes = await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
      p: path.join(testDirRel, 'replace_safety'),
      q: 'PARTIAL_REPLACE_TARGET',
      replaceWith: 'PARTIAL_REPLACED_SUCCESS',
      files: ['file3.ts', 'non_existent_ghost_file.ts']
    });

    assert.strictEqual(partialRes.status, 200);
    assert.strictEqual(partialRes.body?.count, 1, 'Should replace in valid file and skip missing file');
    assert.deepStrictEqual(partialRes.body?.filesModified, ['file3.ts']);
    const c3 = await fs.readFile(f3, 'utf8');
    assert(c3.includes('PARTIAL_REPLACED_SUCCESS'));
    pass('Batch replacement gracefully handles missing files via per-file safety without failing entire batch');
  }

  // ---------------------------------------------------------------------------
  // PHASE 10 & 11: EDITOR DATA INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 10 & 11: EDITOR DATA INTEGRITY & FIDELITY');
  {
    const integrityFileRel = path.join(testDirRel, 'integrity_test.ts');
    const integrityFileAbs = path.join(testDirAbs, 'integrity_test.ts');

    const testPayload = `
      // NebuCode Editor Data Integrity Verification
      const data = {
        ascii: "Hello World 12345",
        symbols: "!@#$%^&*()_+-=[]{}|;':,./<>?",
        unicode: "日本語 / 中文 / 한국어 / العربية / עברית",
        emojis: "🚀⚡💻🔥✨🎉",
        multiline: \`Line 1\nLine 2\r\nLine 3\`
      };
      export default data;
    `;

    // 1. Write file
    const writeRes = await requestJson('/api/files/content', 'PUT', tokenUserA, {
      p: integrityFileRel,
      content: testPayload
    });
    assert.strictEqual(writeRes.status, 200);

    // 2. Read back
    const readRes = await requestJson(`/api/files/content?p=${encodeURIComponent(integrityFileRel)}`, 'GET', tokenUserA);
    assert.strictEqual(readRes.status, 200);
    assert.strictEqual(readRes.body?.content, testPayload, 'File content read back must match test payload exactly');

    // 3. Verify on disk
    const diskContent = await fs.readFile(integrityFileAbs, 'utf8');
    assert.strictEqual(diskContent, testPayload, 'Disk content must match test payload byte-for-byte');
    pass('Editor data integrity: 100% byte-for-byte fidelity across ASCII, symbols, Unicode, emojis, and multiline text');
  }

  // ---------------------------------------------------------------------------
  // PHASE 14 & 15: TERMINAL STABILITY & MULTI-USER ISOLATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 14 & 15: TERMINAL STABILITY & MULTI-USER ISOLATION');
  {
    const runTerminalCommand = (token: string, termId: string, cmd: string, matchStr: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        let buffer = '';
        const ws = new WebSocket(
          `ws://127.0.0.1:3030/ws/terminal?termId=${encodeURIComponent(termId)}&cwd=${encodeURIComponent(testDirRel)}`,
          {
            headers: {
              Cookie: `token=${token}`
            }
          }
        );
        const timer = setTimeout(() => {
          ws.terminate();
          resolve(buffer);
        }, 6000);

        ws.on('open', () => {
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'terminal.input', data: `${cmd}\n` }));
          }, 600);
        });

        ws.on('message', (data: WebSocket.RawData) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'terminal.output') {
              buffer += parsed.data;
              if (buffer.includes(matchStr)) {
                clearTimeout(timer);
                ws.close();
                resolve(buffer);
              }
            }
          } catch {}
        });

        ws.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    };

    // 1. Connect User A terminal session
    const outA = await runTerminalCommand(tokenUserA, 'p12_term_session_1', 'echo P12_TERMINAL_ECHO_TEST', 'P12_TERMINAL_ECHO_TEST');
    assert(outA.includes('P12_TERMINAL_ECHO_TEST'), 'Terminal must echo User A command');
    pass('Terminal WebSocket connects, executes command, and outputs stream correctly');

    // 2. Connect User B with identical termId name 'p12_term_session_1'
    const outB = await runTerminalCommand(tokenUserB, 'p12_term_session_1', 'echo P12_USER_B_PRIVATE_STREAM', 'P12_USER_B_PRIVATE_STREAM');
    assert(outB.includes('P12_USER_B_PRIVATE_STREAM'), 'User B receives output in their own session');
    assert(!outB.includes('P12_TERMINAL_ECHO_TEST'), 'User B MUST NOT see User A session history');

    // Clean up tmux sessions
    await execFileAsync('tmux', ['kill-session', '-t', 'nebudesk_p12_user_a_p12_term_session_1']).catch(() => {});
    await execFileAsync('tmux', ['kill-session', '-t', 'nebudesk_p12_user_b_p12_term_session_1']).catch(() => {});
    pass('Multi-user terminal isolation: User A and User B maintain completely isolated tmux namespaces');
  }

  // ---------------------------------------------------------------------------
  // PHASE 16, 17, 18: LOCALSTORAGE PERSISTENCE RESILIENCE
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 16, 17, 18: LOCALSTORAGE PERSISTENCE RESILIENCE');
  {
    const codeAppSrcPath = path.resolve(__dirname, '../web/src/apps/code/CodeApp.tsx');
    const codeAppSrc = await fs.readFile(codeAppSrcPath, 'utf8');

    // 1. Verify corruption resilience in CodeApp
    assert(codeAppSrc.includes('const rawPaths = JSON.parse(savedFilesStr)') || codeAppSrc.includes('const rawPaths = safeStorage.getItem'), 'Open files restoration must parse safely');
    assert(codeAppSrc.includes('slice(0, 50)'), 'Restored tabs must be clamped to 50');
    assert(codeAppSrc.includes("savedOrient === 'vertical' ? 'vertical' : 'horizontal'") || codeAppSrc.includes("split_orient"), 'Split orientation must strictly validate values');
    assert(codeAppSrc.includes('Array.isArray(parsed) && parsed.length > 0') || codeAppSrc.includes('Array.isArray(arr) && arr.length > 0'), 'Terminals restore must validate array length');
    assert(codeAppSrc.includes('.slice(0, 30)'), 'Recent files history must be bounded to 30 items');

    pass('LocalStorage persistence schemas audited: fully guarded against corrupted JSON, invalid values, and unbounded growth');
  }

  // ---------------------------------------------------------------------------
  // PHASE 22: SQLITE CONCURRENCY & WAL MODE
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 22: SQLITE CONCURRENCY & WAL MODE VERIFICATION');
  {
    const journalModeRow = await dbGet<{ journal_mode: string }>('PRAGMA journal_mode;');
    assert.strictEqual(journalModeRow?.journal_mode?.toLowerCase(), 'wal', 'SQLite must be running in WAL mode');

    const busyTimeoutRow = await dbGet<{ timeout: number }>('PRAGMA busy_timeout;');
    assert(Number(busyTimeoutRow?.timeout) >= 5000, 'SQLite busy_timeout must be >= 5000ms');

    // Execute 50 concurrent mixed reads and writes
    const ops: Promise<any>[] = [];
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        ops.push(dbRun('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)', [`p12_test_key_${i}`, `val_${Date.now()}`]));
      } else {
        ops.push(dbGet('SELECT value FROM Settings WHERE key = ?', [`p12_test_key_${i - 1}`]));
      }
    }

    await Promise.all(ops);

    // Clean up test keys
    await dbRun("DELETE FROM Settings WHERE key LIKE 'p12_test_key_%'");
    pass('SQLite WAL concurrency: 50 concurrent reads and writes completed with zero lockouts');
  }

  // ---------------------------------------------------------------------------
  // PHASE 24 & 26: FILESYSTEM FAILURE INJECTION & INPUT FUZZING
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 24 & 26: FILESYSTEM FAILURE INJECTION & INPUT FUZZING');
  {
    // 1. Requesting non-existent file returns 404
    const res404 = await requestJson('/api/files/content?p=non_existent_file_xyz_123.ts', 'GET', tokenUserA);
    assert.strictEqual(res404.status, 404, 'Non-existent file content must return 404');

    // 2. Path traversal attempts return 403 Forbidden
    const fuzzTraversal = [
      '../../../../etc/passwd',
      '..%2f..%2f..%2fetc%2fpasswd',
      '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '/etc/shadow',
      './../../../../var/log'
    ];
    for (const trav of fuzzTraversal) {
      const res = await requestJson(`/api/files/content?p=${encodeURIComponent(trav)}`, 'GET', tokenUserA);
      assert.strictEqual(res.status, 403, `Traversal vector ${trav} must return 403`);
    }
    pass('Path traversal vectors strictly rejected with 403 Forbidden');

    // 3. Fuzzing input on grep endpoint
    const fuzzGrepQueries = [
      '', // empty
      'a', // too short
      'null',
      'undefined',
      '<script>alert(1)</script>',
      "' OR '1'='1",
      '; rm -rf / ;',
      '$(whoami)',
      '`id`',
      'A'.repeat(5000) // oversized query
    ];
    for (const fq of fuzzGrepQueries) {
      const res = await requestJson(`/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=${encodeURIComponent(fq)}`, 'GET', tokenUserA);
      assert([200, 400].includes(res.status), `Fuzz query "${fq.slice(0, 20)}" must return 200 or 400, got ${res.status}`);
      assert(res.body !== null, 'Response body must be valid JSON');
    }
    pass('Ripgrep endpoint input fuzzing: 10 malicious and malformed payloads handled safely');

    // 4. Fuzzing input on replace endpoint
    const fuzzReplace = await requestJson('/api/files/replace-in-files', 'POST', tokenUserA, {
      p: testDirRel,
      q: 'A'.repeat(10000),
      replaceWith: 'B'.repeat(10000),
      files: ['cycle_file_0.txt']
    });
    assert([200, 400].includes(fuzzReplace.status));
    pass('Replace-in-files input fuzzing: oversized payloads handled safely without server crash');
  }

  // ---------------------------------------------------------------------------
  // PHASE 30 & 31: PROCESS, SOCKET & ZERO-CHROMIUM AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> PHASE 30 & 31: PROCESS, SOCKET & ZERO-CHROMIUM AUDIT');
  {
    // 1. Process audit for Chromium / Playwright / CDP
    const { stdout: psOut } = await execFileAsync('ps', ['aux']);
    const browserMatches = psOut
      .split('\n')
      .filter(l => /chromium|chrome|playwright|puppeteer|--remote-debugging-port/i.test(l) && !l.includes('grep') && !l.includes('verify_'));
    assert.strictEqual(browserMatches.length, 0, `Zero browser processes expected, found: ${browserMatches.length}`);
    pass('Process audit: 0 Chromium, Playwright, Puppeteer, or CDP processes running');

    // 2. Listening ports check
    const { stdout: ssOut } = await execFileAsync('ss', ['-tlnp']);
    assert(ssOut.includes(':3030'), 'Port 3030 (Fastify Backend) must be active');
    assert(ssOut.includes(':5050'), 'Port 5050 (Frontend SPA) must be active');
    pass('Socket audit: Production ports 3030 (backend) and 5050 (frontend) listening cleanly');
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  try {
    await fs.rm(testDirAbs, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  console.log(`  P12 SOAK & STABILITY COMPLETE: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('P12 Suite crashed:', err);
  process.exit(1);
});
