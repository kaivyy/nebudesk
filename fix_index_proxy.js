const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const importTarget = "import registerExtensions from './api_extensions';";
const importReplacement = "import registerExtensions from './api_extensions';\nimport { syncProxyConfig, syncCloudflareDNS } from './proxy.js';";
code = code.replace(importTarget, importReplacement);

// Add settings routes
const routesTarget = "// Applications API (Control Panel)";
const routesReplacement = `// Settings API
fastify.get('/api/settings', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  return await dbAll('SELECT key, value FROM Settings');
});
fastify.post('/api/settings', { preValidation: [fastify.authenticate] }, async (request: any, reply) => {
  const { key, value } = request.body;
  await dbRun('INSERT INTO Settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?', [key, value, value]);
  return { success: true };
});

// Applications API (Control Panel)`;
code = code.replace(routesTarget, routesReplacement);

// Modify Applications POST
const postTarget = `await dbRun(
    \`INSERT INTO Applications (id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
    [id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled]
  );
  return { success: true, id };`;
const postReplacement = `await dbRun(
    \`INSERT INTO Applications (id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
    [id, name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled]
  );
  
  if (proxyEnabled) await syncProxyConfig();
  if (cfEnabled) await syncCloudflareDNS(publicDomain, 'create');
  
  return { success: true, id };`;
code = code.replace(postTarget, postReplacement);

// Modify Applications PUT
const putTarget = `await dbRun(
    \`UPDATE Applications 
     SET name = ?, runtime = ?, identifier = ?, internalHost = ?, internalPort = ?, publicDomain = ?, proxyEnabled = ?, cfEnabled = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?\`,
    [name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled, id]
  );
  return { success: true };`;
const putReplacement = `await dbRun(
    \`UPDATE Applications 
     SET name = ?, runtime = ?, identifier = ?, internalHost = ?, internalPort = ?, publicDomain = ?, proxyEnabled = ?, cfEnabled = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?\`,
    [name, runtime, identifier, internalHost, internalPort, publicDomain, proxyEnabled, cfEnabled, id]
  );
  
  await syncProxyConfig(); // Re-sync always in case it was disabled
  if (cfEnabled) {
    await syncCloudflareDNS(publicDomain, 'create');
  } else {
    // If we want to clean up we could, but skipping delete for safety
  }
  
  return { success: true };`;
code = code.replace(putTarget, putReplacement);

// Modify Applications DELETE
const delTarget = `await dbRun('DELETE FROM Applications WHERE id = ?', [id]);
  return { success: true };`;
const delReplacement = `
  const app: any = await dbGet('SELECT * FROM Applications WHERE id = ?', [id]);
  await dbRun('DELETE FROM Applications WHERE id = ?', [id]);
  
  if (app) {
    await syncProxyConfig();
  }
  return { success: true };`;
code = code.replace(delTarget, delReplacement);

fs.writeFileSync('apps/server/src/index.ts', code);
