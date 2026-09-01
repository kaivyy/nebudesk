const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const oldStorage = 'storage: fsSize.map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size })),';
const newStorage = 'storage: fsSize.filter(fs => !fs.mount.includes("/var/lib/docker/overlay2") && !fs.mount.startsWith("/run") && !fs.mount.startsWith("/sys") && !fs.mount.includes("snap")).map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size })),';

code = code.replace(oldStorage, newStorage);
fs.writeFileSync('apps/server/src/index.ts', code);
