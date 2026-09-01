# Desktop Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the WebLinux monorepo (Vite React frontend, Fastify Node.js backend) and implement the Phase 1 Desktop Shell (Wallpaper, Menu Bar, Window Manager, Dock).

**Architecture:** A web-based desktop environment using React and Tailwind CSS. The Window Manager uses Zustand for global state.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Fastify.

## Global Constraints

- Backend must use Node.js and TypeScript.
- Frontend must use React + Vite + Tailwind CSS.
- Code must reside in `/root/nebudesk`.
- Naming rules: No Apple branding.

---

### Task 1: Initialize Monorepo and Frontend App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`

**Interfaces:**
- Produces: Base React Vite app setup.

- [x] **Step 1: Scaffold Vite app**

```bash
cd /root/nebudesk
mkdir -p apps
cd apps
npm create vite@latest web -- --template react-ts
```

- [x] **Step 2: Install dependencies**

```bash
cd /root/nebudesk/apps/web
npm install
npm install tailwindcss postcss autoprefixer zustand lucide-react
npx tailwindcss init -p
```

- [x] **Step 3: Configure Tailwind CSS**

Write `/root/nebudesk/apps/web/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Write `/root/nebudesk/apps/web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
}
```

- [x] **Step 4: Verify Vite build**

Run: `npm run build`
Expected: PASS with no errors.

- [x] **Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: init monorepo and react app"
```

---

### Task 2: Implement Window Manager State

**Files:**
- Create: `apps/web/src/stores/windowStore.ts`

**Interfaces:**
- Produces: Zustand store for managing windows.

- [x] **Step 1: Write the Zustand store**

Write `/root/nebudesk/apps/web/src/stores/windowStore.ts`:
```typescript
import { create } from 'zustand';

export interface DesktopWindow {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
}

interface WindowState {
  windows: DesktopWindow[];
  highestZIndex: number;
  openWindow: (win: Omit<DesktopWindow, 'id' | 'zIndex' | 'focused'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
}

export const useWindowStore = create<WindowState>((set) => ({
  windows: [],
  highestZIndex: 0,
  openWindow: (win) => set((state) => {
    const newZ = state.highestZIndex + 1;
    return {
      highestZIndex: newZ,
      windows: [...state.windows, { ...win, id: Math.random().toString(), zIndex: newZ, focused: true }]
    };
  }),
  closeWindow: (id) => set((state) => ({
    windows: state.windows.filter(w => w.id !== id)
  })),
  focusWindow: (id) => set((state) => {
    const newZ = state.highestZIndex + 1;
    return {
      highestZIndex: newZ,
      windows: state.windows.map(w => w.id === id ? { ...w, zIndex: newZ, focused: true } : { ...w, focused: false })
    };
  })
}));
```

- [x] **Step 2: Commit**

```bash
git add apps/web/src/stores/windowStore.ts
git commit -m "feat: implement window manager state"
```

---

### Task 3: Implement Desktop UI Shell

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/desktop/Desktop.tsx`
- Create: `apps/web/src/desktop/MenuBar.tsx`
- Create: `apps/web/src/desktop/Dock.tsx`

**Interfaces:**
- Consumes: `useWindowStore`
- Produces: Rendered UI.

- [x] **Step 1: Write MenuBar**

Write `/root/nebudesk/apps/web/src/desktop/MenuBar.tsx`:
```tsx
export default function MenuBar() {
  return (
    <div className="h-6 bg-gray-900/80 backdrop-blur text-white flex items-center px-4 text-sm justify-between">
      <div className="flex space-x-4">
        <span className="font-bold">🐧 WebLinux</span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Window</span>
        <span>Help</span>
      </div>
      <div>🔊 {new Date().toLocaleTimeString()}</div>
    </div>
  );
}
```

- [x] **Step 2: Write Dock**

Write `/root/nebudesk/apps/web/src/desktop/Dock.tsx`:
```tsx
import { useWindowStore } from '../stores/windowStore';

export default function Dock() {
  const openWindow = useWindowStore(s => s.openWindow);
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-900/60 backdrop-blur rounded-2xl p-2 flex space-x-2">
      <button 
        onClick={() => openWindow({
          appId: 'files', title: 'Files', x: 100, y: 100, width: 600, height: 400, minWidth: 300, minHeight: 200, minimized: false, maximized: false
        })}
        className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        📁
      </button>
      <button className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        💻
      </button>
    </div>
  );
}
```

- [x] **Step 3: Write Desktop Component**

Write `/root/nebudesk/apps/web/src/desktop/Desktop.tsx`:
```tsx
import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';

export default function Desktop() {
  const windows = useWindowStore(state => state.windows);
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">
      <MenuBar />
      
      <div className="flex-1 relative">
        {/* Render windows here later */}
        {windows.map(win => (
          <div key={win.id} 
               className="absolute bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
               style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }}>
            <div className="h-8 bg-gray-100 border-b flex items-center px-2 cursor-pointer font-medium text-sm">
              {win.title}
            </div>
            <div className="flex-1 p-4 text-black">
              Window Content
            </div>
          </div>
        ))}
      </div>
      
      <Dock />
    </div>
  );
}
```

- [x] **Step 4: Update App.tsx**

Write `/root/nebudesk/apps/web/src/App.tsx`:
```tsx
import Desktop from './desktop/Desktop';

function App() {
  return <Desktop />;
}
export default App;
```

- [x] **Step 5: Verify build**

Run: `cd /root/nebudesk/apps/web && npm run build`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add .
git commit -m "feat: implement basic desktop shell layout"
```

---
