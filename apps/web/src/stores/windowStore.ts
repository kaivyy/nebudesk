import { create } from 'zustand';
import { apiFetch } from '../config/api';

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
  path?: string;
  payload?: Record<string, unknown>;
}

export interface WindowState {
  windows: DesktopWindow[];
  highestZIndex: number;
  openWindow: (win: Omit<DesktopWindow, 'id' | 'zIndex' | 'focused'>, forceNew?: boolean) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number, x?: number, y?: number) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  dockAutoHide: boolean;
  setDockAutoHide: (val: boolean) => void;
  dockSize: 'small' | 'medium' | 'large';
  setDockSize: (val: 'small' | 'medium' | 'large') => void;
  dockOpacity: number;
  setDockOpacity: (val: number) => void;
}

export const useWindowStore = create<WindowState>((set) => ({
  dockAutoHide: localStorage.getItem('nebudesk_dock_autohide') === 'true',
  setDockAutoHide: (val: boolean) => set(() => {
    localStorage.setItem('nebudesk_dock_autohide', val.toString());
    return { dockAutoHide: val };
  }),
  dockSize: (localStorage.getItem('nebudesk_dock_size') as 'small' | 'medium' | 'large') || 'medium',
  setDockSize: (val: 'small' | 'medium' | 'large') => set(() => {
    localStorage.setItem('nebudesk_dock_size', val);
    return { dockSize: val };
  }),
  dockOpacity: Number(localStorage.getItem('nebudesk_dock_opacity') || '20'),
  setDockOpacity: (val: number) => set(() => {
    localStorage.setItem('nebudesk_dock_opacity', val.toString());
    return { dockOpacity: val };
  }),
  windows: [],
  highestZIndex: 0,
  openWindow: (win, forceNew = false) => set((state) => {
    if (!forceNew) {
      const existing = state.windows.find(w => w.appId === win.appId);
      if (existing) {
        const newZ = state.highestZIndex + 1;
        return {
          highestZIndex: newZ,
          windows: state.windows.map(w => w.id === existing.id ? { ...w, zIndex: newZ, focused: true, minimized: false } : { ...w, focused: false })
        };
      }
    }
    const newZ = state.highestZIndex + 1;
    // slightly offset new windows if multiple
    const offset = forceNew ? (state.windows.filter(w => w.appId === win.appId).length * 20) : 0;
    return {
      highestZIndex: newZ,
      windows: [...state.windows.map(w => ({ ...w, focused: false })), { ...win, id: Math.random().toString(), zIndex: newZ, focused: true, x: win.x + offset, y: win.y + offset }]
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
  }),
  bringToFront: (id) => set((state) => {
    const newZ = state.highestZIndex + 1;
    return {
      highestZIndex: newZ,
      windows: state.windows.map(w => w.id === id ? { ...w, zIndex: newZ, focused: true } : { ...w, focused: false })
    };
  }),
  updateSize: (id, width, height, x, y) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, width, height, x: x !== undefined ? x : w.x, y: y !== undefined ? y : w.y } : w)
  })),
  updatePosition: (id, x, y) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, x, y } : w)
  })),
  minimizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, minimized: true, focused: false } : w)
  })),
  maximizeWindow: (id) => set((state) => ({
    windows: state.windows.map(w => w.id === id ? { ...w, maximized: !w.maximized } : w)
  }))
}));

// Persist state to backend automatically
let prevWindows = useWindowStore.getState().windows;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

useWindowStore.subscribe((state) => {
  if (state.windows !== prevWindows) {
    prevWindows = state.windows;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Don't save if it's the initial empty state load
      if (state.windows.length === 0 && useWindowStore.getState().highestZIndex === 0) return;
      
      const persistableWindows = state.windows.filter(w => w.appId !== 'picker');
      apiFetch('/api/desktop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowsJson: JSON.stringify(persistableWindows) })
      }).catch(() => {});
    }, 1000);
  }
});
