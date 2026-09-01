# Phase 7: Database, Authentication, and Persistence Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SQLite + Prisma, Authentication (JWT in HTTP-only cookie), and Desktop State Persistence.

---

### Task 1: Setup Prisma & Database

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Install Prisma**
```bash
cd /root/nebudesk/apps/server
npm install prisma -D
npm install @prisma/client @fastify/cookie @fastify/jwt bcrypt
npm install -D @types/bcrypt
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Define Schema**
Update `/root/nebudesk/apps/server/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  desktop   DesktopState?
}

model DesktopState {
  id          String   @id @default(uuid())
  userId      String   @unique
  wallpaper   String   @default("default")
  theme       String   @default("system")
  windowsJson String   @default("[]") // JSON string of open windows
  user        User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 3: Migrate DB**
```bash
cd /root/nebudesk/apps/server
npx prisma db push
```

- [ ] **Step 4: Seed Default User**
Create `apps/server/prisma/seed.ts` to create `admin` / `admin` user.

- [ ] **Step 5: Commit**
```bash
git add apps/server
git commit -m "feat: setup prisma and database schema"
```

---

### Task 2: Implement Authentication API

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Setup JWT and Cookie Plugins**
Update `index.ts` to register fastify-jwt and fastify-cookie.
Add login route and auth decorator to protect routes.

- [ ] **Step 2: Secure existing APIs**
Apply the auth hook to `/api/files`, `/api/system`, `/api/docker/*`, `/api/services/*`.

- [ ] **Step 3: Setup WebSocket Auth**
Require JWT token passing in WebSocket connection (e.g. via query param or initial message) to secure terminal access.

- [ ] **Step 4: Commit**
```bash
git add apps/server
git commit -m "feat: implement backend authentication"
```

---

### Task 3: Implement Frontend Auth & Persistence

**Files:**
- Modify: `apps/web/src/stores/windowStore.ts`
- Create: `apps/web/src/Login.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write Login UI**
Create a login screen that sets the auth token/cookie.

- [ ] **Step 2: Sync Zustand to Backend**
On login, fetch `DesktopState` and hydrate `useWindowStore`.
On window changes, debounce a `PATCH /api/desktop` request to save state.

- [ ] **Step 3: Commit**
```bash
git add apps/web
git commit -m "feat: implement frontend auth and state persistence"
```
