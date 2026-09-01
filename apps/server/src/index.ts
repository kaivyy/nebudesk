import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fs from 'fs/promises';
import path from 'path';
import * as pty from 'node-pty';
import si from 'systeminformation';
import Docker from 'dockerode';
import { exec } from 'child_process';
import util from 'util';
import bcrypt from 'bcrypt';
import { initDb, dbGet, dbRun, dbAll } from './db.js';

import registerExtensions from './api_extensions.js';
import { syncProxyConfig, syncCloudflareDNS } from './proxy.js';

const execAsync = util.promisify(exec);
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

const fastify = Fastify({ logger: true });
await fastify.register(cors, { 
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});
await fastify.register(websocket);
await fastify.register(jwt, { secret: 'nebudesk-super-secret' });
await fastify.register(cookie);

await initDb();

fastify.decorate('authenticate', async (request: any, reply: any) => {
  try {
    const token = request.cookies.token;
    if (!token) throw new Error('No token');
    const decoded = fastify.jwt.verify(token || '');
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

const ALLOWED_ROOT = '/';

fastify.post('/api/auth/login', async (request, reply) => {
  const { username, password } = request.body as any;
  const user: any = await dbGet(`SELECT * FROM User WHERE username = ?`, [username]);
  if (!user) return reply.status(401).send({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });
  
  const token = fastify.jwt.sign({ id: user.id, username: user.username });
  reply.setCookie('token', token, {
    path: '/',
    httpOnly: true,
    secure: false, // in prod use true
    sameSite: 'lax'
  });
  return { success: true };
});

fastify.post('/api/auth/logout', async (request, reply) => {
  reply.clearCookie('token', { path: '/' });
  return { success: true };
});

fastify.get('/api/desktop', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const state = await dbGet(`SELECT * FROM DesktopState WHERE userId = ?`, [request.user.id]);
  return state;
});

fastify.patch('/api/desktop', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { windowsJson } = request.body as any;
  console.log('PATCH /api/desktop', windowsJson);
  await dbRun(`UPDATE DesktopState SET windowsJson = ? WHERE userId = ?`, [windowsJson, request.user.id]);
  return { success: true };
});

fastify.get('/api/files', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p = '/' } = request.query as { p: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  
  try {
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    return Promise.all(items.map(async item => {
      const isDir = item.isDirectory();
      let size = 0;
      if (!isDir) {
        try { const st = await fs.stat(path.join(targetPath, item.name)); size = st.size; } catch(e){}
      }
      return { name: item.name, isDir, size };
    }));
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/files/content', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    return { content };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.put('/api/files/content', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, content } = request.body as { p: string; content: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    await fs.writeFile(targetPath, content, 'utf-8');
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/files/download', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    const stream = require('fs').createReadStream(targetPath);
    return reply.type('application/octet-stream').send(stream);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/files/folder', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const targetDir = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  const targetPath = path.join(targetDir, name.replace(/\//g, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    await fs.mkdir(targetPath);
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/files/file', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const targetDir = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  const targetPath = path.join(targetDir, name.replace(/\//g, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  try {
    await fs.writeFile(targetPath, '');
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.delete('/api/files', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT) || targetPath === ALLOWED_ROOT) return reply.status(403).send({ error: 'Forbidden' });
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/ws/terminal', { websocket: true }, (connection: any, req) => {
  // Simple token check for WS
  const cookies = (req.headers.cookie || '').split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (!tokenCookie) {
    connection.close();
    return;
  }
  const token = tokenCookie.split('=')[1];
  try {
    fastify.jwt.verify(token || "");
  } catch (e) {
    connection.close();
    return;
  }

  const termId = (req.query as any).termId || 'default';
  const sessionName = `nebudesk_term_${termId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', sessionName], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || '/',
    env: process.env as Record<string, string>
  });

  ptyProcess.onData((data) => {
    connection.send(JSON.stringify({ type: 'terminal.output', data }));
  });

  connection.on('message', (message: any) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'terminal.input') {
        ptyProcess.write(msg.data);
      } else if (msg.type === 'terminal.resize') {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    } catch (e) {}
  });

  connection.on('close', () => {
    ptyProcess.kill();
  });
});

fastify.get('/api/system', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const [cpu, mem, fsSize, net, load, osInfo] = await Promise.all([
      si.cpu(), si.mem(), si.fsSize(), si.networkInterfaces(), si.currentLoad(), si.osInfo()
    ]);
    return {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      memory: { active: mem.active, total: mem.total },
      storage: fsSize.filter(fs => !fs.mount.includes("/var/lib/docker/overlay2") && !fs.mount.startsWith("/run") && !fs.mount.startsWith("/sys") && !fs.mount.includes("snap")).map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size })),
      os: { platform: osInfo.platform, distro: osInfo.distro, release: osInfo.release, kernel: osInfo.kernel, arch: osInfo.arch, hostname: osInfo.hostname },
      cpuInfo: { brand: cpu.brand, cores: cpu.cores, physicalCores: cpu.physicalCores, speed: cpu.speed },
      network: (Array.isArray(net) ? net : [net]).map(n => ({ iface: n.iface, ip4: n.ip4, ip6: n.ip6, mac: n.mac }))
    };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/processes', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const processes = await si.processes();
    return processes.list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem,
      user: p.user,
      state: p.state
    })).slice(0, 100);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/processes/kill', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { pid } = request.body as { pid: number };
  if (!pid) return reply.status(400).send({ error: 'PID is required' });
  try {
    process.kill(pid, 'SIGKILL');
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});


fastify.get('/api/pm2/apps', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    return JSON.parse(stdout);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/docker/containers', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers;
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/services', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { stdout } = await execAsync('systemctl list-units --type=service --all --output=json');
    const parsed = JSON.parse(stdout);
    const services = parsed.map((s: any) => ({
      name: s.unit,
      load: s.load,
      active: s.active,
      sub: s.sub,
      desc: s.description
    }));
    return services;
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/services/logs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { name } = request.query as { name: string };
  if (!name) return reply.status(400).send({ error: 'Service name required' });
  try {
    const { stdout } = await execAsync(`journalctl -u ${name} -n 100 --no-pager`);
    return { logs: stdout };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

// Settings API
fastify.get('/api/settings', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT key, value FROM Settings');
});
fastify.post('/api/settings', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { key, value } = request.body;
  await dbRun('INSERT INTO Settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [key, value, value]);
  return { success: true };
});

// Applications API (Control Panel)
fastify.post('/api/discovery/action', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { runtime, identifier, action } = request.body;
  try {
    if (runtime === 'docker') {
      const container = docker.getContainer(identifier);
      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();
    } else if (runtime === 'pm2') {
      await execAsync(`pm2 ${action} ${identifier}`);
    }
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/discovery/logs', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { runtime, identifier } = request.query;
  try {
    let logs = '';
    if (runtime === 'docker') {
      const container = docker.getContainer(identifier);
      const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = logBuffer.toString('utf-8').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
    } else if (runtime === 'pm2') {
      const { stdout } = await execAsync(`pm2 logs ${identifier} --lines 100 --nostream`);
      logs = stdout;
    }
    return { logs };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/applications/:id/action', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  const { action } = request.body; // 'start' | 'stop' | 'restart'
  const app: any = await dbGet('SELECT * FROM Applications WHERE id = ?', [id]);
  if (!app) return reply.status(404).send({ error: 'App not found' });

  try {
    if (app.runtime === 'docker') {
      const container = docker.getContainer(app.identifier);
      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();
    } else if (app.runtime === 'pm2') {
      await execAsync(`pm2 ${action} ${app.identifier}`);
    } else if (app.runtime === 'systemd') {
      await execAsync(`sudo systemctl ${action} ${app.identifier}`);
    }
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/applications/:id/logs', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  const app: any = await dbGet('SELECT * FROM Applications WHERE id = ?', [id]);
  if (!app) return reply.status(404).send({ error: 'App not found' });

  try {
    let logs = '';
    if (app.runtime === 'docker') {
      const container = docker.getContainer(app.identifier);
      const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = logBuffer.toString('utf-8').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ''); // strip docker multiplex headers roughly
    } else if (app.runtime === 'pm2') {
      const { stdout } = await execAsync(`pm2 logs ${app.identifier} --lines 100 --nostream`);
      logs = stdout;
    } else if (app.runtime === 'systemd') {
      const { stdout } = await execAsync(`journalctl -u ${app.identifier} -n 100 --no-pager`);
      logs = stdout;
    }
    return { logs };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/applications', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT * FROM Applications ORDER BY createdAt DESC');
});

fastify.post('/api/applications', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { name, runtime, identifier, internalHost = '127.0.0.1', internalPort, publicDomain, proxyEnabled = 0, cfEnabled = 0 } = request.body;
  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO Applications (id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled]
  );
  
  if (proxyEnabled) await syncProxyConfig();
  if (cfEnabled) await syncCloudflareDNS(publicDomain, 'create');
  
  return { success: true, id };
});

fastify.put('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  const { name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled } = request.body;
  await dbRun(
    `UPDATE Applications 
     SET name = ?, runtime = ?, identifier = ?, internalHost = ?, internalPort = ?, publicDomain = ?, proxyEnabled = ?, cfEnabled = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled, id]
  );
  
  await syncProxyConfig(); // Re-sync always in case it was disabled
  if (cfEnabled) {
    await syncCloudflareDNS(publicDomain, 'create');
  } else {
    // If we want to clean up we could, but skipping delete for safety
  }
  
  return { success: true };
});

fastify.delete('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  
  const app: any = await dbGet('SELECT * FROM Applications WHERE id = ?', [id]);
  await dbRun('DELETE FROM Applications WHERE id = ?', [id]);
  
  if (app) {
    await syncProxyConfig();
    if (app.cfEnabled) await syncCloudflareDNS(app.publicDomain, 'delete');
  }
  return { success: true };
});

registerExtensions(fastify, ALLOWED_ROOT);

// Documents API
fastify.get('/api/docs', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { type } = request.query as { type?: string };
  const docs = await dbAll(
    type ? `SELECT id, name, type, updatedAt FROM Documents WHERE userId = ? AND type = ? ORDER BY updatedAt DESC` : `SELECT id, name, type, updatedAt FROM Documents WHERE userId = ? ORDER BY updatedAt DESC`,
    type ? [request.user.id, type] : [request.user.id]
  );
  return docs;
});

fastify.post('/api/docs', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { name, type } = request.body as { name: string; type: string };
  const id = crypto.randomUUID();
  await dbRun(`INSERT INTO Documents (id, userId, name, type, content) VALUES (?, ?, ?, ?, ?)`, [id, request.user.id, name, type, '']);
  return { id, name, type };
});

fastify.get('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const doc = await dbGet(`SELECT * FROM Documents WHERE id = ? AND userId = ?`, [id, request.user.id]);
  if (!doc) return reply.status(404).send({ error: 'Not found' });
  return doc;
});

fastify.put('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const { content, name } = request.body as { content?: string; name?: string };
  if (content !== undefined) await dbRun(`UPDATE Documents SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`, [content, id, request.user.id]);
  if (name !== undefined) await dbRun(`UPDATE Documents SET name = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`, [name, id, request.user.id]);
  return { success: true };
});

fastify.delete('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  await dbRun(`DELETE FROM Documents WHERE id = ? AND userId = ?`, [id, request.user.id]);
  return { success: true };
});

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Backend listening at ${address}`);
});

fastify.post('/api/files/rename', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { oldPath, newPath } = request.body as { oldPath: string; newPath: string };
  const resolvedOld = path.resolve(ALLOWED_ROOT, oldPath.replace(/^\//, ''));
  const resolvedNew = path.resolve(ALLOWED_ROOT, newPath.replace(/^\//, ''));
  if (!resolvedOld.startsWith(ALLOWED_ROOT) || !resolvedNew.startsWith(ALLOWED_ROOT)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  try {
    await fs.rename(resolvedOld, resolvedNew);
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
