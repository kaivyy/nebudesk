import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.ts';
import { isUrlAllowed } from './src/urlValidator.ts';
import assert from 'assert';

async function main() {
  await initDb();
  const secretRow = await dbGet("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const app = Fastify();
  await app.register(jwt, { secret: secretRow.value });

  const tokenA = app.jwt.sign({ id: 'user-a', username: 'alice' });
  const tokenB = app.jwt.sign({ id: 'user-b', username: 'bob' });

  console.log('=== P5 HARDENING & MULTI-USER VERIFICATION SUITE ===');

  // Test 1: Filesystem Sandbox on /api/files/content
  console.log('Test 1: Filesystem sandbox on /api/files/content...');
  const resPasswd = await fetch('http://127.0.0.1:3030/api/files/content?p=/etc/passwd', {
    headers: { 'Cookie': `token=${tokenA}` }
  });
  assert.strictEqual(resPasswd.status, 403, 'Reading /etc/passwd must be 403 Forbidden');
  console.log('PASS: /etc/passwd blocked with 403 Forbidden');

  const resTraversal = await fetch('http://127.0.0.1:3030/api/files/content?p=../../etc/shadow', {
    headers: { 'Cookie': `token=${tokenA}` }
  });
  assert.strictEqual(resTraversal.status, 403, 'Traversal ../../etc/shadow must be 403 Forbidden');
  console.log('PASS: Traversal ../../etc/shadow blocked with 403 Forbidden');

  // Test 2: SSRF Validator Hardening (IPv6 & IPv4-mapped)
  console.log('Test 2: SSRF Validator edge cases...');
  assert.strictEqual((await isUrlAllowed('http://[::ffff:127.0.0.1]')).allowed, false, 'IPv4-mapped loopback must be blocked');
  assert.strictEqual((await isUrlAllowed('http://[::ffff:7f00:1]')).allowed, false, 'IPv4-mapped hex loopback must be blocked');
  assert.strictEqual((await isUrlAllowed('http://[::]')).allowed, false, 'IPv6 unspecified must be blocked');
  assert.strictEqual((await isUrlAllowed('http://169.254.169.254')).allowed, false, 'Metadata IP must be blocked');
  assert.strictEqual((await isUrlAllowed('https://google.com')).allowed, true, 'Valid external URL must be allowed');
  console.log('PASS: All SSRF edge cases blocked correctly');

  // Test 3: Command Injection Protection in Service Logs & Discovery Action
  console.log('Test 3: Command injection validation in backend endpoints...');
  const resCmd = await fetch('http://127.0.0.1:3030/api/services/logs?name=test;reboot', {
    headers: { 'Cookie': `token=${tokenA}` }
  });
  assert.strictEqual(resCmd.status, 400, 'Service name with semicolon must be rejected with 400');

  const resAction = await fetch('http://127.0.0.1:3030/api/discovery/action', {
    method: 'POST',
    headers: { 'Cookie': `token=${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ runtime: 'pm2', action: 'restart; id', identifier: 'myapp' })
  });
  assert.strictEqual(resAction.status, 400, 'Malicious action must be rejected with 400');
  console.log('PASS: Command injection vectors rejected with 400 Bad Request');

  // Test 4: Multi-User Document & State Isolation
  console.log('Test 4: Multi-User Isolation (User A vs User B)...');
  // User A creates a document
  const createDocRes = await fetch('http://127.0.0.1:3030/api/docs', {
    method: 'POST',
    headers: { 'Cookie': `token=${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Private Doc', type: 'doc' })
  });
  assert.strictEqual(createDocRes.status, 200);
  const createdDoc = await createDocRes.json();

  // User B tries to read Alice's doc
  const bobReadRes = await fetch(`http://127.0.0.1:3030/api/docs/${createdDoc.id}`, {
    headers: { 'Cookie': `token=${tokenB}` }
  });
  assert.strictEqual(bobReadRes.status, 404, 'User B must not access User A document');

  // User B tries to edit Alice's doc
  const bobEditRes = await fetch(`http://127.0.0.1:3030/api/docs/${createdDoc.id}`, {
    method: 'PUT',
    headers: { 'Cookie': `token=${tokenB}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Tampered by Bob' })
  });
  assert.strictEqual(bobEditRes.status, 200); // returns { success: true } but doesn't modify because WHERE userId = ?

  // Verify Alice's doc was untouched
  const aliceVerifyRes = await fetch(`http://127.0.0.1:3030/api/docs/${createdDoc.id}`, {
    headers: { 'Cookie': `token=${tokenA}` }
  });
  const aliceDoc = await aliceVerifyRes.json();
  assert.strictEqual(aliceDoc.content, '', 'Alice doc must remain empty (untampered)');

  // Clean up Alice's doc
  await fetch(`http://127.0.0.1:3030/api/docs/${createdDoc.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': `token=${tokenA}` }
  });
  console.log('PASS: Multi-user document access strictly isolated');

  console.log('=== P5 VERIFICATION SUITE PASSED ===');
}

main().catch(e => {
  console.error('P5 VERIFICATION FAILED:', e);
  process.exit(1);
});
