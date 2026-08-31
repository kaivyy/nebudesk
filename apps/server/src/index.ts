import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs/promises';
import path from 'path';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: '*' });

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

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
