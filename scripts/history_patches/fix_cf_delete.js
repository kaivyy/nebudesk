const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `  if (app) {
    await syncProxyConfig();
  }`;
const replacement = `  if (app) {
    await syncProxyConfig();
    if (app.cfEnabled) await syncCloudflareDNS(app.publicDomain, 'delete');
  }`;

code = code.replace(target, replacement);

// Also fix imports
code = code.replace("from './db'", "from './db.js'");
code = code.replace("from './api_extensions'", "from './api_extensions.js'");
code = code.replace("fastify.jwt.verify(token);", "fastify.jwt.verify(token || '');");
code = code.replace("cwd: process.env.HOME,", "cwd: process.env.HOME || '/',");

fs.writeFileSync('apps/server/src/index.ts', code);
