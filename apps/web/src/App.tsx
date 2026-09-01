import { useState, useEffect } from 'react';
import Desktop from './desktop/Desktop';
import Login from './Login';
import { useWindowStore } from './stores/windowStore';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3030/api/desktop`, { credentials: 'include' });
        if (res.ok) {
          setIsAuthenticated(true);
          const state = await res.json();
          try {
            const windows = JSON.parse(state.windowsJson || '[]');
            const highestZIndex = windows.reduce((max: number, w: any) => Math.max(max, w.zIndex || 0), 0);
            useWindowStore.setState({ windows, highestZIndex });
          } catch(e) {}

          // Subscription moved to windowStore.ts
        }
      } catch (err) {}
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
