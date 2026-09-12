import { create } from 'zustand';

interface ThemeState {
  theme: string;
  wallpaper: string;
  fetchTheme: () => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  setWallpaper: (wallpaper: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  wallpaper: 'nebu',
  fetchTheme: async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3030/api/desktop`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ theme: data.theme || 'light', wallpaper: data.wallpaper || 'nebu' });
      }
    } catch (e) {}
  },
  setTheme: async (theme: string) => {
    set({ theme });
    try {
      await fetch(`http://${window.location.hostname}:3030/api/desktop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme })
      });
    } catch (e) {}
  },
  setWallpaper: async (wallpaper: string) => {
    set({ wallpaper });
    try {
      await fetch(`http://${window.location.hostname}:3030/api/desktop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wallpaper })
      });
    } catch (e) {}
  }
}));
