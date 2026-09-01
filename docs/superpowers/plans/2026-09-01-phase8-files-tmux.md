# Phase 8: Advanced Files & Terminal (tmux)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement file management actions (create, delete, rename) and Terminal persistence using `tmux`.

---

### Task 1: Files App Actions Backend

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Add File API Mutators**
Add routes for POST (create), PATCH (rename), DELETE (delete).

```typescript
fastify.post('/api/files/folder', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const targetDir = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  const targetPath = path.join(targetDir, name.replace(/\//g, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  await fs.mkdir(targetPath);
  return { success: true };
});

fastify.post('/api/files/file', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p, name } = request.body as { p: string; name: string };
  const targetDir = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  const targetPath = path.join(targetDir, name.replace(/\//g, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT)) return reply.status(403).send({ error: 'Forbidden' });
  await fs.writeFile(targetPath, '');
  return { success: true };
});

fastify.delete('/api/files', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  const { p } = request.query as { p: string };
  const targetPath = path.resolve(ALLOWED_ROOT, p.replace(/^\//, ''));
  if (!targetPath.startsWith(ALLOWED_ROOT) || targetPath === ALLOWED_ROOT) return reply.status(403).send({ error: 'Forbidden' });
  await fs.rm(targetPath, { recursive: true, force: true });
  return { success: true };
});
```

- [ ] **Step 2: Commit Backend**

---

### Task 2: Files App UI Updates

**Files:**
- Modify: `apps/web/src/apps/files/FilesApp.tsx`

- [ ] **Step 1: Add Action Buttons**
Add "New Folder", "New File", "Delete" to FilesApp UI. Use `window.prompt` or simple logic.

- [ ] **Step 2: Commit Frontend**

---

### Task 3: Terminal tmux Persistence

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Change pty spawn to tmux**
Update `/ws/terminal`:
```typescript
  const ptyProcess = pty.spawn('tmux', ['new-session', '-A', '-s', 'nebudesk_term'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env as Record<string, string>
  });
```

- [ ] **Step 2: Commit**
