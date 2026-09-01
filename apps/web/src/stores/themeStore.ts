import { create } from 'zustand';

interface ThemeState {
  theme: string;
  wallpaper: string;
  fetchTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  wallpaper: 'default',
  fetchTheme: async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3030/api/desktop`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ theme: data.theme || 'light', wallpaper: data.wallpaper || 'default' });
      }
    } catch (e) {}
  }
}));
