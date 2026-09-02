const fs = require('fs');
let code = fs.readFileSync('apps/web/src/desktop/CommandPalette.tsx', 'utf8');

code = code.replace(
  "import { Terminal, Activity, Box, Search, X, LogOut, RefreshCw, Folder } from 'lucide-react';",
  "import { Terminal, Globe, Activity, Box, Search, X, LogOut, RefreshCw, Folder } from 'lucide-react';"
);

code = code.replace(
  "{ id: 'term', title: 'Open Terminal', icon: <Terminal size={16} />",
  "{ id: 'browser', title: 'Open Browser', icon: <Globe size={16} />, action: () => openWindow({ appId: 'browser', title: 'NebuBrowser', x: 150, y: 150, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false }) },\n    { id: 'term', title: 'Open Terminal', icon: <Terminal size={16} />"
);

fs.writeFileSync('apps/web/src/desktop/CommandPalette.tsx', code);
console.log('done!');
