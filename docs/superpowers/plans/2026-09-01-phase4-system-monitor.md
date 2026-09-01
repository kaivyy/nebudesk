# Phase 4: System Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the System Monitor app showing CPU, RAM, Storage, and Processes.

**Architecture:** 
- Backend: Expose `/api/system` and `/api/processes` endpoints using `systeminformation` package.
- Frontend: `SystemApp.tsx` polling backend every second and displaying stats.

**Tech Stack:** Node.js `systeminformation` package, React, Tailwind CSS.

---

### Task 1: Setup Backend System APIs

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/server/src/index.ts`

- [x] **Step 1: Install systeminformation**

```bash
cd /root/nebudesk/apps/server
npm install systeminformation
```

- [x] **Step 2: Add System APIs**

Update `/root/nebudesk/apps/server/src/index.ts` to include system API endpoints.
Add `import si from 'systeminformation';` at the top.
Add the following routes:
```typescript
fastify.get('/api/system', async (request, reply) => {
  try {
    const [cpu, mem, fsSize, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);
    return {
      cpu: {
        currentLoad: cpu.currentLoad,
        cores: cpu.cpus.map(c => c.load)
      },
      memory: {
        total: mem.total,
        used: mem.used,
        active: mem.active,
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused
      },
      storage: fsSize.map(fs => ({
        fs: fs.fs,
        type: fs.type,
        size: fs.size,
        used: fs.used,
        use: fs.use,
        mount: fs.mount
      })),
      network: network.map(net => ({
        iface: net.iface,
        rx_sec: net.rx_sec,
        tx_sec: net.tx_sec
      }))
    };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/processes', async (request, reply) => {
  try {
    const processes = await si.processes();
    return processes.list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem,
      user: p.user,
      state: p.state
    })).slice(0, 100); // Return top 100 for MVP
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
```

- [x] **Step 3: Commit**

```bash
git add apps/server
git commit -m "feat: add backend system monitor APIs"
```

---

### Task 2: Implement SystemApp in Frontend

**Files:**
- Create: `apps/web/src/apps/system/SystemApp.tsx`
- Modify: `apps/web/src/desktop/Desktop.tsx`
- Modify: `apps/web/src/desktop/Dock.tsx`

- [x] **Step 1: Write SystemApp Component**

Write `/root/nebudesk/apps/web/src/apps/system/SystemApp.tsx`:
```tsx
import { useState, useEffect } from 'react';

export default function SystemApp() {
  const [stats, setStats] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = `http://${window.location.hostname}:3001`;
        if (activeTab === 'overview') {
          const res = await fetch(`${baseUrl}/api/system`);
          if (res.ok) setStats(await res.json());
        } else if (activeTab === 'processes') {
          const res = await fetch(`${baseUrl}/api/processes`);
          if (res.ok) setProcesses(await res.json());
        }
      } catch (e) {}
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';

  return (
    <div className="h-full flex flex-col bg-white text-sm">
      <div className="flex border-b bg-gray-50">
        <button className={`px-4 py-2 ${activeTab === 'overview' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`px-4 py-2 ${activeTab === 'processes' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('processes')}>Processes</button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-2">CPU Usage ({stats.cpu.currentLoad.toFixed(1)}%)</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${stats.cpu.currentLoad}%` }}></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {stats.cpu.cores.map((c: number, i: number) => (
                  <div key={i} className="text-xs bg-gray-100 p-1 rounded text-center">Core {i}: {c.toFixed(0)}%</div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Memory ({formatBytes(stats.memory.active)} / {formatBytes(stats.memory.total)})</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-green-500 h-4 rounded-full transition-all" style={{ width: `${(stats.memory.active / stats.memory.total) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Storage</h3>
              {stats.storage.map((fs: any, i: number) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{fs.mount} ({fs.type})</span>
                    <span>{fs.use.toFixed(1)}% ({formatBytes(fs.used)} / {formatBytes(fs.size)})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${fs.use}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'processes' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-2">PID</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">User</th>
                <th className="pb-2">CPU %</th>
                <th className="pb-2">Mem %</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <tr key={p.pid} className="border-b hover:bg-gray-50">
                  <td className="py-1">{p.pid}</td>
                  <td>{p.name}</td>
                  <td>{p.user}</td>
                  <td>{p.cpu.toFixed(1)}</td>
                  <td>{p.mem.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Connect SystemApp to Desktop and Dock**

Update `/root/nebudesk/apps/web/src/desktop/Desktop.tsx` to include `SystemApp`:
```tsx
import SystemApp from '../apps/system/SystemApp';
// ...
              {win.appId === 'files' && <FilesApp />}
              {win.appId === 'terminal' && <TerminalApp />}
              {win.appId === 'system' && <SystemApp />}
```

Update `/root/nebudesk/apps/web/src/desktop/Dock.tsx`:
Add system button:
```tsx
      <button 
        onClick={() => openWindow({
          appId: 'system', title: 'System Monitor', x: 200, y: 100, width: 700, height: 500, minWidth: 500, minHeight: 400, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        📊
      </button>
```

- [x] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat: implement system monitor app"
```
