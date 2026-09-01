const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const target = `    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id,
      name: c.Names[0].replace(/^\\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status
    }));`;
const replacement = `    const containers = await docker.listContainers({ all: true });
    return containers;`;

code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/index.ts', code);
