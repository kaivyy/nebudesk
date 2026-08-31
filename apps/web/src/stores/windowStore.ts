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
