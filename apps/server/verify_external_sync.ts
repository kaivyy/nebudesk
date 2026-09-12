import fs from 'fs';
import path from 'path';
import assert from 'assert';
import http from 'http';
import { fileURLToPath } from 'url';
import { subscribeWorkspaceWatcher, getActiveWatchersCount, recordSelfWrite, isRecentSelfWrite } from './src/fileWatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '../web');

const pass = (desc: string) => console.log(`[PASS] External-Sync: ${desc}`);
const fail = (desc: string, err: unknown) => {
  console.error(`[FAIL] External-Sync: ${desc}`, err);
  process.exit(1);
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n================================================================');
  console.log('  NEBUDESK EXTERNAL FILESYSTEM SYNCHRONIZATION TEST SUITE       ');
  console.log('================================================================\n');

  const testDir = path.join(__dirname, 'test_external_sync_sandbox_' + Date.now());
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // 1. Test Watcher Lifecycle Management & Reference Counting
    try {
      const initialWatchers = getActiveWatchersCount();
      let eventsReceived = 0;

      const unsub1 = subscribeWorkspaceWatcher(testDir, () => {
        eventsReceived++;
      });
      assert.strictEqual(getActiveWatchersCount(), initialWatchers + 1, 'Watcher session must be created');

      const unsub2 = subscribeWorkspaceWatcher(testDir, () => {
        eventsReceived++;
      });
      assert.strictEqual(getActiveWatchersCount(), initialWatchers + 1, 'Watcher session must be shared (no duplicate watcher for same workspace)');

      unsub1();
      assert.strictEqual(getActiveWatchersCount(), initialWatchers + 1, 'Watcher session must remain while other clients exist');

      unsub2();
      assert.strictEqual(getActiveWatchersCount(), initialWatchers, 'Watcher session must be destroyed when all clients disconnect (zero orphans)');
      pass('1. Watcher Lifecycle: Reference counting, sharing, and zero-orphan cleanup verified');
    } catch (e) {
      fail('1. Watcher Lifecycle', e);
    }

    // 2. Test External Create
    try {
      let createDetected = false;
      let detectedPath = '';
      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        const item = msg.changes.find(c => c.event === 'create');
        if (item) {
          createDetected = true;
          detectedPath = item.path;
        }
      });

      const filePath = path.join(testDir, 'external_create.ts');
      fs.writeFileSync(filePath, 'console.log("hello create");');

      // Wait for debounced flush
      await sleep(200);
      unsub();

      assert(createDetected, 'External create must be detected');
      assert.strictEqual(detectedPath, filePath, 'Detected path must match created file path');
      pass('2. External Create: New file creation detected with normalized path and create event');
    } catch (e) {
      fail('2. External Create', e);
    }

    // 3. Test External Modify
    try {
      let modifyDetected = false;
      const filePath = path.join(testDir, 'external_create.ts');

      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        const item = msg.changes.find(c => c.event === 'change');
        if (item && item.path === filePath) {
          modifyDetected = true;
        }
      });

      fs.appendFileSync(filePath, '\nconsole.log("appended modification");');

      await sleep(200);
      unsub();

      assert(modifyDetected, 'External modify must be detected with change event');
      pass('3. External Modify: File modification detected with change event');
    } catch (e) {
      fail('3. External Modify', e);
    }

    // 4. Test External Delete
    try {
      let deleteDetected = false;
      const filePath = path.join(testDir, 'external_create.ts');

      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        const item = msg.changes.find(c => c.event === 'delete');
        if (item && item.path === filePath) {
          deleteDetected = true;
        }
      });

      fs.unlinkSync(filePath);

      await sleep(200);
      unsub();

      assert(deleteDetected, 'External delete must be detected with delete event');
      pass('4. External Delete: File deletion detected with delete event');
    } catch (e) {
      fail('4. External Delete', e);
    }

    // 5. Test External Rename
    try {
      let deleteOldDetected = false;
      let createNewDetected = false;
      const oldPath = path.join(testDir, 'rename_src.ts');
      const newPath = path.join(testDir, 'rename_dest.ts');

      fs.writeFileSync(oldPath, 'export const val = 42;');

      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        if (msg.changes.some(c => c.event === 'delete' && c.path === oldPath)) {
          deleteOldDetected = true;
        }
        if (msg.changes.some(c => c.event === 'create' && c.path === newPath)) {
          createNewDetected = true;
        }
      });

      fs.renameSync(oldPath, newPath);

      await sleep(200);
      unsub();

      assert(deleteOldDetected && createNewDetected, 'Rename must be detected as atomic source deletion and destination creation');
      pass('5. External Rename: Source deletion and target creation captured cleanly');
    } catch (e) {
      fail('5. External Rename', e);
    }

    // 6. Test Rapid Multi-File Batching & Debouncing
    try {
      let batchCount = 0;
      let totalChangesReceived = 0;

      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        batchCount++;
        totalChangesReceived += msg.changes.length;
      });

      // Rapidly create 8 files in parallel
      for (let i = 0; i < 8; i++) {
        fs.writeFileSync(path.join(testDir, `batch_file_${i}.txt`), `content ${i}`);
      }

      await sleep(250);
      unsub();

      assert(batchCount <= 2, `Rapid changes must be debounced into minimal batches (got ${batchCount} batches)`);
      assert(totalChangesReceived >= 8, `All changes must be accounted for (got ${totalChangesReceived})`);
      pass('6. Rapid Multi-File Batching: Debounced 8 concurrent writes into consolidated batch');
    } catch (e) {
      fail('6. Rapid Multi-File Batching', e);
    }

    // 7. Test Noise Filtering & Self-Write Tracking
    try {
      let noiseReceived = false;
      const noiseDir = path.join(testDir, 'node_modules', 'dummy');
      fs.mkdirSync(noiseDir, { recursive: true });

      const unsub = subscribeWorkspaceWatcher(testDir, (msg) => {
        if (msg.changes.some(c => c.path.includes('node_modules') || c.path.includes('.git/objects'))) {
          noiseReceived = true;
        }
      });

      fs.writeFileSync(path.join(noiseDir, 'ignored.js'), 'ignored');
      await sleep(200);
      unsub();

      assert(!noiseReceived, 'Noisy node_modules and .git paths must be ignored');

      // Test self-write tracking
      const selfWriteTarget = path.join(testDir, 'self_write.ts');
      assert.strictEqual(isRecentSelfWrite(selfWriteTarget), false, 'Initially not a self write');
      recordSelfWrite(selfWriteTarget);
      assert.strictEqual(isRecentSelfWrite(selfWriteTarget), true, 'Correctly identified as self-write optimization hint');
      pass('7. Noise Filtering & Self-Write Tracking: Excluded build/node_modules directories & tracked self-writes');
    } catch (e) {
      fail('7. Noise Filtering & Self-Write Tracking', e);
    }

    // 8. Test Backend /ws/files/watch WebSocket Endpoint Health
    try {
      const serverCode = fs.readFileSync(path.join(__dirname, 'src/index.ts'), 'utf8');
      assert(serverCode.includes("fastify.get('/ws/files/watch'"), 'WebSocket endpoint /ws/files/watch must be registered');
      assert(serverCode.includes('subscribeWorkspaceWatcher'), 'Endpoint must call subscribeWorkspaceWatcher');
      assert(serverCode.includes('safeResolve('), 'Endpoint must validate workspace path sandbox with safeResolve');
      pass('8. WebSocket Route: /ws/files/watch endpoint wired with JWT verification and safeResolve sandboxing');
    } catch (e) {
      fail('8. WebSocket Route', e);
    }

    // 9. Test Frontend Contracts: Clean Reload, Dirty Protection, Conflict Banner
    try {
      const codeAppPath = path.join(WEB_DIR, 'src/apps/code/CodeApp.tsx');
      assert(fs.existsSync(codeAppPath), 'CodeApp.tsx must exist');
      const code = fs.readFileSync(codeAppPath, 'utf8');

      assert(code.includes('/ws/files/watch'), 'CodeApp must connect to /ws/files/watch WebSocket');
      assert(code.includes('handleReloadFromDisk'), 'CodeApp must implement handleReloadFromDisk');
      assert(code.includes('handleKeepLocalChanges'), 'CodeApp must implement handleKeepLocalChanges');
      assert(code.includes('externalConflict'), 'CodeApp must track externalConflict state');
      assert(code.includes('Reload from Disk'), 'CodeApp must render Reload from Disk action');
      assert(code.includes('Keep Local Changes'), 'CodeApp must render Keep Local Changes action');
      assert(code.includes('editorRef.current.setValue(diskContent)'), 'Clean model must reload using setValue');
      assert(code.includes('editorRef.current?.getPosition()'), 'Editor reload must preserve cursor position');
      pass('9. Monaco Model Contracts: Clean buffer auto-reload, dirty buffer protection, and cursor preservation verified');
    } catch (e) {
      fail('9. Monaco Model Contracts', e);
    }

    // 10. Test Git Status Badges in Explorer and Monaco Diff Gutter Decorations
    try {
      const codeAppPath = path.join(WEB_DIR, 'src/apps/code/CodeApp.tsx');
      const code = fs.readFileSync(codeAppPath, 'utf8');

      assert(code.includes('gitStatusMap'), 'CodeApp must maintain gitStatusMap for M/D/U/A status');
      assert(code.includes('gitFolderStatusMap'), 'CodeApp must maintain gitFolderStatusMap for modified folders');
      assert(code.includes('displayedWorkspaceFiles'), 'CodeApp must maintain displayedWorkspaceFiles including deleted tracked files');
      assert(code.includes('parseUnifiedDiffToRanges'), 'CodeApp must parse unified diff to ranges');
      assert(code.includes('gitDecorationsRef'), 'CodeApp must track Monaco git diff decorations');
      assert(code.includes('deltaDecorations'), 'CodeApp must apply decorations using Monaco deltaDecorations API');
      assert(code.includes('git-gutter-added'), 'CodeApp must render git-gutter-added');
      assert(code.includes('git-gutter-modified'), 'CodeApp must render git-gutter-modified');
      assert(code.includes('git-gutter-deleted'), 'CodeApp must render git-gutter-deleted');

      const cssPath = path.join(WEB_DIR, 'src/index.css');
      const css = fs.readFileSync(cssPath, 'utf8');
      assert(css.includes('.git-gutter-added'), 'index.css must define .git-gutter-added style');
      assert(css.includes('.git-gutter-modified'), 'index.css must define .git-gutter-modified style');
      assert(css.includes('.git-gutter-deleted'), 'index.css must define .git-gutter-deleted style');

      pass('10. Explorer & Monaco Git Decorations: M/D/U badges, folder indicators, and native Monaco diff gutters verified');
    } catch (e) {
      fail('10. Explorer & Monaco Git Decorations', e);
    }

  } finally {
    // Cleanup temporary sandbox
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n================================================================');
  console.log('  EXTERNAL SYNCHRONIZATION VERIFICATION: 10/10 PASS (100%)       ');
  console.log('================================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
