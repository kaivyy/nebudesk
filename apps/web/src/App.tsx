import { useState, useEffect } from 'react';
import Desktop from './desktop/Desktop';
import Login from './Login';
import { useWindowStore } from './stores/windowStore';
import { apiFetch } from './config/api';
import type { DesktopWindow } from './stores/windowStore';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiFetch('/api/desktop');
        if (res.ok) {
          setIsAuthenticated(true);
          const state = await res.json();
          try {
            const rawWindows: DesktopWindow[] = JSON.parse(state.windowsJson || '[]');
            const windows = rawWindows.map(w => ({ ...w, focused: false }));
            const highestZIndex = windows.reduce((max: number, w: DesktopWindow) => Math.max(max, w.zIndex || 0), 0);
            useWindowStore.setState({ windows, highestZIndex });
          } catch {}
        }
      } catch {}
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) return <div className="w-full h-full bg-black text-white flex items-center justify-center">Loading...</div>;

  return isAuthenticated ? (
    <Desktop />
  ) : (
    <Login onLogin={() => window.location.reload()} />
  );
}
export default App;
