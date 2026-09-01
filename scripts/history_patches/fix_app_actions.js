const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `fastify.get('/api/applications',`;
const replacement = `fastify.post('/api/applications/:id/action', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
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
      await execAsync(\`pm2 \${action} \${app.identifier}\`);
    } else if (app.runtime === 'systemd') {
      await execAsync(\`sudo systemctl \${action} \${app.identifier}\`);
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
      logs = logBuffer.toString('utf-8').replace(/[\\u0000-\\u0009\\u000B-\\u001F\\u007F]/g, ''); // strip docker multiplex headers roughly
    } else if (app.runtime === 'pm2') {
      const { stdout } = await execAsync(\`pm2 logs \${app.identifier} --lines 100 --nostream\`);
      logs = stdout;
    } else if (app.runtime === 'systemd') {
      const { stdout } = await execAsync(\`journalctl -u \${app.identifier} -n 100 --no-pager\`);
      logs = stdout;
    }
    return { logs };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/applications',`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
