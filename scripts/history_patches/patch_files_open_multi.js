const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/files/FilesApp.tsx', 'utf8');

code = code.replace(
  "store.openWindow({\n            appId: 'code', title: 'NebuCode',\n            x: 150, y: 150, width: 800, height: 600,\n            minWidth: 600, minHeight: 400, minimized: false, maximized: false,\n            payload: { path: currentPath, file: f.path }\n          } as any);",
  "store.openWindow({\n            appId: 'code', title: 'NebuCode',\n            x: 150, y: 150, width: 800, height: 600,\n            minWidth: 600, minHeight: 400, minimized: false, maximized: false,\n            payload: { path: currentPath, file: f.path }\n          } as any, true);"
);

fs.writeFileSync('apps/web/src/apps/files/FilesApp.tsx', code);
console.log('done!');
