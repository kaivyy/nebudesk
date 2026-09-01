const fs = require('fs');

// 1. Update CodeApp.tsx to pass payload.cwd
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');
code = code.replace(
  "store.openWindow({ appId: 'terminal', title: 'Terminal', x: 250",
  "store.openWindow({ appId: 'terminal', payload: { cwd: workspace }, title: 'Terminal', x: 250"
);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);

// 2. Update TerminalApp.tsx to read it
let terminal = fs.readFileSync('apps/web/src/apps/terminal/TerminalApp.tsx', 'utf8');
// add import
terminal = terminal.replace(
  "import 'xterm/css/xterm.css';",
  "import 'xterm/css/xterm.css';\nimport { useWindowStore } from '../../stores/windowStore';"
);
// read payload
const targetWS = "const wsUrl = `ws://${window.location.hostname}:3030/ws/terminal?termId=${encodeURIComponent(winId)}`;";
const newWS = `    const win = useWindowStore.getState().windows.find(w => w.id === winId) as any;
    const cwd = win?.payload?.cwd || '';
    const wsUrl = \`ws://\${window.location.hostname}:3030/ws/terminal?termId=\${encodeURIComponent(winId)}&cwd=\${encodeURIComponent(cwd)}\`;`;

terminal = terminal.replace(targetWS, newWS);
fs.writeFileSync('apps/web/src/apps/terminal/TerminalApp.tsx', terminal);

console.log('done');
