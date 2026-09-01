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
        const res = await fetch(`http://${window.location.hostname}:3001/api/desktop`, { credentials: 'include' });
        if (res.ok) {
          setIsAuthenticated(true);
          const state = await res.json();
          try {
            const windows = JSON.parse(state.windowsJson || '[]');
            useWindowStore.setState({ windows });
          } catch(e) {}

          // Subscribe to store changes to persist to db
          let prevWindows = useWindowStore.getState().windows;
          useWindowStore.subscribe((state) => {
            if (state.windows !== prevWindows) {
              prevWindows = state.windows;
              fetch(`http://${window.location.hostname}:3001/api/desktop`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ windowsJson: JSON.stringify(state.windows) })
              }).catch(() => {});
            }
          });
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
