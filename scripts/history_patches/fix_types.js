const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');
if (!code.includes("declare module 'fastify'")) {
    const target = "const docker = new Docker({ socketPath: '/var/run/docker.sock' });";
    const replacement = target + "\n\ndeclare module 'fastify' {\n  interface FastifyInstance {\n    authenticate: any;\n  }\n}";
    code = code.replace(target, replacement);
    fs.writeFileSync('apps/server/src/index.ts', code);
}
