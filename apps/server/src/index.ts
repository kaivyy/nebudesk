import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fs from 'fs/promises';
import path from 'path';
import pty from 'node-pty';
import si from 'systeminformation';
import Docker from 'dockerode';
import { exec } from 'child_process';
import util from 'util';
import bcrypt from 'bcrypt';
import { initDb, dbGet, dbRun } from './db';

const execAsync = util.promisify(exec);
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

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
    const decoded = fastify.jwt.verify(token);
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
    fastify.jwt.verify(token);
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
    cwd: process.env.HOME,
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
    const [cpu, mem, fsSize, net] = await Promise.all([
      si.cpu(), si.mem(), si.fsSize(), si.networkStats()
    ]);
    return {
      cpu: cpu.brand,
      cores: cpu.cores,
      ramTotal: mem.total,
      ramUsed: mem.active,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      diskTotal: fsSize[0]?.size || 0,
      diskUsed: fsSize[0]?.used || 0,
      netRx: net[0]?.rx_sec || 0,
      netTx: net[0]?.tx_sec || 0
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


fastify.get('/api/docker/containers', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id,
      name: c.Names[0].replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status
    }));
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/services', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { stdout } = await execAsync('systemctl list-units --type=service --all --no-pager --no-legend');
    const services = stdout.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
      if (match) {
        return { name: match[1], load: match[2], active: match[3], sub: match[4], desc: match[5] };
      }
      return null;
    }).filter(Boolean);
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

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
