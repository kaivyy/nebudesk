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

export interface WindowState {
  windows: DesktopWindow[];
  highestZIndex: number;
  openWindow: (win: Omit<DesktopWindow, 'id' | 'zIndex' | 'focused'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
}

export const useWindowStore = create<WindowState>((set) => ({
  windows: [],
  highestZIndex: 0,
  openWindow: (win) => set((state) => {
    const existing = state.windows.find(w => w.appId === win.appId);
    if (existing) {
      const newZ = state.highestZIndex + 1;
      return {
        highestZIndex: newZ,
        windows: state.windows.map(w => w.id === existing.id ? { ...w, zIndex: newZ, focused: true, minimized: false } : { ...w, focused: false })
      };
    }
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
  }),
  bringToFront: (id) => set((state) => {
    const newZ = state.highestZIndex + 1;
    return {
      highestZIndex: newZ,
      windows: state.windows.map(w => w.id === id ? { ...w, zIndex: newZ, focused: true } : { ...w, focused: false })
    };
  }),
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
