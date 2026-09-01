const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/settings/SettingsApp.tsx', 'utf8');

code = code.replace(
  "import { Settings as SettingsIcon, Monitor, HardDrive, Network, Palette } from 'lucide-react';",
  "import { Settings as SettingsIcon, Monitor, HardDrive, Network, Palette } from 'lucide-react';\nimport { useThemeStore } from '../../stores/themeStore';"
);

code = code.replace(
  "setStatus('Settings saved!');",
  "setStatus('Settings saved!');\n      useThemeStore.getState().fetchTheme();"
);

fs.writeFileSync('apps/web/src/apps/settings/SettingsApp.tsx', code);
