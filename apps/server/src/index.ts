import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fs from 'fs/promises';
import path from 'path';
import pty from 'node-pty';
import si from 'systeminformation';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: '*' });
await fastify.register(websocket);

const ALLOWED_ROOT = '/root/nebudesk';

fastify.get('/api/files', async (request, reply) => {
  const { dir = '/' } = request.query as { dir: string };
  const targetPath = path.resolve(ALLOWED_ROOT, dir.replace(/^\/+/, ''));
  
  if (!targetPath.startsWith(ALLOWED_ROOT)) {
    return reply.status(403).send({ error: 'Forbidden path traversal' });
  }
  
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(targetPath, entry.name);
      const stat = await fs.stat(fullPath);
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtime
      };
    }));
    return { path: dir, files };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/ws/terminal', { websocket: true }, (socket, req) => {
  const shell = process.env.SHELL || 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || '/',
    env: process.env as Record<string, string>
  });

  ptyProcess.onData((data) => {
    socket.send(JSON.stringify({ type: 'terminal.output', data }));
  });

  socket.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'terminal.input') {
        ptyProcess.write(msg.data);
      } else if (msg.type === 'terminal.resize') {
        ptyProcess.resize(msg.cols, msg.rows);
      }
    } catch (e) {}
  });

  socket.on('close', () => {
    ptyProcess.kill();
  });
});

fastify.get('/api/system', async (request, reply) => {
  try {
    const [cpu, mem, fsSize, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);
    return {
      cpu: {
        currentLoad: cpu.currentLoad,
        cores: cpu.cpus.map(c => c.load)
      },
      memory: {
        total: mem.total,
        used: mem.used,
        active: mem.active,
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused
      },
      storage: fsSize.map(fs => ({
        fs: fs.fs,
        type: fs.type,
        size: fs.size,
        used: fs.used,
        use: fs.use,
        mount: fs.mount
      })),
      network: network.map(net => ({
        iface: net.iface,
        rx_sec: net.rx_sec,
        tx_sec: net.tx_sec
      }))
    };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/processes', async (request, reply) => {
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

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
