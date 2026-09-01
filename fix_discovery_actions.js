const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

// Add discovery action and logs endpoints
const target = `fastify.post('/api/applications/:id/action'`;
const replacement = `fastify.post('/api/discovery/action', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { runtime, identifier, action } = request.body;
  try {
    if (runtime === 'docker') {
      const container = docker.getContainer(identifier);
      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();
    } else if (runtime === 'pm2') {
      await execAsync(\`pm2 \${action} \${identifier}\`);
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
      logs = logBuffer.toString('utf-8').replace(/[\\u0000-\\u0009\\u000B-\\u001F\\u007F]/g, '');
    } else if (runtime === 'pm2') {
      const { stdout } = await execAsync(\`pm2 logs \${identifier} --lines 100 --nostream\`);
      logs = stdout;
    }
    return { logs };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.post('/api/applications/:id/action'`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
