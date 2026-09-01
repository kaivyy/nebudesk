const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `    const { execSync } = require('child_process');
    const out = execSync('pm2 jlist', { encoding: 'utf-8' });
    return JSON.parse(out);`;
const replacement = `    const { stdout } = await execAsync('pm2 jlist');
    return JSON.parse(stdout);`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
