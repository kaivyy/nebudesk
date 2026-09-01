const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = "fastify.get('/api/docker/containers'";
const replacement = `fastify.get('/api/pm2/apps', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { execSync } = require('child_process');
    const out = execSync('pm2 jlist', { encoding: 'utf-8' });
    return JSON.parse(out);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/docker/containers'`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
