# Window Management Polish Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement draggable windows, close/minimize/maximize buttons (macOS style), and ensure no mock data in UI.

**Requirements:**
1. Draggable windows via the title bar.
2. macOS-style traffic light buttons in the window header.
3. Minimize logic (hide window from desktop).
4. Maximize logic (toggle fullscreen).
5. Ensure real data is used (verify and remove any mock placeholders).

---

### Task 1: Update Window Store and Component logic

**Files:**
- Modify: `apps/web/src/stores/windowStore.ts`
- Modify: `apps/web/src/desktop/Desktop.tsx`
- Modify: `apps/web/src/desktop/Dock.tsx`

- [x] **Step 1: Implement Window Component with Dragging**

Create a new component `apps/web/src/desktop/Window.tsx`:
```tsx
import { useRef, useEffect, useState } from 'react';
import { useWindowStore, WindowState } from '../stores/windowStore';

interface WindowProps {
  win: WindowState;
  children: React.ReactNode;
}

export default function Window({ win, children }: WindowProps) {
  const store = useWindowStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    store.bringToFront(win.id);
    if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - win.x,
        y: e.clientY - win.y
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !win.maximized) {
      store.updatePosition(win.id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  if (win.minimized) return null;

  const style = win.maximized 
    ? { top: 24, left: 0, width: '100%', height: 'calc(100% - 24px - 64px)', zIndex: win.zIndex } // Account for menubar and dock
    : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex };

  return (
    <div 
      className="absolute bg-white rounded-xl shadow-2xl border border-gray-200/50 flex flex-col overflow-hidden backdrop-blur-xl bg-white/90"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div 
        ref={headerRef} 
        className="h-10 border-b flex items-center px-4 select-none touch-none bg-gradient-to-b from-gray-100/50 to-white/50"
      >
        <div className="flex space-x-2 mr-4">
          <button 
            onClick={() => store.closeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 border border-red-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">✕</span>
          </button>
          <button 
            onClick={() => store.minimizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 border border-yellow-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">−</span>
          </button>
          <button 
            onClick={() => store.maximizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 border border-green-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">⤢</span>
          </button>
        </div>
        <div className="flex-1 text-center font-semibold text-gray-700 text-sm">{win.title}</div>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>
      <div className="flex-1 overflow-hidden relative text-black">
        {children}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Update Desktop to use Window Component**

Update `/root/nebudesk/apps/web/src/desktop/Desktop.tsx`:
```tsx
import MenuBar from './MenuBar';
import Dock from './Dock';
import { useWindowStore } from '../stores/windowStore';
import FilesApp from '../apps/files/FilesApp';
import TerminalApp from '../apps/terminal/TerminalApp';
import SystemApp from '../apps/system/SystemApp';
import DockerApp from '../apps/docker/DockerApp';
import ServicesApp from '../apps/services/ServicesApp';
import Window from './Window';

export default function Desktop() {
  const windows = useWindowStore(state => state.windows);
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black flex flex-col relative overflow-hidden">
      <MenuBar />
      <div className="flex-1 relative">
        {windows.map(win => (
          <Window key={win.id} win={win}>
            {win.appId === 'files' && <FilesApp />}
            {win.appId === 'terminal' && <TerminalApp />}
            {win.appId === 'system' && <SystemApp />}
            {win.appId === 'docker' && <DockerApp />}
            {win.appId === 'services' && <ServicesApp />}
          </Window>
        ))}
      </div>
      <Dock />
    </div>
  );
}
```

- [x] **Step 3: Update Dock to reflect open/minimized state**

Modify `Dock.tsx` to handle minimizing/restoring:
```tsx
import { useWindowStore } from '../stores/windowStore';

export default function Dock() {
  const { windows, openWindow, minimizeWindow, bringToFront } = useWindowStore();

  const handleAppClick = (appId: string, defaultTitle: string, emoji: string) => {
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      if (existing.minimized) {
        useWindowStore.setState(state => ({
          windows: state.windows.map(w => w.id === existing.id ? { ...w, minimized: false } : w)
        }));
      }
      bringToFront(existing.id);
    } else {
      openWindow({
        appId, title: defaultTitle, x: 200, y: 150, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false
      });
    }
  };

  const apps = [
    { id: 'files', title: 'Files', emoji: '📁', color: 'bg-blue-500' },
    { id: 'terminal', title: 'Terminal', emoji: '💻', color: 'bg-black' },
    { id: 'system', title: 'System Monitor', emoji: '📊', color: 'bg-gray-800' },
    { id: 'docker', title: 'Docker', emoji: '🐳', color: 'bg-blue-700' },
    { id: 'services', title: 'Services', emoji: '⚙️', color: 'bg-red-600' }
  ];

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex space-x-2 z-50">
      {apps.map(app => {
        const isOpen = windows.some(w => w.appId === app.id);
        return (
          <div key={app.id} className="relative flex flex-col items-center">
            <button 
              onClick={() => handleAppClick(app.id, app.title, app.emoji)}
              className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-lg`}
            >
              {app.emoji}
            </button>
            {isOpen && <div className="absolute -bottom-1.5 w-1 h-1 bg-white rounded-full"></div>}
          </div>
        );
      })}
    </div>
  );
}
```

- [x] **Step 4: Commit**
```bash
git add apps/web
git commit -m "feat: implement draggable windows and macos ui polish"
```
