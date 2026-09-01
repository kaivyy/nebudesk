const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

code = code.replace(
  "    const { stdout } = await execAsync('systemctl list-units --type=service --all --no-pager --no-legend');",
  "    const { stdout } = await execAsync('systemctl list-units --type=service --all --output=json');"
);

code = code.replace(
  /    const services = stdout.split\('\\n'\).filter\(Boolean\).map\(line => {[\s\S]*?    }\).filter\(Boolean\);/,
  `    const parsed = JSON.parse(stdout);
    const services = parsed.map(s => ({
      name: s.unit,
      load: s.load,
      active: s.active,
      sub: s.sub,
      desc: s.description
    }));`
);

fs.writeFileSync('apps/server/src/index.ts', code);
