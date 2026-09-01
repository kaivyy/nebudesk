const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

code = code.replace(
  'const [cpu, mem, fsSize, net, load] = await Promise.all([',
  'const [cpu, mem, fsSize, net, load, osInfo] = await Promise.all(['
);

code = code.replace(
  'si.cpu(), si.mem(), si.fsSize(), si.networkStats(), si.currentLoad()',
  'si.cpu(), si.mem(), si.fsSize(), si.networkInterfaces(), si.currentLoad(), si.osInfo()'
);

const oldReturn = `    return {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      memory: { active: mem.active, total: mem.total },
      storage: fsSize.map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size }))
    };`;

const newReturn = `    return {
      cpu: { currentLoad: load.currentLoad, cores: load.cpus.map(c => c.load) },
      memory: { active: mem.active, total: mem.total },
      storage: fsSize.map(fs => ({ mount: fs.mount, type: fs.type, use: fs.use, used: fs.used, size: fs.size })),
      os: { platform: osInfo.platform, distro: osInfo.distro, release: osInfo.release, kernel: osInfo.kernel, arch: osInfo.arch, hostname: osInfo.hostname },
      cpuInfo: { brand: cpu.brand, cores: cpu.cores, physicalCores: cpu.physicalCores, speed: cpu.speed },
      network: (Array.isArray(net) ? net : [net]).map(n => ({ iface: n.iface, ip4: n.ip4, ip6: n.ip6, mac: n.mac }))
    };`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('apps/server/src/index.ts', code);
