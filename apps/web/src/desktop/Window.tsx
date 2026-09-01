import { useRef, useEffect, useState } from 'react';
import { useWindowStore, WindowState } from '../stores/windowStore';

interface WindowProps {
  win: WindowState;
  children: React.ReactNode;
}

export default function Window({ win, children }: WindowProps) {
  const store = useWindowStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    store.bringToFront(win.id);
    if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'SPAN') return;
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - win.x,
        y: e.clientY - win.y
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  if (win.minimized) return null;

  const style = win.maximized 
    ? { top: 24, left: 0, width: '100%', height: 'calc(100% - 24px - 64px)', zIndex: win.zIndex } // Account for menubar and dock
    : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex };

  return (
    <div 
      className="absolute bg-white rounded-xl shadow-2xl border border-gray-200/50 flex flex-col overflow-hidden backdrop-blur-xl bg-white/90"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div 
        ref={headerRef} 
        className="h-10 border-b flex items-center px-4 select-none touch-none bg-gradient-to-b from-gray-100/50 to-white/50"
      >
        <div className="flex space-x-2 mr-4">
          <button 
            onClick={() => store.closeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 border border-red-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">✕</span>
          </button>
          <button 
            onClick={() => store.minimizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 border border-yellow-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">−</span>
          </button>
          <button 
            onClick={() => store.maximizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 border border-green-600/50 flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">⤢</span>
          </button>
        </div>
        <div className="flex-1 text-center font-semibold text-gray-700 text-sm">{win.title}</div>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>
      <div className="flex-1 overflow-hidden relative text-black">
        {children}
      </div>
    </div>
  );
}
