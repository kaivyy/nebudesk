const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

// Find the block:
// const [cpu, mem, fsSize, net] = await Promise.all([
//   si.cpu(), si.mem(), si.fsSize(), si.networkStats()
// ]);
code = code.replace(
  'const [cpu, mem, fsSize, net] = await Promise.all([',
  'const [cpu, mem, fsSize, net, load] = await Promise.all(['
);

code = code.replace(
  'si.cpu(), si.mem(), si.fsSize(), si.networkStats()',
  'si.cpu(), si.mem(), si.fsSize(), si.networkStats(), si.currentLoad()'
);

// Find the return block:
// return {
//   cpu: cpu.brand,
//   cores: cpu.cores,
code = code.replace(
  '      cpu: cpu.brand,\n      cores: cpu.cores,',
  '      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },\n      cpuInfo: { brand: cpu.brand, cores: cpu.cores },'
);

fs.writeFileSync('apps/server/src/index.ts', code);
