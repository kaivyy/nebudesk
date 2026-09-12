import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { safeResolve, ALLOWED_ROOT } from './src/pathUtils.js';
import WebSocket from 'ws';
import assert from 'assert';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface P10Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P10Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P10: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P10: ${testName}`, err);
  throw new Error(`P10 Test Failed: ${testName} -> ${err}`);
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
  console.log('  NEBUDESK P10: NEBUCODE IDE UX & ENDPOINT VERIFICATION SUITE   ');
  console.log('================================================================');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });

  const token = fastifyApp.jwt.sign({ id: 'p10_tester', username: 'p10_tester' }, { expiresIn: '1h' });

  const testDirRel = 'p10_ide_verification';
  const testDirAbs = path.join(ALLOWED_ROOT, testDirRel);

  // Clean up any previous test artifacts
  try {
    await fs.rm(testDirAbs, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(testDirAbs, { recursive: true });

  // ---------------------------------------------------------------------------
  // TEST 1: File Copy Functionality
  // ---------------------------------------------------------------------------
  console.log('\n>>> 1. VERIFY FILE COPY ENDPOINT (POST /api/files/copy)');
  {
    // Create source file
    const srcRel = path.join(testDirRel, 'source.txt');
    const destRel = path.join(testDirRel, 'source_copy.txt');
    const fileContent = 'Hello NebuCode IDE UX P10 - File Copy Content';

    const createRes = await requestJson('/api/files/file', 'POST', token, {
      p: testDirRel,
      name: 'source.txt'
    });
    assert.strictEqual(createRes.status, 200, 'Creating initial source file should succeed');

    const writeRes = await requestJson('/api/files/content', 'PUT', token, {
      p: srcRel,
      content: fileContent
    });
    assert.strictEqual(writeRes.status, 200, 'Writing initial source file content should succeed');

    // Perform copy
    const copyRes = await requestJson('/api/files/copy', 'POST', token, {
      src: srcRel,
      dest: destRel
    });
    assert.strictEqual(copyRes.status, 200, 'POST /api/files/copy should return 200 OK');
    assert.strictEqual(copyRes.body?.success, true, 'Copy response should indicate success');

    // Verify copy exists and has matching content
    const destAbs = path.join(ALLOWED_ROOT, destRel);
    const copiedContent = await fs.readFile(destAbs, 'utf8');
    assert.strictEqual(copiedContent, fileContent, 'Copied file content must match source file');
    pass('File copy creates identical replica at target path');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Directory Recursive Copy Functionality
  // ---------------------------------------------------------------------------
  console.log('\n>>> 2. VERIFY RECURSIVE DIRECTORY COPY');
  {
    const subFolderRel = path.join(testDirRel, 'nested_dir');
    const subFolderDestRel = path.join(testDirRel, 'nested_dir_copy');

    await requestJson('/api/files/folder', 'POST', token, {
      p: testDirRel,
      name: 'nested_dir'
    });
    await requestJson('/api/files/file', 'POST', token, {
      p: subFolderRel,
      name: 'inner.json'
    });
    await requestJson('/api/files/content', 'PUT', token, {
      p: path.join(subFolderRel, 'inner.json'),
      content: JSON.stringify({ ide: 'NebuCode', version: 'P10' })
    });

    const copyDirRes = await requestJson('/api/files/copy', 'POST', token, {
      src: subFolderRel,
      dest: subFolderDestRel
    });
    assert.strictEqual(copyDirRes.status, 200, 'POST /api/files/copy directory should return 200');

    const innerFileAbs = path.join(ALLOWED_ROOT, subFolderDestRel, 'inner.json');
    const innerContent = await fs.readFile(innerFileAbs, 'utf8');
    assert.strictEqual(JSON.parse(innerContent).version, 'P10', 'Nested copied files must be intact');
    pass('Directory recursive copy properly duplicates entire subtree');
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Copy Security Sandbox Protection (Anti-Path Traversal)
  // ---------------------------------------------------------------------------
  console.log('\n>>> 3. VERIFY COPY SECURITY SANDBOX PROTECTION');
  {
    // Escape on src
    const traversalSrcRes = await requestJson('/api/files/copy', 'POST', token, {
      src: '../../../../../../etc/passwd',
      dest: path.join(testDirRel, 'stolen_passwd.txt')
    });
    assert.strictEqual(traversalSrcRes.status, 403, 'Traversal src must return 403 Forbidden');

    // Escape on dest
    const traversalDestRes = await requestJson('/api/files/copy', 'POST', token, {
      src: path.join(testDirRel, 'source.txt'),
      dest: '../../../../../../tmp/escaped_copy.txt'
    });
    assert.strictEqual(traversalDestRes.status, 403, 'Traversal dest must return 403 Forbidden');

    // Missing body fields
    const missingFieldsRes = await requestJson('/api/files/copy', 'POST', token, {
      src: path.join(testDirRel, 'source.txt')
    });
    assert.strictEqual(missingFieldsRes.status, 400, 'Missing dest parameter must return 400 Bad Request');

    pass('Sandbox prevents path traversal on both src and dest parameters');
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Rename & Move Operations
  // ---------------------------------------------------------------------------
  console.log('\n>>> 4. VERIFY FILE RENAME AND MOVE (POST /api/files/rename)');
  {
    const originalRel = path.join(testDirRel, 'source.txt');
    const renamedRel = path.join(testDirRel, 'renamed.txt');
    const movedRel = path.join(testDirRel, 'nested_dir', 'renamed_moved.txt');

    // Rename
    const renameRes = await requestJson('/api/files/rename', 'POST', token, {
      oldPath: originalRel,
      newPath: renamedRel
    });
    assert.strictEqual(renameRes.status, 200, 'Renaming file should return 200 OK');

    const renamedExists = fsSync.existsSync(path.join(ALLOWED_ROOT, renamedRel));
    const originalExists = fsSync.existsSync(path.join(ALLOWED_ROOT, originalRel));
    assert.ok(renamedExists && !originalExists, 'Renamed file exists and original file is removed');

    // Move
    const moveRes = await requestJson('/api/files/rename', 'POST', token, {
      oldPath: renamedRel,
      newPath: movedRel
    });
    assert.strictEqual(moveRes.status, 200, 'Moving file to subfolder should return 200 OK');
    assert.ok(fsSync.existsSync(path.join(ALLOWED_ROOT, movedRel)), 'Moved file exists in subfolder');

    // Traversal on rename
    const traversalRename = await requestJson('/api/files/rename', 'POST', token, {
      oldPath: movedRel,
      newPath: '../../../../../../tmp/hacked_rename.txt'
    });
    assert.strictEqual(traversalRename.status, 403, 'Rename traversal must return 403 Forbidden');

    pass('File rename and directory move operate correctly with strict path boundary');
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Integrated Terminal CWD Scoping
  // ---------------------------------------------------------------------------
  console.log('\n>>> 5. VERIFY INTEGRATED TERMINAL CWD SCOPING (/ws/terminal?cwd=...)');
  {
    const targetCwdRel = path.join(testDirRel, 'nested_dir');
    const targetCwdAbs = path.join(ALLOWED_ROOT, targetCwdRel);

    const termPromise = new Promise<void>((resolve, reject) => {
      const termWs = new WebSocket(`ws://127.0.0.1:3030/ws/terminal?termId=p10_cwd_${Date.now()}&cwd=${encodeURIComponent(targetCwdRel)}`, {
        headers: { Cookie: `token=${token}` }
      });

      let buffer = '';
      const timer = setTimeout(() => {
        termWs.terminate();
        reject(new Error(`Terminal CWD verification timed out. Output buffer: ${buffer}`));
      }, 7000);

      termWs.on('open', () => {
        setTimeout(() => {
          termWs.send(JSON.stringify({ type: 'terminal.input', data: 'pwd\n' }));
        }, 500);
      });

      termWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'terminal.output') {
            buffer += msg.data;
            if (buffer.includes(targetCwdRel) || buffer.includes('nested_dir')) {
              clearTimeout(timer);
              termWs.close();
              resolve();
            }
          }
        } catch {}
      });

      termWs.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    await termPromise;
    pass('Terminal WebSocket correctly initializes shell in requested target folder cwd');

    // Verify cwd path traversal fallback to ALLOWED_ROOT without crash
    const safeTraversalPromise = new Promise<void>((resolve, reject) => {
      const traversalWs = new WebSocket(`ws://127.0.0.1:3030/ws/terminal?termId=p10_safe_${Date.now()}&cwd=${encodeURIComponent('../../../../../../etc')}`, {
        headers: { Cookie: `token=${token}` }
      });

      let buffer = '';
      const timer = setTimeout(() => {
        traversalWs.terminate();
        reject(new Error('Traversal terminal timed out'));
      }, 7000);

      traversalWs.on('open', () => {
        setTimeout(() => {
          traversalWs.send(JSON.stringify({ type: 'terminal.input', data: 'pwd\n' }));
        }, 500);
      });

      traversalWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'terminal.output') {
            buffer += msg.data;
            if (buffer.includes('pwd')) {
              // Terminal is responsive and did NOT escape ALLOWED_ROOT
              assert.ok(!buffer.includes('/etc\r') && !buffer.includes('/etc\n'), 'Terminal should not cwd into /etc');
              clearTimeout(timer);
              traversalWs.close();
              resolve();
            }
          }
        } catch {}
      });

      traversalWs.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    await safeTraversalPromise;
    pass('Terminal cwd traversal attempts safely constrained to ALLOWED_ROOT');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: File Deletion & Cleanup
  // ---------------------------------------------------------------------------
  console.log('\n>>> 6. VERIFY FILE DELETION & SAFE CLEANUP');
  {
    const delRes = await requestJson(`/api/files?p=${encodeURIComponent(testDirRel)}`, 'DELETE', token);
    assert.strictEqual(delRes.status, 200, 'DELETE /api/files should return 200');
    assert.ok(!fsSync.existsSync(testDirAbs), 'Test directory must be completely removed');
    pass('DELETE /api/files properly cleans up target directory tree');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Frontend Source Static Contract Verification
  // ---------------------------------------------------------------------------
  console.log('\n>>> 7. VERIFY FRONTEND IDE UX IMPLEMENTATION CONTRACTS');
  {
    const codeAppFile = path.resolve(__dirname, '../web/src/apps/code/CodeApp.tsx');
    const codeAppSrc = await fs.readFile(codeAppFile, 'utf8');

    // 1. Context menu handlers on tree
    assert.ok(codeAppSrc.includes('onContextMenu?: (e: React.MouseEvent'), 'FileTreeNode must accept onContextMenu handler');
    assert.ok(codeAppSrc.includes('handleContextMenu = ('), 'CodeApp must implement handleContextMenu');
    assert.ok(codeAppSrc.includes('handleTabContextMenu = ('), 'CodeApp must implement handleTabContextMenu');

    // 2. Action implementations
    assert.ok(codeAppSrc.includes("setPromptModal({ type: 'file'"), 'Explorer must support New File action modal');
    assert.ok(codeAppSrc.includes("setPromptModal({ type: 'folder'"), 'Explorer must support New Folder action modal');
    assert.ok(codeAppSrc.includes('setRenameModal('), 'Explorer must support Rename action modal');
    assert.ok(codeAppSrc.includes('setDeleteModal('), 'Explorer must support Delete action modal');
    assert.ok(codeAppSrc.includes('handleCopy = ('), 'Explorer must support Copy action');
    assert.ok(codeAppSrc.includes('handleCut = ('), 'Explorer must support Cut action');
    assert.ok(codeAppSrc.includes('handlePaste = async ('), 'Explorer must support Paste action');
    assert.ok(codeAppSrc.includes('handleDuplicate = async ('), 'Explorer must support Duplicate action');
    assert.ok(codeAppSrc.includes('copyPath = ('), 'Explorer must support Copy Path action');
    assert.ok(codeAppSrc.includes('copyRelativePath = ('), 'Explorer must support Copy Relative Path action');
    assert.ok(codeAppSrc.includes('addTerminal(contextMenu.path)'), 'Explorer must support Open in Integrated Terminal action');

    // 3. Tab Context Menu
    assert.ok(codeAppSrc.includes('tabContextMenu'), 'CodeApp must implement tab context menu state');
    assert.ok(codeAppSrc.includes('closeOthers = ('), 'CodeApp must support Close Others');
    assert.ok(codeAppSrc.includes('closeToTheRight = ('), 'CodeApp must support Close to the Right');
    assert.ok(codeAppSrc.includes('closeSaved = ('), 'CodeApp must support Close Saved');
    assert.ok(codeAppSrc.includes('closeAll = ('), 'CodeApp must support Close All');

    // 4. Split Editor
    assert.ok(codeAppSrc.includes('splitFile'), 'CodeApp must maintain splitFile state');
    assert.ok(codeAppSrc.includes('splitOrientation'), 'CodeApp must support horizontal and vertical split orientation');
    assert.ok(codeAppSrc.includes('splitEditorRef'), 'CodeApp must maintain split editor reference');

    // 5. Global Keyboard Shortcuts
    assert.ok(codeAppSrc.includes("isCmd && e.key === 'w'"), 'CodeApp must support Ctrl+W / Cmd+W to close active tab');
    assert.ok(codeAppSrc.includes("isCmd && e.key === 'b'"), 'CodeApp must support Ctrl+B / Cmd+B to toggle sidebar');
    assert.ok(codeAppSrc.includes("isCmd && e.key === '`'"), 'CodeApp must support Ctrl+` / Cmd+` to toggle terminal');
    assert.ok(codeAppSrc.includes("isCmd && e.key === '\\\\'"), 'CodeApp must support Ctrl+\\ / Cmd+\\ to split editor');
    assert.ok(codeAppSrc.includes("e.key === 'F2'"), 'CodeApp must support F2 to trigger rename');
    assert.ok(codeAppSrc.includes("e.key === 'Delete'"), 'CodeApp must support Delete to trigger file deletion');

    // 6. Command Palette
    assert.ok(codeAppSrc.includes("setQoQuery('>')"), 'QuickOpen must support > Command Palette mode');

    pass('Frontend CodeApp satisfies all IDE developer ergonomics and UX requirements');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  P10 VERIFICATION RESULT: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in P10 verification:', err);
  process.exit(1);
});
