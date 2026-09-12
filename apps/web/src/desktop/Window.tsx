import React, { useState, useEffect, memo } from 'react';
import { useWindowStore } from '../stores/windowStore';
import type { DesktopWindow } from '../stores/windowStore';

interface WindowProps {
  win: DesktopWindow;
  children: React.ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

const Window = memo(function Window({ win, children }: WindowProps) {
  // Selective Zustand selectors: stable references that don't trigger re-renders
  const bringToFront = useWindowStore(s => s.bringToFront);
  const updatePosition = useWindowStore(s => s.updatePosition);
  const updateSize = useWindowStore(s => s.updateSize);
  const closeWindow = useWindowStore(s => s.closeWindow);
  const minimizeWindow = useWindowStore(s => s.minimizeWindow);
  const maximizeWindow = useWindowStore(s => s.maximizeWindow);
  const dockSize = useWindowStore(s => s.dockSize);
  const dockAutoHide = useWindowStore(s => s.dockAutoHide);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState<{ x: number, y: number } | null>(null);
  
  const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, wx: 0, wy: 0 });
  const [resizeDims, setResizeDims] = useState<{ w: number, h: number, x: number, y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    bringToFront(win.id);
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
    bringToFront(win.id);
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
      setDragPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
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
      const minW = win.minWidth || 550;
      const minH = win.minHeight || 300;

      if (newW < minW) {
        if (resizeDir.includes('w')) newX -= (minW - newW);
        newW = minW;
      }
      if (newH < minH) {
        if (resizeDir.includes('n')) newY -= (minH - newH);
        newH = minH;
      }

      setResizeDims({ w: newW, h: newH, x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      if (dragPos) {
        updatePosition(win.id, dragPos.x, dragPos.y);
        setDragPos(null);
      }
      setIsDragging(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    if (resizeDir) {
      if (resizeDims) {
        updateSize(win.id, resizeDims.w, resizeDims.h, resizeDims.x, resizeDims.y);
        setResizeDims(null);
      }
      setResizeDir(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const [shouldRender, setShouldRender] = useState(!win.minimized);
  
  useEffect(() => {
    if (win.minimized) {
      const timer = setTimeout(() => { setShouldRender(false); }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [win.minimized]);

  if (!shouldRender) return null;

  // Dynamically query the exact DOM element of the Dock icon to calculate the origin
  let dockIconX = window.innerWidth / 2;
  let dockIconY = window.innerHeight;
  const dockBtn = document.querySelector(`[data-dock-id="${win.appId}"]`);
  if (dockBtn) {
    const rect = dockBtn.getBoundingClientRect();
    dockIconX = rect.left + rect.width / 2;
    dockIconY = rect.top + rect.height / 2;
  }
  
  const currentX = dragPos ? dragPos.x : (resizeDims ? resizeDims.x : win.x);
  const currentY = dragPos ? dragPos.y : (resizeDims ? resizeDims.y : win.y);
  const currentW = resizeDims ? resizeDims.w : win.width;
  const currentH = resizeDims ? resizeDims.h : win.height;

  const windowCenterX = win.maximized ? window.innerWidth / 2 : currentX + currentW / 2;
  const windowCenterY = win.maximized ? window.innerHeight / 2 : currentY + currentH / 2;
  
  const tx = dockIconX - windowCenterX;
  const ty = dockIconY - windowCenterY;

  // Dock height: icon size + p-2 (8px top + 8px bottom) + bottom-2 (8px gap from screen edge)
  // When autoHide is on, dock slides away so maximized window can fill full height
  const dockHeightPx = dockAutoHide ? 8 : {
    small: 64,   // 40px icon + 16px padding + 8px gap
    medium: 88,  // 56px icon + 16px padding + 16px gap
    large: 112,  // 72px icon + 16px padding + 24px gap
  }[dockSize] ?? 88;

  const style = win.maximized 
    ? { top: 0, left: 0, width: '100%', height: `calc(100% - ${dockHeightPx}px)`, zIndex: win.zIndex, '--tx': `${tx}px`, '--ty': `${ty}px` } as React.CSSProperties
    : { top: currentY, left: currentX, width: currentW, height: currentH, zIndex: win.zIndex, '--tx': `${tx}px`, '--ty': `${ty}px` } as React.CSSProperties;

  return (
    <div 
      className={`absolute flex flex-col overflow-hidden bg-transparent rounded-2xl ${win.minimized ? 'animate-window-minimize pointer-events-none' : 'animate-window-open'} ${win.maximized ? 'shadow-2xl ring-1 ring-black/10' : 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/5'}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Absolute Traffic Lights (Always on top left) */}
      <div className="absolute top-0 left-0 h-14 flex items-center px-4 z-50 pointer-events-none">
        <div className="flex space-x-2 pointer-events-auto nebudesk-no-drag">
          <button 
            onClick={() => closeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">✕</span>
          </button>
          <button 
            onClick={() => minimizeWindow(win.id)}
            className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-black/50 text-[10px] leading-none">−</span>
          </button>
          <button 
            onClick={() => maximizeWindow(win.id)}
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
});

export default Window;
