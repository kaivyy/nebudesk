import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.ts';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import assert from 'assert';

async function main() {
  await initDb();
  const secretRow = await dbGet("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const app = Fastify();
  await app.register(jwt, { secret: secretRow.value });
  const token = app.jwt.sign({ id: '8a9074ed-be0e-4eef-a41f-2e201b71a70e', username: 'admin' });

  console.log('=== BROWSER INFRASTRUCTURE REMOVAL VERIFICATION ===');

  // Test 1: Verify /ws/browser is removed and fails to connect
  console.log('Test 1: Connecting to /ws/browser (should be rejected/closed)...');
  const ws = new WebSocket('ws://127.0.0.1:3030/ws/browser', {
    headers: { 'Cookie': `token=${token}` }
  });

  const wsRejected = await new Promise((resolve) => {
    ws.on('unexpected-response', (req, res) => {
      // 404 Not Found is expected because route was removed
      resolve(res.statusCode === 404);
    });
    ws.on('error', () => resolve(true));
    ws.on('close', () => resolve(true));
    setTimeout(() => resolve(false), 3000);
  });
  assert.strictEqual(wsRejected, true, '/ws/browser should not accept connections');
  console.log('PASS: /ws/browser route no longer exists (connection rejected)');

  // Test 2: Verify /api/browser/proxy returns 404
  console.log('Test 2: Requesting /api/browser/proxy (should return 404)...');
  const proxyRes = await fetch('http://127.0.0.1:3030/api/browser/proxy?url=http://example.com', {
    headers: { 'Cookie': `token=${token}` }
  });
  assert.strictEqual(proxyRes.status, 404, '/api/browser/proxy should return 404');
  console.log('PASS: /api/browser/proxy route returned 404 (removed)');

  // Test 3: Verify zero chromium/playwright processes running
  console.log('Test 3: Checking process tree for Chromium/Playwright...');
  let psOut = '';
  try {
    psOut = execSync('ps aux | grep -iE "chromium|playwright" | grep -v grep | grep -v verify_removal || true', { encoding: 'utf8' }).trim();
  } catch(e) {}
  assert.strictEqual(psOut, '', 'No Chromium or Playwright process should be running');
  console.log('PASS: Zero Chromium / Playwright processes running');

  console.log('=== BROWSER REMOVAL VERIFICATION PASSED ===');
}

main().catch(e => {
  console.error('VERIFICATION FAILED:', e);
  process.exit(1);
});
