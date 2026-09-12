import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.ts';
import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  await initDb();
  const secretRow = await dbGet("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const app = Fastify();
  await app.register(jwt, { secret: secretRow.value });
  const token = app.jwt.sign({ id: '8a9074ed-be0e-4eef-a41f-2e201b71a70e', username: 'admin' });
  
  const headers = {
    'Cookie': `token=${token}`,
    'Content-Type': 'application/json'
  };

  console.log('=== P2 VERIFICATION SUITE ===');

  // Test 1: Query dev-servers with invalid workspace (traversal)
  console.log('Test 1: Path traversal protection in workspace parameter...');
  let res = await fetch('http://127.0.0.1:3030/api/dev-servers?workspace=/etc', { headers });
  console.log('Status for /etc:', res.status);
  if (res.status !== 403) {
    console.error('FAIL: /etc should return 403 Forbidden');
  } else {
    console.log('PASS: Path traversal rejected with 403');
  }

  // Test 2: Unrelated process in /tmp
  console.log('Test 2: Unrelated process in /tmp not claimed by workspace...');
  const tmpDir = '/tmp/unrelated-p2-test';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const tmpPort = 39124;
  const childTmp = spawn('node', ['-e', `
    const http = require('http');
    http.createServer((req, res) => res.end('tmp')).listen(${tmpPort}, '127.0.0.1');
  `], { cwd: tmpDir });
  await new Promise(r => setTimeout(r, 1000));

  res = await fetch('http://127.0.0.1:3030/api/dev-servers?workspace=/root/nebudesk', { headers });
  let data = await res.json();
  let foundTmp = (data.servers || []).some((s: any) => s.port === String(tmpPort));
  console.log('Tmp port found in /root/nebudesk query?:', foundTmp);
  if (foundTmp) {
    console.error('FAIL: Unrelated process in /tmp was claimed by /root/nebudesk!');
  } else {
    console.log('PASS: Unrelated process in /tmp not included');
  }

  // Test 3: Process in workspace is detected
  console.log('Test 3: Dev server running in workspace is detected...');
  const workspaceDir = '/root/nebudesk';
  const dummyPort2 = 39125;
  const child2 = spawn('node', ['-e', `
    const http = require('http');
    http.createServer((req, res) => res.end('nebudesk')).listen(${dummyPort2}, '127.0.0.1');
  `], { cwd: workspaceDir });
  await new Promise(r => setTimeout(r, 1000));

  res = await fetch(`http://127.0.0.1:3030/api/dev-servers?workspace=${encodeURIComponent(workspaceDir)}`, { headers });
  data = await res.json();
  let foundWorkspaceSrv = (data.servers || []).find((s: any) => s.port === String(dummyPort2));
  console.log('Workspace server found?:', !!foundWorkspaceSrv, foundWorkspaceSrv);
  if (!foundWorkspaceSrv) {
    console.error('FAIL: Workspace dev server was not detected!');
  } else {
    console.log('PASS: Workspace dev server detected with PID and port');
  }

  // Test 4: Sibling prefix path isolation (/root/nebudesk vs /root/nebudesk-other)...
  console.log('Test 4: Sibling prefix path isolation (/root/nebudesk vs /root/nebudesk-other)...');
  const siblingDir = '/root/nebudesk-sibling-test';
  if (!fs.existsSync(siblingDir)) fs.mkdirSync(siblingDir, { recursive: true });
  const dummyPort3 = 39126;
  const child3 = spawn('node', ['-e', `
    const http = require('http');
    http.createServer((req, res) => res.end('sibling')).listen(${dummyPort3}, '127.0.0.1');
  `], { cwd: siblingDir });
  await new Promise(r => setTimeout(r, 1000));

  res = await fetch(`http://127.0.0.1:3030/api/dev-servers?workspace=${encodeURIComponent(workspaceDir)}`, { headers });
  data = await res.json();
  let foundSibling = (data.servers || []).some((s: any) => s.port === String(dummyPort3));
  console.log('Sibling server claimed by /root/nebudesk?:', foundSibling);
  if (foundSibling) {
    console.error('FAIL: Sibling directory server falsely claimed due to prefix matching!');
  } else {
    console.log('PASS: Sibling directory server correctly isolated');
  }

  // Test 5: Stale state test (kill process, verify port disappears)
  console.log('Test 5: Stale port cleanup upon process termination...');
  child2.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 1000));
  res = await fetch(`http://127.0.0.1:3030/api/dev-servers?workspace=${encodeURIComponent(workspaceDir)}`, { headers });
  data = await res.json();
  let stillFound = (data.servers || []).some((s: any) => s.port === String(dummyPort2));
  console.log('Killed server still present?:', stillFound);
  if (stillFound) {
    console.error('FAIL: Stale server still returned after process exit');
  } else {
    console.log('PASS: Stale server disappears when process terminates');
  }

  // Test 6: Kill Process Authorization / Protection
  console.log('Test 6: Process kill protection (cannot kill PID 1 or outside workspace)...');
  const killPid1 = await fetch('http://127.0.0.1:3030/api/processes/kill', {
    method: 'POST',
    headers,
    body: JSON.stringify({ pid: 1 })
  });
  console.log('Kill PID 1 status:', killPid1.status);
  if (killPid1.status !== 403) {
    console.error('FAIL: Killing PID 1 should be 403 Forbidden!');
  } else {
    console.log('PASS: Killing PID 1 forbidden');
  }

  // Test killing process outside allowed root (/tmp)
  const killTmp = await fetch('http://127.0.0.1:3030/api/processes/kill', {
    method: 'POST',
    headers,
    body: JSON.stringify({ pid: childTmp.pid })
  });
  console.log('Kill process in /tmp status:', killTmp.status);
  if (killTmp.status !== 403) {
    console.error('FAIL: Killing process outside allowed root should be 403!');
  } else {
    console.log('PASS: Killing process outside root forbidden');
  }

  // Cleanup
  childTmp.kill('SIGKILL');
  child3.kill('SIGKILL');
  try { fs.rmdirSync(tmpDir); } catch(e) {}
  try { fs.rmdirSync(siblingDir); } catch(e) {}

  console.log('=== VERIFICATION RUN COMPLETE ===');
}

main().catch(console.error);
