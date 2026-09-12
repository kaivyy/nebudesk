import { useState } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { DOCK_APPS } from '../config/appRegistry';

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
        appId, title: defaultTitle, x: 200, y: 150, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false
      });
    }
  };

  const apps = DOCK_APPS;

  const { dockAutoHide, dockSize, dockOpacity } = useWindowStore();
  const [isHovered, setIsHovered] = useState(false);

  // If autoHide is true, translate down if not hovered.
  // Note: we use Tailwind transform classes for the animation.
  const isHidden = dockAutoHide && !isHovered;

  const alpha = Math.max(0, Math.min(100, typeof dockOpacity === 'number' ? dockOpacity : 20)) / 100;
  const borderAlpha = Math.min(alpha + 0.1, 0.4);

  const sizeClass = {
    small: 'w-10 h-10',
    medium: 'w-12 h-12 sm:w-14 sm:h-14',
    large: 'w-16 h-16 sm:w-18 sm:h-18'
  }[dockSize || 'medium'] || 'w-12 h-12 sm:w-14 sm:h-14';

  return (
    <>
      {/* Invisible trigger zone at the bottom to catch mouse when dock is hidden */}
      {dockAutoHide && (
        <div 
          className="absolute bottom-0 left-0 w-full h-8 z-[9998]"
          onMouseEnter={() => setIsHovered(true)}
        />
      )}
      
      <div 
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-16px)] overflow-x-auto backdrop-blur-xl border rounded-2xl p-2 flex space-x-2 z-[9999] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHidden ? 'translate-y-[150%]' : 'translate-y-0'}`}
        style={{
          backgroundColor: `rgba(255, 255, 255, ${alpha})`,
          borderColor: `rgba(255, 255, 255, ${borderAlpha})`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {apps.map(app => {
          const isOpen = windows.some(w => w.appId === app.id);
          return (
            <div key={app.id} className="relative flex flex-col items-center flex-shrink-0 group">
              <button 
                data-dock-id={app.id}
                onClick={() => handleAppClick(app.id, app.title)}
                className={`${sizeClass} rounded-2xl flex items-center justify-center hover:-translate-y-2 hover:scale-110 transition-all duration-300 focus:outline-none`}
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
    </>
  );
}
