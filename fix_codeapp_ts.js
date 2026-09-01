const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/code/CodeApp.tsx', 'utf8');

code = code.replace(/path: contextMenu\.path\n    \}\);/g, "path: contextMenu.path\n    } as any);");
code = code.replace(/onFileAction/g, "handleAction");

fs.writeFileSync('apps/web/src/apps/code/CodeApp.tsx', code);
