import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { safeResolve, ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface P11Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P11Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P11: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P11: ${testName}`, err);
  throw new Error(`P11 Test Failed: ${testName} -> ${err}`);
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

async function main() {
  console.log('================================================================');
  console.log('  NEBUDESK P11: NEBUCODE WORKFLOW & SEARCH VERIFICATION SUITE   ');
  console.log('================================================================');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });

  const token = fastifyApp.jwt.sign({ id: 'p11_tester', username: 'p11_tester' }, { expiresIn: '1h' });

  const testDirRel = 'p11_workflow_verification';
  const testDirAbs = path.join(ALLOWED_ROOT, testDirRel);

  // Clean up any previous test artifacts
  try {
    await fs.rm(testDirAbs, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(testDirAbs, { recursive: true });

  const subDirAbs = path.join(testDirAbs, 'nested');
  await fs.mkdir(subDirAbs, { recursive: true });

  const file1Abs = path.join(testDirAbs, 'sample1.ts');
  const file2Abs = path.join(subDirAbs, 'sample2.ts');
  const file3Abs = path.join(testDirAbs, 'sample3.txt');

  await fs.writeFile(file1Abs, 'export const GREETING = "NEBUCODE_P11_SEARCH_TARGET";\nconsole.log(GREETING);\n');
  await fs.writeFile(file2Abs, 'import { GREETING } from "../sample1";\n// Another occurrence: NEBUCODE_P11_SEARCH_TARGET\n');
  await fs.writeFile(file3Abs, 'lowercase target: nebucode_p11_search_target in plain text file\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Ripgrep Workspace Text Search (GET /api/files/grep)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 1. VERIFY RIPGREP WORKSPACE TEXT SEARCH (GET /api/files/grep)');
  {
    const res = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=NEBUCODE_P11_SEARCH_TARGET&caseSensitive=true`,
      'GET',
      token
    );

    assert.strictEqual(res.status, 200, 'Grep search must return 200 OK');
    assert(Array.isArray(res.body?.results), 'Results must be an array');
    assert.strictEqual(res.body.results.length, 2, 'Should find exactly 2 case-sensitive matches in sample1 and sample2');

    const first = res.body.results[0];
    assert(first.file, 'Match must contain relative file path');
    assert(typeof first.line === 'number', 'Match must contain line number');
    assert(typeof first.column === 'number', 'Match must contain column number');
    assert(first.preview.includes('NEBUCODE_P11_SEARCH_TARGET'), 'Match must include preview snippet');
    pass('Workspace grep finds exact matches with file, line, column, and preview');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Case Sensitivity Toggle in Grep Search
  // ---------------------------------------------------------------------------
  console.log('\n>>> 2. VERIFY CASE SENSITIVITY TOGGLE');
  {
    // Case-insensitive search should match 3 occurrences across sample1, sample2, and sample3
    const resInsensitive = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=nebucode_p11_search_target&caseSensitive=false`,
      'GET',
      token
    );
    assert.strictEqual(resInsensitive.status, 200);
    assert.strictEqual(resInsensitive.body.results.length, 3, 'Case-insensitive search must find all 3 occurrences');

    // Case-sensitive search for lowercase should only match sample3
    const resSensitive = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=nebucode_p11_search_target&caseSensitive=true`,
      'GET',
      token
    );
    assert.strictEqual(resSensitive.status, 200);
    assert.strictEqual(resSensitive.body.results.length, 1, 'Case-sensitive lowercase search must only match sample3');
    pass('Grep honors caseSensitive boolean parameter accurately');
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Grep on Non-Existent String (Clean 200 with Empty Array)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 3. VERIFY NO-MATCH QUERY RETURNS EMPTY ARRAY (NOT 500)');
  {
    const resNoMatch = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=NON_EXISTENT_STRING_XYZ_999`,
      'GET',
      token
    );
    assert.strictEqual(resNoMatch.status, 200, 'Non-matching grep query must exit with 200 OK');
    assert.deepStrictEqual(resNoMatch.body.results, [], 'Results array must be empty');
    pass('Non-matching search returns clean empty results array without crashing');
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Grep Input Handling (Short/Empty Query Graceful Fallback)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 4. VERIFY GREP INPUT HANDLING');
  {
    const resTooShort = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}&q=a`,
      'GET',
      token
    );
    assert.strictEqual(resTooShort.status, 200, 'Query under 2 characters must return 200 OK');
    assert.deepStrictEqual(resTooShort.body?.results, [], 'Query under 2 characters must return empty results array');
    pass('Grep endpoint gracefully returns empty results for short/empty query');
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Grep Sandbox Path Traversal Defense
  // ---------------------------------------------------------------------------
  console.log('\n>>> 5. VERIFY GREP PATH TRAVERSAL DEFENSE');
  {
    const resTraversal1 = await requestJson(
      `/api/files/grep?p=../../../../etc&q=root`,
      'GET',
      token
    );
    assert.strictEqual(resTraversal1.status, 403, 'Path traversal in p must return 403 Forbidden');

    const resTraversal2 = await requestJson(
      `/api/files/grep?p=${encodeURIComponent(testDirRel)}/../../../../etc&q=root`,
      'GET',
      token
    );
    assert.strictEqual(resTraversal2.status, 403, 'Nested traversal in p must return 403 Forbidden');
    pass('Grep endpoint enforces safeResolve sandbox boundary and returns 403 on traversal');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Batch Replace in Files (POST /api/files/replace-in-files)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 6. VERIFY BATCH REPLACE IN FILES (POST /api/files/replace-in-files)');
  {
    const replaceRes = await requestJson(
      '/api/files/replace-in-files',
      'POST',
      token,
      {
        p: testDirRel,
        q: 'NEBUCODE_P11_SEARCH_TARGET',
        replaceWith: 'NEBUCODE_P11_REPLACED_VALUE',
        files: ['sample1.ts', 'nested/sample2.ts']
      }
    );

    assert.strictEqual(replaceRes.status, 200, 'Batch replace must return 200 OK');
    assert.strictEqual(replaceRes.body?.success, true, 'Response must indicate success');
    assert.strictEqual(replaceRes.body?.count, 2, 'Should have replaced 2 occurrences total');
    assert.strictEqual(replaceRes.body?.filesModified?.length, 2, 'Should have modified 2 files');

    // Verify directly on disk
    const content1 = await fs.readFile(file1Abs, 'utf8');
    assert(content1.includes('NEBUCODE_P11_REPLACED_VALUE'), 'sample1.ts must contain replaced string');
    assert(!content1.includes('NEBUCODE_P11_SEARCH_TARGET'), 'sample1.ts must no longer contain target string');

    const content2 = await fs.readFile(file2Abs, 'utf8');
    assert(content2.includes('NEBUCODE_P11_REPLACED_VALUE'), 'sample2.ts must contain replaced string');

    pass('Batch replace updates target files on disk and returns accurate modification counts');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Replace-in-Files Sandbox Traversal Defense
  // ---------------------------------------------------------------------------
  console.log('\n>>> 7. VERIFY REPLACE-IN-FILES PATH TRAVERSAL DEFENSE');
  {
    // Traversal in root path p
    const resTraversalRoot = await requestJson(
      '/api/files/replace-in-files',
      'POST',
      token,
      {
        p: '../../../../etc',
        q: 'root',
        replaceWith: 'hacked',
        files: ['passwd']
      }
    );
    assert.strictEqual(resTraversalRoot.status, 403, 'Traversal in p parameter must return 403');

    // Traversal in files array
    const resTraversalFile = await requestJson(
      '/api/files/replace-in-files',
      'POST',
      token,
      {
        p: testDirRel,
        q: 'root',
        replaceWith: 'hacked',
        files: ['../../../../etc/passwd']
      }
    );
    assert.strictEqual(resTraversalFile.status, 403, 'Traversal in files array must return 403');
    pass('Replace-in-files endpoint strictly rejects path traversal with 403 Forbidden');
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Replace-in-Files Validation
  // ---------------------------------------------------------------------------
  console.log('\n>>> 8. VERIFY REPLACE-IN-FILES INPUT VALIDATION');
  {
    const resMissingQ = await requestJson(
      '/api/files/replace-in-files',
      'POST',
      token,
      {
        p: testDirRel,
        replaceWith: 'bar',
        files: ['sample1.ts']
      }
    );
    assert.strictEqual(resMissingQ.status, 400, 'Missing search string q must return 400');

    const resEmptyFiles = await requestJson(
      '/api/files/replace-in-files',
      'POST',
      token,
      {
        p: testDirRel,
        q: 'foo',
        replaceWith: 'bar',
        files: []
      }
    );
    assert.strictEqual(resEmptyFiles.status, 400, 'Empty files array must return 400');
    pass('Replace-in-files validates required fields (p, q, files)');
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Frontend Source Contracts Validation (CodeApp.tsx)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 9. VERIFY CODEAPP FRONTEND WORKFLOW CONTRACTS');
  {
    const codeAppPath = path.resolve(__dirname, '../web/src/apps/code/CodeApp.tsx');
    const codeAppContent = await fs.readFile(codeAppPath, 'utf8');

    // 1. Workspace-wide Search & Replace integration
    assert(codeAppContent.includes('/api/files/grep'), 'CodeApp must call /api/files/grep');
    assert(codeAppContent.includes('/api/files/replace-in-files'), 'CodeApp must call /api/files/replace-in-files');
    assert(codeAppContent.includes('replaceConfirmModal'), 'CodeApp must render replace confirmation modal');

    // 2. State & Workspace Persistence
    assert(codeAppContent.includes('nebucode_recent_files_') || codeAppContent.includes("'recent_files'"), 'CodeApp must persist recentFiles in localStorage/safeStorage');
    assert(codeAppContent.includes('nebucode_split_file_') || codeAppContent.includes("'split_file'"), 'CodeApp must persist splitFile in localStorage/safeStorage');
    assert(codeAppContent.includes('nebucode_split_orient_') || codeAppContent.includes("'split_orient'"), 'CodeApp must persist splitOrientation in localStorage/safeStorage');
    assert(codeAppContent.includes('nebucode_expanded_') || codeAppContent.includes("'expanded'"), 'CodeApp must persist expandedPaths in localStorage/safeStorage');

    // 3. Tab Ergonomics
    assert(codeAppContent.includes('onWheel='), 'CodeApp tabs must implement onWheel for horizontal scrolling');
    assert(codeAppContent.includes('onAuxClick='), 'CodeApp tabs must implement onAuxClick for middle-click close');

    // 4. Keyboard Navigation in Quick Open
    assert(codeAppContent.includes("e.key === 'ArrowDown'"), 'Quick Open must support ArrowDown navigation');
    assert(codeAppContent.includes("e.key === 'ArrowUp'"), 'Quick Open must support ArrowUp navigation');

    // 5. Line-Level Code Navigation
    assert(codeAppContent.includes('revealLineInCenter'), 'CodeApp must jump and center Monaco lines');
    assert(codeAppContent.includes('setPosition'), 'CodeApp must set Monaco cursor position');

    // 6. Integrated Terminal DOM Retention
    assert(codeAppContent.includes("display: activeTermId === t.id"), 'IntegratedTerminal must retain DOM state on tab switch');

    // 7. Global IDE Shortcuts
    assert(codeAppContent.includes("isCmd && e.shiftKey && (e.key === 'f' || e.key === 'F')"), 'CodeApp must handle Ctrl+Shift+F shortcut');
    assert(codeAppContent.includes("isCmd && e.shiftKey && (e.key === 'e' || e.key === 'E')"), 'CodeApp must handle Ctrl+Shift+E shortcut');
    assert(codeAppContent.includes("isCmd && !e.shiftKey && (e.key === 'p' || e.key === 'P')"), 'CodeApp must handle Ctrl+P shortcut');

    pass('CodeApp.tsx implements all 7 core developer workflow ergonomics and persistence contracts');
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  try {
    await fs.rm(testDirAbs, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  console.log(`  P11 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('P11 Suite crashed:', err);
  process.exit(1);
});
