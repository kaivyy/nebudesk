const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const targetStr = `registerExtensions(fastify, ALLOWED_ROOT);`;

const newRoutes = `// Applications API (Control Panel)
fastify.get('/api/applications', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT * FROM Applications ORDER BY createdAt DESC');
});

fastify.post('/api/applications', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { name, runtime, identifier, internalHost = '127.0.0.1', internalPort, publicDomain, proxyEnabled = 0, cfEnabled = 0 } = request.body;
  const id = crypto.randomUUID();
  await dbRun(
    \`INSERT INTO Applications (id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
    [id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled]
  );
  return { success: true, id };
});

fastify.put('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  const { name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled } = request.body;
  await dbRun(
    \`UPDATE Applications 
     SET name = ?, runtime = ?, identifier = ?, internalHost = ?, internalPort = ?, publicDomain = ?, proxyEnabled = ?, cfEnabled = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?\`,
    [name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled, id]
  );
  return { success: true };
});

fastify.delete('/api/applications/:id', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { id } = request.params;
  await dbRun('DELETE FROM Applications WHERE id = ?', [id]);
  return { success: true };
});

registerExtensions(fastify, ALLOWED_ROOT);`;

code = code.replace(targetStr, newRoutes);
fs.writeFileSync('apps/server/src/index.ts', code);
