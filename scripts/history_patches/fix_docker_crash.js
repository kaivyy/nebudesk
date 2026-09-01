const fs = require('fs');
let code = fs.readFileSync('apps/web/src/apps/applications/AppsApp.tsx', 'utf8');

// Fix 1: adoptContainer
code = code.replace(
  "const name = c.Names[0]?.replace('/', '') || 'Unknown';",
  "const name = c.Names?.[0]?.replace('/', '') || 'Unknown';"
);
code = code.replace(
  "identifier: c.Id.substring(0, 12),",
  "identifier: c.Id?.substring(0, 12) || '',"
);
code = code.replace(
  "internalPort: c.Ports[0]?.PublicPort || 80,",
  "internalPort: c.Ports?.[0]?.PublicPort || 80,"
);

// Fix 2: dockerContainers.map
code = code.replace(
  "const name = c.Names[0]?.replace('/', '');",
  "const name = c.Names?.[0]?.replace('/', '') || 'Unknown';"
);
code = code.replace(
  "const isManaged = apps.some(a => a.identifier === c.Id.substring(0, 12) || a.identifier === name);",
  "const isManaged = apps.some(a => a.identifier === c.Id?.substring(0, 12) || a.identifier === name);"
);
code = code.replace(
  "{c.Ports.map((p: any) => p.PublicPort ? \\`\\${p.PublicPort}->\\${p.PrivatePort}\\` : p.PrivatePort).join(', ')}",
  "{(c.Ports || []).map((p: any) => p.PublicPort ? \\`\\${p.PublicPort}->\\${p.PrivatePort}\\` : p.PrivatePort).join(', ')}"
);

fs.writeFileSync('apps/web/src/apps/applications/AppsApp.tsx', code);
