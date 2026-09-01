const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `  const termId = (req.query as any).termId || 'default';
  const sessionName = \`nebudesk_term_\${termId.replace(/[^a-zA-Z0-9_-]/g, '')}\`;

  const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', sessionName], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || '/',`;

const replacement = `  const termId = (req.query as any).termId || 'default';
  const cwd = (req.query as any).cwd || process.env.HOME || '/';
  const sessionName = \`nebudesk_term_\${termId.replace(/[^a-zA-Z0-9_-]/g, '')}\`;

  const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', sessionName, '-c', cwd], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: cwd,`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
console.log('done backend');
