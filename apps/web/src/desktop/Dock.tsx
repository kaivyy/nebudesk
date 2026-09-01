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
    { id: 'files', title: 'Finder', icon: '/icons/finder.png' },
    { id: 'code', title: 'NebuCode', icon: '/icons/vscode.png' },
    { id: 'terminal', title: 'Terminal', icon: '/icons/terminal.png' },
    { id: 'system', title: 'Activity Monitor', icon: '/icons/activity_monitor.svg' },
    { id: 'tasks', title: 'Automator', icon: '/icons/automator.png' },
    { id: 'docker', title: 'Docker', icon: '/icons/docker.png' },
    { id: 'services', title: 'Services', icon: '/icons/services.svg' },
    { id: 'settings', title: 'System Settings', icon: '/icons/settings.png' }
  ];

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-16px)] overflow-x-auto bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex space-x-2 z-50 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {apps.map(app => {
        const isOpen = windows.some(w => w.appId === app.id);
        return (
          <div key={app.id} className="relative flex flex-col items-center flex-shrink-0 group">
            <button 
              onClick={() => handleAppClick(app.id, app.title)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center hover:-translate-y-2 hover:scale-110 transition-all duration-300 focus:outline-none"
              title={app.title}
            >
              <img src={app.icon} alt={app.title} className="w-full h-full object-contain drop-shadow-md" />
            </button>
            {isOpen && <div className="absolute -bottom-1 w-1 h-1 bg-white/80 rounded-full"></div>}
            
            {/* macOS Tooltip */}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-lg border border-white/10">
              {app.title}
            </div>
          </div>
        );
      })}
    </div>
  );
}
