import { useState, useEffect } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { useThemeStore } from '../stores/themeStore';
import { Apple, Wifi, BatteryFull, Search, SlidersHorizontal } from 'lucide-react';
import { getCachedHomeDir } from '../config/api';

export default function MenuBar() {
  const { windows, openWindow, closeWindow, bringToFront } = useWindowStore();
  const { wallpaper } = useThemeStore();
  const focusedWindow = windows.find(w => w.focused);
  const [time, setTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const isLight = wallpaper === 'solid-white' || wallpaper === 'white' || wallpaper === 'solid-light' || wallpaper === 'light' || Boolean(wallpaper?.includes('white') || wallpaper?.includes('light'));
  const btnHover = isLight ? 'hover:bg-black/10 active:bg-black/15' : 'hover:bg-white/20 active:bg-white/30';
  const btnActive = isLight ? 'bg-black/10' : 'bg-white/20';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const closeMenu = () => setActiveMenu(null);

  useEffect(() => {
    if (activeMenu) {
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
    }
  }, [activeMenu]);

  const handleLogout = async () => {
    try {
      await fetch(`http://${window.location.hostname}:3030/api/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.reload();
    } catch(e) {}
  };

  const handleAction = (action: () => void) => {
    action();
    closeMenu();
  };

  const handleOpenFolder = () => {
    document.dispatchEvent(new CustomEvent('desktop:pick-folder', { 
      detail: {
        initialPath: getCachedHomeDir(),
        onSelect: (p: string) => {
          if (focusedWindow?.appId === 'files') {
            openWindow({ appId: 'files', title: 'Files', x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 550, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
          } else {
            openWindow({ appId: 'code', title: `Code - ${p}`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 550, minHeight: 300, minimized: false, maximized: false, path: p } as any, true);
          }
        }
      } 
    }));
  };

  const handleOpenFile = () => {
    document.dispatchEvent(new CustomEvent('desktop:pick-file', { 
      detail: {
        initialPath: getCachedHomeDir(),
        onSelect: (p: string) => {
          openWindow({ appId: 'code', title: `Code - ${p}`, x: 130 + Math.random()*30, y: 130 + Math.random()*30, width: 800, height: 600, minWidth: 550, minHeight: 300, minimized: false, maximized: false, path: p, payload: { file: p } } as any, true);
        }
      } 
    }));
  };

  const currentApp = focusedWindow ? focusedWindow.appId : 'finder';
  const currentTitle = focusedWindow ? focusedWindow.title.split(' - ')[0] : 'Finder';

  interface MenuItem {
    type?: 'separator';
    label?: string;
    shortcut?: string;
    action?: () => void;
    disabled?: boolean;
  }
  
  interface MenuGroup {
    id: string;
    label: string;
    items: MenuItem[];
  }

  // Build dynamic menus
  const dynamicMenus: MenuGroup[] = [];

  // 1. File Menu
  const fileItems: MenuItem[] = [];
  if (currentApp === 'code' || currentApp === 'files' || currentApp === 'finder' || currentApp === 'terminal') {
    fileItems.push({ label: 'New Window', shortcut: '⌘N', action: () => openWindow({ appId: currentApp === 'finder' ? 'files' : currentApp, title: currentTitle, x: 150 + Math.random()*30, y: 150 + Math.random()*30, width: 800, height: 600, minWidth: 550, minHeight: 300, minimized: false, maximized: false }, true) });
  }
  if (currentApp === 'code' || currentApp === 'files' || currentApp === 'finder') {
    fileItems.push({ label: 'Open File', shortcut: '⇧⌘O', action: handleOpenFile });
    fileItems.push({ label: 'Open Folder', shortcut: '⌘O', action: handleOpenFolder });
  }
  if (currentApp === 'code') {
    fileItems.push({ label: 'New Terminal', shortcut: '⌘T', action: () => openWindow({ appId: 'terminal', title: 'Terminal', x: 150, y: 150, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false }, true) });
  }
  if (focusedWindow) {
    if (fileItems.length > 0) fileItems.push({ type: 'separator' });
    fileItems.push({ label: 'Close Window', shortcut: '⌘W', action: () => closeWindow(focusedWindow.id) });
  }

  if (fileItems.length > 0) {
    dynamicMenus.push({ label: 'File', id: 'file', items: fileItems });
  }

  // 2. Edit Menu (Generic for most apps)
  if (['code', 'docs', 'sheet', 'slides', 'terminal', 'files', 'finder'].includes(currentApp)) {
    const editItems: MenuItem[] = [
      { label: 'Undo', shortcut: '⌘Z', action: () => document.execCommand('undo') },
      { label: 'Redo', shortcut: '⇧⌘Z', action: () => document.execCommand('redo') },
      { type: 'separator' },
      { label: 'Cut', shortcut: '⌘X', action: () => document.execCommand('cut') },
      { label: 'Copy', shortcut: '⌘C', action: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: '⌘V', action: () => document.execCommand('paste') },
      { label: 'Select All', shortcut: '⌘A', action: () => document.execCommand('selectAll') },
    ];
    dynamicMenus.push({ label: 'Edit', id: 'edit', items: editItems });
  }

  // 3. View Menu
  dynamicMenus.push({
    label: 'View', id: 'view', items: [
      { label: 'Toggle Full Screen', shortcut: '⌃⌘F', action: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } },
      { type: 'separator' },
      { label: 'Zoom In', shortcut: '⌘+', action: () => { (document.body.style as any).zoom = '125%'; } },
      { label: 'Actual Size', shortcut: '⌘0', action: () => { (document.body.style as any).zoom = '100%'; } },
      { label: 'Zoom Out', shortcut: '⌘-', action: () => { (document.body.style as any).zoom = '75%'; } },
    ]
  });

  return (
    <>
    <div className={`h-7 bg-transparent backdrop-blur-sm text-sm flex items-center justify-between px-2 select-none relative z-[99999] transition-colors duration-200 ${isLight ? 'text-gray-900' : 'text-white'}`}>
      <div className="flex items-center h-full">
        {/* Apple Logo Menu */}
        <div className="relative h-full flex items-center" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => toggleMenu('apple')}
            className={`px-3 h-full flex items-center transition-colors ${btnHover} ${activeMenu === 'apple' ? btnActive : ''}`}
          >
            <Apple size={16} fill="currentColor" strokeWidth={1} />
          </button>
          
          {activeMenu === 'apple' && (
            <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button onClick={() => handleAction(() => openWindow({ appId: 'settings', title: 'System Settings', x: 200, y: 150, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">System Settings</button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => openWindow({ appId: 'tasks', title: 'Task Manager', x: 230, y: 180, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Task Manager</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'services', title: 'Services', x: 240, y: 190, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Services Manager</button>
              <button onClick={() => handleAction(() => openWindow({ appId: 'docker', title: 'Docker', x: 260, y: 210, width: 700, height: 450, minWidth: 550, minHeight: 300, minimized: false, maximized: false }))} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Docker Manager</button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => window.location.reload())} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Restart...</button>
              <button onClick={() => handleAction(handleLogout)} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Log Out Admin...</button>
            </div>
          )}
        </div>

        {/* Active App Name */}
        <div className="relative h-full flex items-center" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => toggleMenu('app')}
            className={`px-3 h-full flex items-center font-bold transition-colors ${btnHover} ${activeMenu === 'app' ? btnActive : ''}`}
          >
            {currentApp === 'code' ? 'NebuCode' : (focusedWindow?.title?.split(' - ')[0] || 'Finder')}
          </button>
          {activeMenu === 'app' && (
            <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
              <button 
                onClick={() => handleAction(() => openWindow({ 
                  appId: 'settings', 
                  title: `About ${currentTitle}`, 
                  x: 220, y: 150, 
                  width: 650, height: 450, 
                  minWidth: 500, minHeight: 350, 
                  minimized: false, maximized: false 
                }))} 
                className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors"
              >
                About {currentTitle}
              </button>
              <div className="h-[1px] bg-gray-300 my-1"></div>
              <button onClick={() => handleAction(() => {
                if (focusedWindow) closeWindow(focusedWindow.id);
              })} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Quit {currentTitle}</button>
            </div>
          )}
        </div>

        {/* Dynamic Menus */}
        {dynamicMenus.map(menu => (
          <div key={menu.id} className="relative h-full flex items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => toggleMenu(menu.id)}
              className={`px-3 h-full flex items-center transition-colors ${btnHover} ${activeMenu === menu.id ? btnActive : ''}`}
            >
              {menu.label}
            </button>
            {activeMenu === menu.id && (
              <div className="absolute top-6 left-0 w-56 bg-white/90 backdrop-blur-3xl text-black rounded-b-md shadow-2xl py-1 border border-white/20">
                {menu.items.map((item, idx) => {
                  if (item.type === 'separator') {
                    return <div key={idx} className="h-[1px] bg-gray-300 my-1"></div>;
                  }
                  return (
                    <button 
                      key={idx}
                      onClick={() => { if (item.action) handleAction(item.action); }} 
                      disabled={item.disabled}
                      className="w-full text-left px-4 py-1.5 flex justify-between hover:bg-blue-500 hover:text-white disabled:text-gray-400 disabled:hover:bg-transparent group"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="text-gray-400 group-hover:text-white/70">{item.shortcut}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Window Menu (Always present) */}
        <div className="relative h-full flex items-center" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => toggleMenu('window')}
            className={`px-3 h-full flex items-center transition-colors ${btnHover} ${activeMenu === 'window' ? btnActive : ''}`}
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
      
      <div className="flex items-center space-x-4 pr-3 h-full">
        {/* System Tray Icons */}
        <div className={`flex items-center space-x-3 ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
            className={`${isLight ? 'hover:text-black' : 'hover:text-white'} transition-colors cursor-pointer`} 
            title="Spotlight Search (Cmd+K / Ctrl+K)"
          >
            <Search size={14} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => openWindow({ 
              appId: 'settings', 
              title: 'System Settings', 
              x: 200, y: 140, 
              width: 650, height: 480, 
              minWidth: 500, minHeight: 400, 
              minimized: false, maximized: false 
            })}
            className={`${isLight ? 'hover:text-black' : 'hover:text-white'} transition-colors cursor-pointer`} 
            title="Control Center & Settings"
          >
            <SlidersHorizontal size={14} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => openWindow({ 
              appId: 'settings', 
              title: 'Network & System', 
              x: 210, y: 150, 
              width: 650, height: 480, 
              minWidth: 500, minHeight: 400, 
              minimized: false, maximized: false 
            })}
            className={`${isLight ? 'hover:text-black' : 'hover:text-white'} transition-colors cursor-pointer`} 
            title="Wi-Fi (Online)"
          >
            <Wifi size={16} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => openWindow({ 
              appId: 'tasks', 
              title: 'Task Manager (Power & Battery)', 
              x: 220, y: 160, 
              width: 700, height: 450, 
              minWidth: 550, minHeight: 300, 
              minimized: false, maximized: false 
            })}
            className={`flex items-center ${isLight ? 'hover:text-black' : 'hover:text-white'} transition-colors cursor-pointer`} 
            title="Power & System Status"
          >
            <BatteryFull size={18} strokeWidth={2} className="opacity-90" />
            <span className="text-[11px] font-bold ml-0.5">100%</span>
          </button>
        </div>
        
        {/* Date & Time */}
        <div className={`flex items-center space-x-2 cursor-default px-2 h-full rounded transition-colors ${btnHover}`}>
          <span>{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
    </>
  );
}
