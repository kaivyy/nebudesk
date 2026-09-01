import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../stores/windowStore';

export default function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { windows, openWindow, closeWindow, bringToFront } = useWindowStore();
  const [time, setTime] = useState(new Date());
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const toggleMenu = (menu: string) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const handleAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  const focusedWindow = windows.find(w => w.focused);
  const currentAppTitle = focusedWindow ? focusedWindow.title : 'Finder';

  const handleLogout = async () => {
    try {
      await fetch(`http://${window.location.hostname}:3001/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.reload();
    } catch(e) {}
  };

  return (
    <div ref={menuRef} className="h-6 bg-[#000000]/60 backdrop-blur-md text-white/90 flex items-center px-4 text-[13px] justify-between shadow-sm z-[9999] font-medium tracking-wide">
      <div className="flex items-center space-x-1 h-full">
        {/* Apple/OS Menu */}
        <div className="relative h-full flex items-center">
          <button 
            onClick={() => toggleMenu('os')}
            className={`px-3 h-full flex items-center hover:bg-white/20 transition-colors ${activeMenu === 'os' ? 'bg-white/20' : ''}`}
          >
            <span className="font-bold text-lg leading-none mt-[-2px]">🐧</span>
          </button>
          
          {activeMenu === 'os' && (
            <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20 overflow-hidden">
              <button className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">About NebuDesk</button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => window.location.reload())} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Restart Desktop</button>
              <button onClick={() => handleAction(handleLogout)} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Log Out admin...</button>
            </div>
          )}
        </div>

        {/* Current App Menu */}
        <div className="font-bold px-3 h-full flex items-center">{currentAppTitle}</div>

        {/* File Menu */}
        <div className="relative h-full flex items-center">
          <button 
            onClick={() => toggleMenu('file')}
            className={`px-3 h-full flex items-center hover:bg-white/20 transition-colors ${activeMenu === 'file' ? 'bg-white/20' : ''}`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-6 left-0 w-48 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button onClick={() => handleAction(() => openWindow({ appId: 'files', title: 'Files', x: 100, y: 100, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>New Finder Window</span><span className="text-gray-400 group-hover:text-white/70">⌘N</span>
              </button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'terminal', title: 'Terminal', x: 150, y: 150, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>New Terminal</span><span className="text-gray-400">⌘T</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button 
                onClick={() => handleAction(() => focusedWindow && closeWindow(focusedWindow.id))} 
                disabled={!focusedWindow}
                className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                <span>Close Window</span><span className="text-gray-400">⌘W</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative h-full flex items-center">
          <button 
            onClick={() => toggleMenu('edit')}
            className={`px-3 h-full flex items-center hover:bg-white/20 transition-colors ${activeMenu === 'edit' ? 'bg-white/20' : ''}`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute top-6 left-0 w-48 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button onClick={() => handleAction(() => document.execCommand('undo'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Undo</span><span className="text-gray-400">⌘Z</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('redo'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Redo</span><span className="text-gray-400">⇧⌘Z</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => document.execCommand('cut'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Cut</span><span className="text-gray-400">⌘X</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('copy'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Copy</span><span className="text-gray-400">⌘C</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('paste'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Paste</span><span className="text-gray-400">⌘V</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('selectAll'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Select All</span><span className="text-gray-400">⌘A</span>
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative h-full flex items-center">
          <button 
            onClick={() => toggleMenu('view')}
            className={`px-3 h-full flex items-center hover:bg-white/20 transition-colors ${activeMenu === 'view' ? 'bg-white/20' : ''}`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button onClick={() => handleAction(() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
              })} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white">
                Toggle Full Screen
              </button>
            </div>
          )}
        </div>

        {/* Window Menu */}
        <div className="relative h-full flex items-center">
          <button 
            onClick={() => toggleMenu('window')}
            className={`px-3 h-full flex items-center hover:bg-white/20 transition-colors ${activeMenu === 'window' ? 'bg-white/20' : ''}`}
          >
            Window
          </button>
          {activeMenu === 'window' && (
            <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button onClick={() => handleAction(() => {
                windows.forEach(w => useWindowStore.getState().minimizeWindow(w.id));
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white">
                <span>Minimize All</span><span className="text-gray-400">⌘M</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              {windows.length === 0 && <div className="px-4 py-1.5 text-gray-400 italic">No Windows</div>}
              {windows.map(w => (
                <button 
                  key={w.id}
                  onClick={() => handleAction(() => bringToFront(w.id))}
                  className="w-full text-left px-4 py-1.5 truncate hover:bg-blue-500 hover:text-white flex items-center"
                >
                  <span className="w-4">{w.focused ? '✓' : ''}</span>
                  {w.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4 px-2">
        <span className="cursor-default hover:text-white/80 transition-colors">
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="cursor-default font-medium">
          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
