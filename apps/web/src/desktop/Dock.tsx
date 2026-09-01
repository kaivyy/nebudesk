import { useWindowStore } from '../stores/windowStore';

export default function Dock() {
  const { windows, openWindow, bringToFront } = useWindowStore();

  const handleAppClick = (appId: string, defaultTitle: string) => {
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
              onClick={() => handleAppClick(app.id, app.title)}
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
