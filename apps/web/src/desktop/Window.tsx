import { useState } from 'react';
import { useWindowStore } from '../stores/windowStore';
import type { DesktopWindow } from '../stores/windowStore';

interface WindowProps {
  win: DesktopWindow;
  children: React.ReactNode;
}

export default function Window({ win, children }: WindowProps) {
  const store = useWindowStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    store.bringToFront(win.id);
    const target = e.target as HTMLElement;
    const dragRegion = target.closest('.nebudesk-drag-region');
    const noDrag = target.closest('.nebudesk-no-drag, button, input, select, textarea');
    
    if (dragRegion && !noDrag) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - win.x,
        y: e.clientY - win.y
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !win.maximized) {
      store.updatePosition(win.id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  if (win.minimized) return null;

  const style = win.maximized 
    ? { top: 24, left: 0, width: '100%', height: 'calc(100% - 24px - 64px)', zIndex: win.zIndex } // Account for menubar and dock
    : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex };

  // For backward compatibility with other apps, if they don't provide a .nebudesk-drag-region, we can provide a default header.
  // But the prompt wants it for FilesApp and overall unified toolbar.
  // We'll provide a default header ONLY if the app doesn't have its own custom unified toolbar. 
  // Let's just say ALL apps now must have their own .nebudesk-drag-region! 
  // Or we provide a thin top drag bar?
  // Let's check if the app is 'files' or 'code' to suppress the default header, or just suppress it everywhere and update the apps.
  // Actually, providing a default header if `win.appId !== 'files'` is safest.
  
  
  // Wait, I will just make the default header fallback if there's no custom one. Since I have access to all apps, I will just update them all to use the new architecture!
  // Actually, the simplest is to always render the traffic lights as absolute!

  return (
    <div 
      className="absolute rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/20 flex flex-col overflow-hidden bg-transparent"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Absolute Traffic Lights (Always on top left) */}
      <div className="absolute top-0 left-0 h-14 flex items-center px-4 z-50 pointer-events-none">
        <div className="flex space-x-2 pointer-events-auto nebudesk-no-drag">
          <button 
            onClick={() => store.closeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">✕</span>
          </button>
          <button 
            onClick={() => store.minimizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">−</span>
          </button>
          <button 
            onClick={() => store.maximizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-[#27c93f] hover:bg-[#27c93f] border border-[#1aab29] flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">⤢</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative text-black flex flex-col">
        {children}
      </div>
    </div>
  );
}
