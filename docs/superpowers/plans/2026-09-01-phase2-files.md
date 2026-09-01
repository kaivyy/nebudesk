# Phase 2: Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Fastify Node.js backend and implement the Files app (filesystem API, file list, basic navigation).

**Architecture:** Node.js Fastify backend providing REST API for filesystem operations. React frontend fetching data and rendering in a Window.

**Tech Stack:** Fastify, Node.js `fs/promises`, React, Tailwind CSS, Lucide Icons.

## Global Constraints

- Backend must use Node.js, Fastify.
- Security: root restriction applies. Path traversal must be blocked. MVP root: `/home/user` (or `/root/nebudesk` for testing).

---

### Task 1: Setup Backend and Filesystem API

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/tsconfig.json`

- [x] **Step 1: Scaffold Backend**

```bash
cd /root/nebudesk/apps/server
npm init -y
npm install fastify @fastify/cors
npm install -D typescript @types/node tsx
npx tsc --init
```

- [x] **Step 2: Write Fastify Server and Files API**

Write `/root/nebudesk/apps/server/src/index.ts`:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs/promises';
import path from 'path';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: '*' });

const ALLOWED_ROOT = '/root/nebudesk';

fastify.get('/api/files', async (request, reply) => {
  const { dir = '/' } = request.query as { dir: string };
  const targetPath = path.resolve(ALLOWED_ROOT, dir.replace(/^\/+/, ''));
  
  if (!targetPath.startsWith(ALLOWED_ROOT)) {
    return reply.status(403).send({ error: 'Forbidden path traversal' });
  }
  
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(targetPath, entry.name);
      const stat = await fs.stat(fullPath);
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtime
      };
    }));
    return { path: dir, files };
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

fastify.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
```

- [x] **Step 3: Test build/run**

Run: `cd /root/nebudesk/apps/server && npx tsx src/index.ts` in background.
Wait for it to listen on 3001.

- [x] **Step 4: Commit**

```bash
git add apps/server
git commit -m "feat: setup backend and files api"
```

---

### Task 2: Implement Files App in Frontend

**Files:**
- Create: `apps/web/src/apps/files/FilesApp.tsx`
- Modify: `apps/web/src/desktop/Desktop.tsx`

- [x] **Step 1: Write Files App Component**

Write `/root/nebudesk/apps/web/src/apps/files/FilesApp.tsx`:
```tsx
import { useState, useEffect } from 'react';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export default function FilesApp() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState('');

  const loadFiles = async (dir: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/files?dir=${encodeURIComponent(dir)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFiles(data.files);
      setCurrentPath(data.path);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-12 border-b flex items-center px-4 space-x-2 bg-gray-50">
        <button 
          onClick={() => {
            const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
            setCurrentPath(parent);
          }}
          className="px-2 py-1 bg-white border rounded hover:bg-gray-100">
          ↑
        </button>
        <span className="text-sm px-2 flex-1 truncate">{currentPath}</span>
      </div>
      
      {error && <div className="p-4 text-red-500">{error}</div>}
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-1">
        {files.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name)).map(file => (
          <div 
            key={file.name} 
            onDoubleClick={() => file.isDirectory && setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
            className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer select-none">
            <span className="w-6">{file.isDirectory ? '📁' : '📄'}</span>
            <span className="flex-1 truncate text-sm">{file.name}</span>
            <span className="text-xs text-gray-500 w-24 text-right">
              {!file.isDirectory && (file.size / 1024).toFixed(1) + ' KB'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Connect FilesApp to WindowManager**

Update `/root/nebudesk/apps/web/src/desktop/Desktop.tsx` to conditionally render `FilesApp`:
Add `import FilesApp from '../apps/files/FilesApp';`
Inside the window map:
```tsx
            <div className="flex-1 text-black overflow-hidden relative">
              {win.appId === 'files' ? <FilesApp /> : 'Unknown App'}
            </div>
```

- [x] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat: implement files app frontend"
```
