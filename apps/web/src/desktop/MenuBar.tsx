import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../stores/windowStore';

export default function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [aboutModal, setAboutModal] = useState(false);
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
      await fetch(`http://${window.location.hostname}:3030/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.reload();
    } catch(e) {}
  };

  return (
    <>
      {aboutModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] backdrop-blur-[1px]" onClick={() => setAboutModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-72 overflow-hidden border border-gray-200 text-center p-6" onClick={e => e.stopPropagation()}>
            <img src="/icons/monitor.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">NebuDesk</h2>
            <p className="text-xs text-gray-500 mb-4">Version 1.0 Alpha<br/>Web-based Headless Linux Desktop</p>
            <p className="text-[11px] text-gray-400 mb-6">Built to make server administration peaceful again.</p>
            <button onClick={() => setAboutModal(false)} className="px-6 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm">Close</button>
          </div>
        </div>
      )}
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
              <button onClick={() => handleAction(() => setAboutModal(true))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">About NebuDesk</button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => openWindow({ appId: 'settings', title: 'System Settings', x: 200, y: 150, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">System Settings</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'system', title: 'System Monitor', x: 220, y: 170, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">System Monitor</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'tasks', title: 'Task Manager', x: 230, y: 180, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Task Manager</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'services', title: 'Services', x: 240, y: 190, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Services Manager</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'docker', title: 'Docker', x: 260, y: 210, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Docker Manager</button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => window.location.reload())} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Restart Desktop</button>
              <button onClick={() => handleAction(handleLogout)} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Log Out admin</button>
            </div>
          )}
        </div>

        {/* Current App Menu */}
        <div className="font-bold px-3 h-full flex items-center cursor-default">{currentAppTitle}</div>

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
              <button onClick={() => handleAction(() => openWindow({ appId: 'files', title: 'Files', x: 100, y: 100, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }, true))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>New Finder Window</span><span className="text-gray-400 group-hover:text-white/70">⌘N</span>
              </button>
              <button onClick={() => handleAction(() => {
                document.dispatchEvent(new CustomEvent('desktop:pick-file', { 
                  detail: {
                    initialPath: '/root',
                    onSelect: (p: string) => {
                      const name = p.split('/').pop() || '';
                      const ext = name.split('.').pop()?.toLowerCase() || '';
                      let appId = 'code';
                      let title = name;
                      if (/^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(ext)) { appId = 'image'; title = `Image — ${name}`; }
                      else if (/^(md|txt|rtf|doc|docx|odt|pages)$/.test(ext)) { appId = 'docs'; title = `Docs — ${name}`; }
                      else if (/^(csv|xlsx|xls|ods|numbers)$/.test(ext)) { appId = 'sheet'; title = `Sheet — ${name}`; }
                      else if (/^(ppt|pptx|odp|key)$/.test(ext)) { appId = 'slides'; title = `Slides — ${name}`; }
                      
                      openWindow({
                        appId, title, x: 160, y: 120, width: 860, height: 560, minWidth: 500, minHeight: 350, minimized: false, maximized: false, path: p
                      } as any, true);
                    }
                  }
                }));
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Open File</span><span className="text-gray-400 group-hover:text-white/70">⇧⌘O</span>
              </button>
              <button onClick={() => handleAction(() => {
                document.dispatchEvent(new CustomEvent('desktop:pick-folder', { 
                  detail: {
                    initialPath: '/root',
                    onSelect: (p: string) => {
                      if (focusedWindow?.appId === 'files') {
                        openWindow({ appId: 'files', title: 'Files', x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                      } else {
                        openWindow({ appId: 'code', title: `Code - ${p}`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 400, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
                      }
                    }
                  } 
                }));
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Open Folder</span><span className="text-gray-400 group-hover:text-white/70">⌘O</span>
              </button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'terminal', title: 'Terminal', x: 150, y: 150, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }, true))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>New Terminal</span><span className="text-gray-400 group-hover:text-white/70">⌘T</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button 
                onClick={() => handleAction(() => focusedWindow && closeWindow(focusedWindow.id))} 
                disabled={!focusedWindow}
                className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white disabled:text-gray-400 disabled:hover:bg-transparent group"
              >
                <span>Close Window</span><span className="text-gray-400 group-hover:text-white/70">⌘W</span>
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
              <button onClick={() => handleAction(() => document.execCommand('undo'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Undo</span><span className="text-gray-400 group-hover:text-white/70">⌘Z</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('redo'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Redo</span><span className="text-gray-400 group-hover:text-white/70">⇧⌘Z</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => document.execCommand('cut'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Cut</span><span className="text-gray-400 group-hover:text-white/70">⌘X</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('copy'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Copy</span><span className="text-gray-400 group-hover:text-white/70">⌘C</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('paste'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Paste</span><span className="text-gray-400 group-hover:text-white/70">⌘V</span>
              </button>
              <button onClick={() => handleAction(() => document.execCommand('selectAll'))} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Select All</span><span className="text-gray-400 group-hover:text-white/70">⌘A</span>
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
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Toggle Full Screen</span><span className="text-gray-400 group-hover:text-white/70">⌃⌘F</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => { (document.body.style as any).zoom = '125%'; })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Zoom In</span><span className="text-gray-400 group-hover:text-white/70">⌘+</span>
              </button>
              <button onClick={() => handleAction(() => { (document.body.style as any).zoom = '100%'; })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Actual Size</span><span className="text-gray-400 group-hover:text-white/70">⌘0</span>
              </button>
              <button onClick={() => handleAction(() => { (document.body.style as any).zoom = '75%'; })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Zoom Out</span><span className="text-gray-400 group-hover:text-white/70">⌘-</span>
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
              })} className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white group">
                <span>Minimize All</span><span className="text-gray-400 group-hover:text-white/70">⌘M</span>
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              {windows.length === 0 && <div className="px-4 py-1.5 text-gray-400 italic">No Windows</div>}
              {windows.map(w => (
                <button 
                  key={w.id}
                  onClick={() => handleAction(() => bringToFront(w.id))}
                  className="w-full text-left px-4 py-1.5 truncate hover:bg-blue-500 hover:text-white flex items-center"
                >
                  <span className="w-5">{w.focused ? '✓' : ''}</span>
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
    </>
  );
}
