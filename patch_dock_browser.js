const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/Dock.tsx', 'utf8');

code = code.replace(
  "{ id: 'code', title: 'NebuCode', icon: '/icons/vscode.png' },",
  "{ id: 'browser', title: 'NebuBrowser', icon: '/icons/safari.svg' },\n    { id: 'code', title: 'NebuCode', icon: '/icons/vscode.png' },"
);

fs.writeFileSync('apps/web/src/desktop/Dock.tsx', code);
console.log('done!');
