const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

code = code.replace(/\\\$/g, '$');
code = code.replace(/\\`/g, '`');

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
