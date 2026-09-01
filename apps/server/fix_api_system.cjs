const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const oldReturn = `    return {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      cpuInfo: { brand: cpu.brand, cores: cpu.cores },
      ramTotal: mem.total,
      ramUsed: mem.active,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      diskTotal: fsSize[0]?.size || 0,
      diskUsed: fsSize[0]?.used || 0,
      netRx: net[0]?.rx_sec || 0,
      netTx: net[0]?.tx_sec || 0
    };`;

const newReturn = `    return {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      memory: { active: mem.active, total: mem.total },
      storage: fsSize.map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size }))
    };`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('apps/server/src/index.ts', code);
