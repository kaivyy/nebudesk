const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

code = code.replace(/style=\{\{ width: \\\`\\\$\{disk\.use\}%\\\` \}\}/g, 'style={{ width: `${disk.use}%` }}');

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
