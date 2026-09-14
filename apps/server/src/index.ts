import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import * as pty from 'node-pty';
import si from 'systeminformation';
import Docker from 'dockerode';
import { execFile } from 'child_process';
import util from 'util';
import bcrypt from 'bcrypt';
import { initDb, dbGet, dbRun, dbAll } from './db.js';
import { safeResolve, ALLOWED_ROOT, ALLOWED_ROOT as WORKSPACE_ALLOWED_ROOT } from './pathUtils.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser, UserRow, DesktopStateRow, ApplicationRow, DocumentRow, SettingRow, DevServerInfo, SystemServiceInfo } from './types.js';

import registerExtensions from './api_extensions.js';
import { syncProxyConfig, syncCloudflareDNS } from './proxy.js';
import { recordSelfWrite, subscribeWorkspaceWatcher } from './fileWatcher.js';

const execFileAsync = util.promisify(execFile);
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const fastify = Fastify({ logger: true });
await fastify.register(cors, { 
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();

      // Loopback
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
        return cb(null, true);
      }

      // Tailscale MagicDNS
      if (host.endsWith('.ts.net')) {
        return cb(null, true);
      }

      // Explicit ALLOWED_ORIGINS
      if (process.env.ALLOWED_ORIGINS) {
        const extra = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase());
        if (extra.includes(host) || extra.includes(origin.toLowerCase())) {
          return cb(null, true);
        }
      }

      // Private IPv4 networks & Tailscale CGNAT (100.64.0.0/10)
      if (/^[0-9.]+$/.test(host)) {
        const parts = host.split('.').map(Number);
        const p0 = parts[0];
        const p1 = parts[1];
        if (p0 !== undefined && p1 !== undefined) {
          if (p0 === 10) return cb(null, true);
          if (p0 === 172 && p1 >= 16 && p1 <= 31) return cb(null, true);
          if (p0 === 192 && p1 === 168) return cb(null, true);
          if (p0 === 100 && p1 >= 64 && p1 <= 127) return cb(null, true);
        }
      }

      // IPv6 private / Tailscale ULA / link-local
      if (host.includes(':')) {
        if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
          return cb(null, true);
        }
      }

      // Deny arbitrary external origins
      cb(null, false);
    } catch {
      cb(new Error('Invalid origin'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});
await fastify.register(websocket);
await initDb();
const secretRow = await dbGet<SettingRow>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
await fastify.register(jwt, { secret: jwtSecret });
await fastify.register(cookie);
await fastify.register(fastifyMultipart, { limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const token = request.cookies.token;
    if (!token) throw new Error('No token');
    const decoded = fastify.jwt.verify<AuthUser>(token || '');
    request.user = decoded;
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Unauthenticated health check endpoint for monitoring, load balancers, and installer
fastify.get('/api/health', async () => {
  return { status: 'ok', uptime: process.uptime(), timestamp: Date.now() };
});

fastify.get('/api/config', async () => {
  return { homeDir: ALLOWED_ROOT, platform: process.platform };
});

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

fastify.put('/api/auth/profile', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { username, currentPassword, newPassword } = (request.body || {}) as { username?: string; currentPassword?: string; newPassword?: string };
  const user = await dbGet<UserRow>('SELECT * FROM User WHERE id = ?', [request.user.id]);
  if (!user) return reply.status(404).send({ error: 'User not found' });
  
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return reply.status(401).send({ error: 'Incorrect current password' });
    const hash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE User SET username = ?, password = ? WHERE id = ?', [username || user.username, hash, request.user.id]);
  } else if (username && username !== user.username) {
    await dbRun('UPDATE User SET username = ? WHERE id = ?', [username, request.user.id]);
  }
  
  return { success: true };
});

fastify.post('/api/auth/logout', async (request, reply) => {
  reply.clearCookie('token', { path: '/' });
  return { success: true };
});

fastify.get('/api/desktop', { preValidation: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
  const state = await dbGet<DesktopStateRow>(`SELECT * FROM DesktopState WHERE userId = ?`, [request.user.id]);
  return {
    ...(state || {}),
    homeDir: ALLOWED_ROOT,
    username: request.user?.username || 'user'
  };
});

fastify.patch('/api/desktop', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { windowsJson, wallpaper, theme } = (request.body || {}) as { windowsJson?: string; wallpaper?: string; theme?: string };
  if (windowsJson !== undefined) {
    await dbRun(`UPDATE DesktopState SET windowsJson = ? WHERE userId = ?`, [windowsJson, request.user.id]);
  }
  if (wallpaper !== undefined) {
    await dbRun(`UPDATE DesktopState SET wallpaper = ? WHERE userId = ?`, [wallpaper, request.user.id]);
  }
  if (theme !== undefined) {
    await dbRun(`UPDATE DesktopState SET theme = ? WHERE userId = ?`, [theme, request.user.id]);
  }
  return { success: true };
});

fastify.get('/api/files', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p = ALLOWED_ROOT } = request.query as { p?: string };
  let targetPath: string;
  try {
    targetPath = await safeResolve(p);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/files/content', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  let targetPath: string;
  try {
    targetPath = await safeResolve(p);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    return { content };
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ENOENT') {
      return reply.status(404).send({ error: 'File not found' });
    }
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.put('/api/files/content', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, content } = request.body as { p: string; content: string };
  let targetPath: string;
  try {
    targetPath = await safeResolve(p);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    recordSelfWrite(targetPath);
    await fs.writeFile(targetPath, content, 'utf-8');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

const MEDIA_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf'
};

fastify.get('/api/files/download', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  let targetPath: string;
  try {
    targetPath = await safeResolve(p);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    const ext = path.extname(targetPath).slice(1).toLowerCase();
    const mimeType = MEDIA_MIME_TYPES[ext] || 'application/octet-stream';
    const stat = await fs.stat(targetPath);
    const fileSize = stat.size;
    const range = request.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const fileStream = (await import('fs')).createReadStream(targetPath, { start, end });
      return reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunksize)
        .header('Content-Type', mimeType)
        .send(fileStream);
    }

    const stream = (await import('fs')).createReadStream(targetPath);
    return reply
      .header('Accept-Ranges', 'bytes')
      .header('Content-Length', fileSize)
      .type(mimeType)
      .send(stream);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.post('/api/files/upload', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const parts = request.parts();
  let targetDir = '';
  
  for await (const part of parts) {
    if (part.type === 'file') {
      if (!targetDir) return reply.status(400).send({ error: 'Missing path field' });
      const cleanName = path.basename(part.filename);
      let targetPath: string;
      try {
        targetPath = await safeResolve(path.join(targetDir, cleanName));
      } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
      const streamPromises = await import('node:stream/promises');
      await streamPromises.pipeline(part.file, createWriteStream(targetPath));
    } else {
      if (part.fieldname === 'p') {
        try {
          targetDir = await safeResolve(part.value as string);
        } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
      }
    }
  }
  return { success: true };
});

fastify.post('/api/files/folder', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const cleanName = path.basename(name);
  let targetPath: string;
  try {
    const targetDir = await safeResolve(p);
    targetPath = await safeResolve(path.join(targetDir, cleanName));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    await fs.mkdir(targetPath);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.post('/api/files/file', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const cleanName = path.basename(name);
  let targetPath: string;
  try {
    const targetDir = await safeResolve(p);
    targetPath = await safeResolve(path.join(targetDir, cleanName));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    recordSelfWrite(targetPath);
    await fs.writeFile(targetPath, '');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.delete('/api/files', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  let targetPath: string;
  try {
    targetPath = await safeResolve(p);
    if (targetPath === ALLOWED_ROOT) {
      return reply.status(403).send({ error: 'Cannot delete workspace root' });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    recordSelfWrite(targetPath);
    await fs.rm(targetPath, { recursive: true, force: true });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/ws/terminal', { websocket: true }, async (connection: any, req) => {
  const cookies = (req.headers.cookie || '').split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (!tokenCookie) {
    connection.close();
    return;
  }
  const token = tokenCookie.split('=')[1];
  let user: any;
  try {
    user = fastify.jwt.verify(token || "");
  } catch (e) {
    connection.close();
    return;
  }

  const userId = String(user.id || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
  const rawTermId = (req.query as any).termId || 'default';
  const termId = String(rawTermId).replace(/[^a-zA-Z0-9_-]/g, '');
  const rawCwd = (req.query as any).cwd || ALLOWED_ROOT;
  let cwd = ALLOWED_ROOT;
  try {
    cwd = await safeResolve(rawCwd);
  } catch {
    cwd = ALLOWED_ROOT;
  }

  // Multi-user isolated tmux session name
  const sessionName = `nebudesk_${userId}_${termId}`;

  const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', sessionName, '-c', cwd], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    } as Record<string, string>
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

fastify.get('/ws/files/watch', { websocket: true }, async (connection: { send: (data: string) => void; on: (event: string, cb: (...args: unknown[]) => void) => void; close: () => void; readyState?: number }, req: FastifyRequest) => {
  const cookies = (req.headers.cookie || '').split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  const queryToken = (req.query as Record<string, string | undefined>)?.token;
  const token = tokenCookie ? tokenCookie.split('=')[1] : queryToken;
  if (!token) {
    connection.close();
    return;
  }
  try {
    fastify.jwt.verify(token);
  } catch {
    connection.close();
    return;
  }

  const rawWorkspace = (req.query as Record<string, string | undefined>)?.workspace || ALLOWED_ROOT;
  let workspace = ALLOWED_ROOT;
  try {
    workspace = await safeResolve(rawWorkspace);
  } catch {
    connection.close();
    return;
  }

  const unsubscribe = subscribeWorkspaceWatcher(workspace, (message) => {
    try {
      if (connection.readyState === undefined || connection.readyState === 1) {
        connection.send(JSON.stringify(message));
      }
    } catch {
      // client error
    }
  });

  connection.on('close', () => {
    unsubscribe();
  });

  connection.on('error', () => {
    unsubscribe();
  });
});

fastify.delete('/api/terminal/:termId', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = String(request.user.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const { termId } = request.params as { termId: string };
    const cleanTermId = String(termId).replace(/[^a-zA-Z0-9_-]/g, '');
    const sessionName = `nebudesk_${userId}_${cleanTermId}`;
    await execFileAsync('tmux', ['kill-session', '-t', sessionName]).catch(() => {});
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});


// Caching loop for systeminformation to ensure delta calculations work perfectly
let cachedProcesses: any[] = [];
let cachedSystem: any = null;

const updateCache = async () => {
  try {
    const [processes, cpu, mem, fsSize, net, load, osInfo] = await Promise.all([
      si.processes(),
      si.cpu(), si.mem(), si.fsSize(), si.networkInterfaces(), si.currentLoad(), si.osInfo()
    ]);
    
    cachedProcesses = processes.list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem,
      user: p.user,
      state: p.state
    })).slice(0, 100);

    cachedSystem = {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      memory: { active: mem.active, total: mem.total },
      storage: fsSize.filter(fs => !fs.mount.includes("/var/lib/docker/overlay2") && !fs.mount.startsWith("/run") && !fs.mount.startsWith("/sys") && !fs.mount.includes("snap")).map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size })),
      os: { platform: osInfo.platform, distro: osInfo.distro, release: osInfo.release, kernel: osInfo.kernel, arch: osInfo.arch, hostname: osInfo.hostname },
      cpuInfo: { brand: cpu.brand, cores: cpu.cores, physicalCores: cpu.physicalCores, speed: cpu.speed },
      network: (Array.isArray(net) ? net : [net]).map(n => ({ iface: n.iface, ip4: n.ip4, ip6: n.ip6, mac: n.mac }))
    };
  } catch (e) {
    console.error('Cache update error:', e);
  }
};
setInterval(updateCache, 2000);
updateCache();

fastify.get('/api/processes', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  if (!cachedProcesses.length) await updateCache();
  return cachedProcesses;
});

fastify.get('/api/system', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  if (!cachedSystem) await updateCache();
  return cachedSystem;
});







fastify.get('/api/pm2/apps', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist']);
    return JSON.parse(stdout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('command not found') || message.includes('ENOENT') || message.includes('EACCES')) {
      return [];
    }
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/docker/containers', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('EACCES') || message.includes('permission denied') || message.includes('ENOENT') || message.includes('ECONNREFUSED')) {
      return [];
    }
    return reply.status(500).send({ error: message });
  }
});

fastify.post('/api/docker/containers/:id/:action', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { id, action } = request.params as { id: string; action: string };
    const container = docker.getContainer(id);
    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else if (action === 'remove') await container.remove({ force: true });
    else return reply.status(400).send({ error: 'Invalid action' });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/services', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { stdout } = await execFileAsync('systemctl', ['list-units', '--type=service', '--all', '--output=json']);
    const parsed = JSON.parse(stdout);
    const services: SystemServiceInfo[] = parsed.map((s: { unit: string; load: string; active: string; sub: string; description: string }) => ({
      name: s.unit,
      load: s.load,
      active: s.active,
      sub: s.sub,
      desc: s.description
    }));
    return services;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/services/logs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { name } = request.query as { name: string };
  if (!name) return reply.status(400).send({ error: 'Service name required' });
  const cleanName = String(name).trim();
  if (!/^[a-zA-Z0-9_.@-]+$/.test(cleanName)) return reply.status(400).send({ error: 'Invalid service name' });
  try {
    const { stdout } = await execFileAsync('journalctl', ['-u', cleanName, '-n', '100', '--no-pager']);
    return { logs: stdout };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('permission') || message.includes('No journal files were opened')) {
      return { logs: '[Notice] Journal log access requires membership in "systemd-journal" or "adm" group:\nsudo usermod -aG systemd-journal $USER' };
    }
    return reply.status(500).send({ error: message });
  }
});

// Settings API
fastify.get('/api/settings', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT key, value FROM Settings');
});
fastify.post('/api/settings', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { key, value } = (request.body || {}) as { key: string; value: string };
  await dbRun('INSERT INTO Settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [key, value, value]);
  return { success: true };
});

// Applications API (Control Panel)
fastify.post('/api/discovery/action', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { runtime, identifier, action } = (request.body || {}) as { runtime: string; identifier: string; action: string };
  try {
    if (runtime === 'docker') {
      const container = docker.getContainer(identifier);
      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();
    } else if (runtime === 'pm2') {
      if (!['start', 'stop', 'restart'].includes(action)) return reply.status(400).send({ error: 'Invalid action' });
      const cleanId = String(identifier).trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      await execFileAsync('pm2', [action, cleanId]);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/discovery/logs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { runtime, identifier } = (request.query || {}) as { runtime: string; identifier: string };
  try {
    let logs = '';
    if (runtime === 'docker') {
      const container = docker.getContainer(identifier);
      const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = logBuffer.toString('utf-8').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
    } else if (runtime === 'pm2') {
      const cleanId = String(identifier).trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      const { stdout } = await execFileAsync('pm2', ['logs', cleanId, '--lines', '100', '--nostream']);
      logs = stdout;
    }
    return { logs };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.post('/api/applications/:id/action', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = (request.params || {}) as { id: string };
  const { action } = (request.body || {}) as { action: string }; // 'start' | 'stop' | 'restart'
  const app = await dbGet<ApplicationRow>('SELECT * FROM Applications WHERE id = ?', [id]);
  if (!app) return reply.status(404).send({ error: 'App not found' });

  try {
    if (app.runtime === 'docker') {
      const container = docker.getContainer(app.identifier);
      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();
    } else if (app.runtime === 'pm2') {
      if (!['start', 'stop', 'restart'].includes(action)) return reply.status(400).send({ error: 'Invalid action' });
      const cleanId = String(app.identifier).trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      await execFileAsync('pm2', [action, cleanId]);
    } else if (app.runtime === 'systemd') {
      if (!['start', 'stop', 'restart'].includes(action)) return reply.status(400).send({ error: 'Invalid action' });
      const cleanId = String(app.identifier).trim();
      if (!/^[a-zA-Z0-9_.@-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      await execFileAsync('sudo', ['systemctl', action, cleanId]);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/applications/:id/logs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = (request.params || {}) as { id: string };
  const app = await dbGet<ApplicationRow>('SELECT * FROM Applications WHERE id = ?', [id]);
  if (!app) return reply.status(404).send({ error: 'App not found' });

  try {
    let logs = '';
    if (app.runtime === 'docker') {
      const container = docker.getContainer(app.identifier);
      const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      logs = logBuffer.toString('utf-8').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ''); // strip docker multiplex headers roughly
    } else if (app.runtime === 'pm2') {
      const cleanId = String(app.identifier).trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      const { stdout } = await execFileAsync('pm2', ['logs', cleanId, '--lines', '100', '--nostream']);
      logs = stdout;
    } else if (app.runtime === 'systemd') {
      const cleanId = String(app.identifier).trim();
      if (!/^[a-zA-Z0-9_.@-]+$/.test(cleanId)) return reply.status(400).send({ error: 'Invalid identifier' });
      const { stdout } = await execFileAsync('journalctl', ['-u', cleanId, '-n', '100', '--no-pager']);
      logs = stdout;
    }
    return { logs };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.get('/api/applications', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT * FROM Applications ORDER BY createdAt DESC');
});

fastify.post('/api/applications', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { name, runtime, identifier, internalHost = '127.0.0.1', internalPort, publicDomain, proxyEnabled = 0, cfEnabled = 0 } = (request.body || {}) as Partial<ApplicationRow>;
  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO Applications (id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled]
  );
  
  if (proxyEnabled) await syncProxyConfig();
  if (cfEnabled && publicDomain) await syncCloudflareDNS(publicDomain, 'create');
  
  return { success: true, id };
});

fastify.put('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = (request.params || {}) as { id: string };
  const { name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled } = (request.body || {}) as Partial<ApplicationRow>;
  await dbRun(
    `UPDATE Applications 
     SET name = ?, runtime = ?, identifier = ?, internalHost = ?, internalPort = ?, publicDomain = ?, proxyEnabled = ?, cfEnabled = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled, id]
  );
  
  await syncProxyConfig(); // Re-sync always in case it was disabled
  if (cfEnabled && publicDomain) {
    await syncCloudflareDNS(publicDomain, 'create');
  } else {
    // If we want to clean up we could, but skipping delete for safety
  }
  
  return { success: true };
});

fastify.delete('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = (request.params || {}) as { id: string };
  
  const app = await dbGet<ApplicationRow>('SELECT * FROM Applications WHERE id = ?', [id]);
  await dbRun('DELETE FROM Applications WHERE id = ?', [id]);
  
  if (app) {
    await syncProxyConfig();
    if (app.cfEnabled && app.publicDomain) await syncCloudflareDNS(app.publicDomain, 'delete');
  }
  return { success: true };
});



registerExtensions(fastify, ALLOWED_ROOT);

// Dev Servers Detection (P2 Developer Workflow)
fastify.get('/api/dev-servers', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { workspace = WORKSPACE_ALLOWED_ROOT } = request.query as { workspace?: string };
  let targetPath;
  try {
    targetPath = await safeResolve(workspace);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }

  try {
    const realTarget = await fs.realpath(targetPath);
    const networkConnections = await si.networkConnections();
    const listening = networkConnections.filter(c => c.state === 'LISTEN' && c.pid);

    const servers: DevServerInfo[] = [];
    const seenPorts = new Set<string>();

    for (const conn of listening) {
      if (!conn.pid || conn.localPort === '3030' || conn.localPort === '5050') continue;
      
      try {
        const rawCwd = await fs.readlink(`/proc/${conn.pid}/cwd`).catch(() => null);
        if (!rawCwd) continue;
        const realCwd = await fs.realpath(rawCwd).catch(() => rawCwd);

        if (realCwd === realTarget || realCwd.startsWith(realTarget.endsWith(path.sep) ? realTarget : realTarget + path.sep)) {
          if (!seenPorts.has(conn.localPort)) {
            seenPorts.add(conn.localPort);
            servers.push({
              port: conn.localPort,
              pid: conn.pid,
              cwd: realCwd,
              process: conn.process || 'node',
              localAddress: conn.localAddress
            });
          }
        }
      } catch (e) {}
    }

    return { servers };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

// Process Management (P2 Developer Workflow)
fastify.post('/api/processes/kill', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { pid } = request.body as { pid: number };
  if (!pid || typeof pid !== 'number' || pid <= 1) {
    return reply.status(403).send({ error: 'Invalid or protected process ID' });
  }

  if (pid === process.pid || pid === process.ppid) {
    return reply.status(403).send({ error: 'Cannot terminate NebuDesk core process' });
  }

  try {
    const rawCwd = await fs.readlink(`/proc/${pid}/cwd`).catch(() => null);
    if (!rawCwd) {
      return reply.status(403).send({ error: 'Process has no accessible working directory' });
    }
    const realCwd = await fs.realpath(rawCwd).catch(() => rawCwd);
    const realAllowed = await fs.realpath(WORKSPACE_ALLOWED_ROOT).catch(() => WORKSPACE_ALLOWED_ROOT);

    if (realCwd !== realAllowed && !realCwd.startsWith(realAllowed.endsWith(path.sep) ? realAllowed : realAllowed + path.sep)) {
      return reply.status(403).send({ error: 'Cannot terminate process outside workspace root' });
    }

    process.kill(pid, 'SIGKILL');
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(500).send({ error: message });
  }
});
// Documents API
fastify.get('/api/docs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { type } = request.query as { type?: string };
  const docs = await dbAll(
    type ? `SELECT id, name, type, updatedAt FROM Documents WHERE userId = ? AND type = ? ORDER BY updatedAt DESC` : `SELECT id, name, type, updatedAt FROM Documents WHERE userId = ? ORDER BY updatedAt DESC`,
    type ? [request.user.id, type] : [request.user.id]
  );
  return docs;
});

fastify.post('/api/docs', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { name, type } = request.body as { name: string; type: string };
  const id = crypto.randomUUID();
  await dbRun(`INSERT INTO Documents (id, userId, name, type, content) VALUES (?, ?, ?, ?, ?)`, [id, request.user.id, name, type, '']);
  return { id, name, type };
});

fastify.get('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const doc = await dbGet(`SELECT * FROM Documents WHERE id = ? AND userId = ?`, [id, request.user.id]);
  if (!doc) return reply.status(404).send({ error: 'Not found' });
  return doc;
});

fastify.put('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const { content, name } = request.body as { content?: string; name?: string };
  if (content !== undefined) await dbRun(`UPDATE Documents SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`, [content, id, request.user.id]);
  if (name !== undefined) await dbRun(`UPDATE Documents SET name = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`, [name, id, request.user.id]);
  return { success: true };
});

fastify.delete('/api/docs/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  await dbRun(`DELETE FROM Documents WHERE id = ? AND userId = ?`, [id, request.user.id]);
  return { success: true };
});

fastify.post('/api/files/rename', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { oldPath, newPath } = request.body as { oldPath: string; newPath: string };
  let resolvedOld: string;
  let resolvedNew: string;
  try {
    resolvedOld = await safeResolve(oldPath);
    resolvedNew = await safeResolve(newPath);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    await fs.rename(resolvedOld, resolvedNew);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

fastify.post('/api/files/copy', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { src, dest } = request.body as { src: string; dest: string };
  if (!src || !dest) {
    return reply.status(400).send({ error: 'src and dest are required' });
  }
  let resolvedSrc: string;
  let resolvedDest: string;
  try {
    resolvedSrc = await safeResolve(src);
    resolvedDest = await safeResolve(dest);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return reply.status(403).send({ error: message });
  }
  try {
    await fs.cp(resolvedSrc, resolvedDest, { recursive: true });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: message });
  }
});

const PORT = Number(process.env.PORT) || 3030;
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Backend listening at ${address}`);
});

