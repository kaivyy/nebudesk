
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export default function registerExtensions(fastify: any, ALLOWED_ROOT: string) {
  fastify.get('/api/git/status', { preValidation: [(fastify as any).authenticate] }, async (request, reply) => {
    const { p = '/' } = request.query as { p: string };
    const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
    if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
    try {
      const { stdout } = await execPromise('git status --short', { cwd: targetPath });
      const files = stdout.split('\n').filter(Boolean).map(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        return { status, file };
      });
      
      const { stdout: branchOut } = await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: targetPath });
      const branch = branchOut.trim();
      
      return { branch, files };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message, notRepo: true });
    }
  });

  fastify.get('/api/files/search', { preValidation: [(fastify as any).authenticate] }, async (request, reply) => {
    const { p = '/', q = '' } = request.query as { p: string, q: string };
    if (!q || q.length < 2) return { results: [] };
    
    const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
    if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
    
    try {
      // Find files matching query (case insensitive), max depth 5 to prevent lag, exclude node_modules and .git
      const cmd = `find "${targetPath}" -maxdepth 5 -type d \\( -name node_modules -o -name .git \\) -prune -o -type f -iname "*${q}*" -print | head -n 50`;
      const { stdout } = await execPromise(cmd);
      const results = stdout.split('\n').filter(Boolean).map(f => {
        // Return relative to ALLOWED_ROOT
        return f.substring(ALLOWED_ROOT.length) || '/';
      });
      return { results };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
