const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

const target = `    store.openWindow({
      appId: 'code',
      title: 'NebuCode',
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: 900,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      minimized: false,
      maximized: false,
      path: contextMenu.path
    } as any);`;

const replacement = `    store.openWindow({
      appId: 'code',
      title: 'NebuCode',
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: 900,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      minimized: false,
      maximized: false,
      path: contextMenu.path
    } as any, true);`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
console.log('done!');
