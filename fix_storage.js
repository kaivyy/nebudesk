const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

code = code.replace(
  /{formatBytes\(disk\.use, 1\)} \/ {formatBytes\(disk\.size, 1\)}/g,
  '{formatBytes(disk.used, 1)} / {formatBytes(disk.size, 1)}'
);

code = code.replace(
  /style={{ width: \`\$\{disk\.use \/ disk\.size \* 100\}%\` }}/g,
  'style={{ width: \\`\\${disk.use}%\\` }}'
);

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
