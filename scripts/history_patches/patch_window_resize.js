const fs = require('fs');
const newCode = `import { useState } from 'react';
import { useWindowStore } from '../stores/windowStore';
import type { DesktopWindow } from '../stores/windowStore';

interface WindowProps {
  win: DesktopWindow;
  children: React.ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export default function Window({ win, children }: WindowProps) {
  const store = useWindowStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, wx: 0, wy: 0 });

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

  const handleResizePointerDown = (e: React.PointerEvent, dir: ResizeDirection) => {
    e.stopPropagation();
    store.bringToFront(win.id);
    setResizeDir(dir);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: win.width,
      h: win.height,
      wx: win.x,
      wy: win.y
    });
    const parent = e.currentTarget.parentElement;
    if (parent) parent.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !win.maximized) {
      store.updatePosition(win.id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
    } else if (resizeDir && !win.maximized) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      
      let newW = resizeStart.w;
      let newH = resizeStart.h;
      let newX = resizeStart.wx;
      let newY = resizeStart.wy;

      if (resizeDir.includes('e')) newW += dx;
      if (resizeDir.includes('s')) newH += dy;
      if (resizeDir.includes('w')) {
        newW -= dx;
        newX += dx;
      }
      if (resizeDir.includes('n')) {
        newH -= dy;
        newY += dy;
      }

      // Enforce minimum dimensions
      const minW = win.minWidth || 300;
      const minH = win.minHeight || 200;

      if (newW < minW) {
        if (resizeDir.includes('w')) newX -= (minW - newW);
        newW = minW;
      }
      if (newH < minH) {
        if (resizeDir.includes('n')) newY -= (minH - newH);
        newH = minH;
      }

      store.updateSize(win.id, newW, newH, newX, newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging || resizeDir) {
      setIsDragging(false);
      setResizeDir(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  if (win.minimized) return null;

  const style = win.maximized 
    ? { top: 24, left: 0, width: '100%', height: 'calc(100% - 24px - 64px)', zIndex: win.zIndex } 
    : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex };

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

      {/* Resize Handles */}
      {!win.maximized && (
        <>
          <div onPointerDown={(e) => handleResizePointerDown(e, 'n')} className="absolute top-0 left-2 right-2 h-2 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 's')} className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 'e')} className="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 'w')} className="absolute top-2 bottom-2 left-0 w-2 cursor-ew-resize z-50" />
          
          <div onPointerDown={(e) => handleResizePointerDown(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizePointerDown(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50" />
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync('apps/web/src/desktop/Window.tsx', newCode);
console.log('patched Window.tsx');
