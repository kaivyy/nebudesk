const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `fastify.get('/api/system', { preValidation: [fastify.authenticate] }, async (request, reply) => {`;
const endpoint = `fastify.delete('/api/terminal/:termId', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { termId } = request.params as { termId: string };
    const sessionName = \`nebudesk_term_\${termId.replace(/[^a-zA-Z0-9_-]/g, '')}\`;
    exec(\`tmux kill-session -t \${sessionName}\`, () => {});
    return { success: true };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});\n\n`;

code = code.replace(target, endpoint + target);
fs.writeFileSync('apps/server/src/index.ts', code);
console.log('done backend');
