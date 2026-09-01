# Phase 6: Services & Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Services Manager to view systemd services and their logs.

**Tech Stack:** Node.js child_process (for systemctl), React, Tailwind CSS.

---

### Task 1: Setup Backend Services API

**Files:**
- Modify: `apps/server/src/index.ts`

- [x] **Step 1: Add Services API Routes**

Update `/root/nebudesk/apps/server/src/index.ts`:
Add `import { exec } from 'child_process';` and `import util from 'util';`
Add `const execAsync = util.promisify(exec);`

Add routes:
```typescript
fastify.get('/api/services', async (request, reply) => {
  try {
    const { stdout } = await execAsync('systemctl list-units --type=service --all --no-pager --no-legend');
    const services = stdout.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
      if (match) {
        return { name: match[1], load: match[2], active: match[3], sub: match[4], desc: match[5] };
      }
      return null;
    }).filter(Boolean);
    return services;
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.get('/api/services/logs', async (request, reply) => {
  const { name } = request.query as { name: string };
  if (!name) return reply.status(400).send({ error: 'Service name required' });
  try {
    const { stdout } = await execAsync(`journalctl -u ${name} -n 100 --no-pager`);
    return { logs: stdout };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});
```

- [x] **Step 2: Commit**
```bash
git add apps/server
git commit -m "feat: add backend services api"
```

---

### Task 2: Implement ServicesApp in Frontend

**Files:**
- Create: `apps/web/src/apps/services/ServicesApp.tsx`
- Modify: `apps/web/src/desktop/Desktop.tsx`
- Modify: `apps/web/src/desktop/Dock.tsx`

- [x] **Step 1: Write ServicesApp Component**

Write `/root/nebudesk/apps/web/src/apps/services/ServicesApp.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';

export default function ServicesApp() {
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchServices = async () => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/services`);
      if (res.ok) setServices(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchLogs = async (name: string) => {
    try {
      const baseUrl = `http://${window.location.hostname}:3001`;
      const res = await fetch(`${baseUrl}/api/services/logs?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService);
      const interval = setInterval(() => fetchLogs(selectedService), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedService]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex bg-white text-sm">
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-2 border-b bg-gray-50 font-bold">Services</div>
        <div className="flex-1 overflow-auto">
          {error && <div className="p-2 text-red-500">{error}</div>}
          <div className="flex flex-col">
            {services.map(s => (
              <div 
                key={s.name} 
                onClick={() => setSelectedService(s.name)}
                className={`p-2 cursor-pointer border-b hover:bg-gray-100 flex items-center ${selectedService === s.name ? 'bg-blue-50 border-blue-200' : ''}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${s.active === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div className="flex-1 truncate">{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-2/3 flex flex-col bg-gray-900 text-gray-100">
        <div className="p-2 border-b border-gray-700 bg-gray-800 font-bold flex justify-between">
          <span>{selectedService ? `Logs: ${selectedService}` : 'Select a service to view logs'}</span>
        </div>
        <pre ref={logsRef} className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap">
          {logs || 'No logs available.'}
        </pre>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Connect ServicesApp**

Update `Desktop.tsx`:
```tsx
import ServicesApp from '../apps/services/ServicesApp';
// ...
              {win.appId === 'docker' && <DockerApp />}
              {win.appId === 'services' && <ServicesApp />}
```

Update `Dock.tsx`:
```tsx
      <button 
        onClick={() => openWindow({
          appId: 'services', title: 'Services & Logs', x: 300, y: 150, width: 800, height: 500, minWidth: 600, minHeight: 400, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        ⚙️
      </button>
```

- [x] **Step 3: Commit**
```bash
git add apps/web
git commit -m "feat: implement services and logs app"
```
