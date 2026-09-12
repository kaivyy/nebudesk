import React, { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { commandRegistry, useCommands, type CommandItem } from '../stores/commandRegistry';
import { APP_REGISTRY } from '../config/appRegistry';
import { API_BASE_URL } from '../config/api';
import { Search, X, LogOut, RefreshCw } from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openWindow } = useWindowStore();

  // Register all desktop applications and system commands
  useEffect(() => {
    const appCommands: CommandItem[] = Object.values(APP_REGISTRY).map(app => ({
      id: `app-${app.id}`,
      title: `Open ${app.title}`,
      category: 'Applications',
      icon: <img src={app.icon} alt={app.title} className="w-4 h-4 rounded-sm object-contain" />,
      action: () => openWindow({
        appId: app.id,
        title: app.title,
        x: 180,
        y: 120,
        width: app.defaultWidth,
        height: app.defaultHeight,
        minWidth: app.minWidth,
        minHeight: app.minHeight,
        minimized: false,
        maximized: false
      })
    }));

    const systemCommands: CommandItem[] = [
      {
        id: 'reload',
        title: 'Reload Desktop Window',
        category: 'System',
        icon: <RefreshCw size={16} />,
        action: () => window.location.reload()
      },
      {
        id: 'logout',
        title: 'Log Out',
        category: 'System',
        icon: <LogOut size={16} />,
        action: async () => {
          try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.reload();
          } catch {}
        }
      }
    ];

    const unregister = commandRegistry.registerMany([...appCommands, ...systemCommands]);
    return unregister;
  }, [openWindow]);

  const allCommands = useCommands();

  const filteredCommands = allCommands.filter(c => {
    const q = query.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    const handleToggle = () => {
      setIsOpen(prev => !prev);
      setQuery('');
      setSelectedIndex(0);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-command-palette', handleToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-command-palette', handleToggle);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const executeCommand = async (cmd: CommandItem) => {
    setIsOpen(false);
    await cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]!);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex justify-center items-start pt-[15vh] bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-xl bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white text-base focus:outline-none placeholder-gray-500 font-medium"
            placeholder="Type a command or search... (Ctrl+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white p-1 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <div 
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`shrink-0 ${idx === selectedIndex ? 'text-white' : 'text-gray-400'}`}>
                    {cmd.icon}
                  </div>
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-medium text-sm truncate">{cmd.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${idx === selectedIndex ? 'bg-blue-700/80 text-blue-100' : 'bg-white/5 text-gray-400'}`}>
                      {cmd.category}
                    </span>
                  </div>
                </div>
                {cmd.shortcut && (
                  <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${idx === selectedIndex ? 'bg-blue-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No commands found matching "{query}"
            </div>
          )}
        </div>
        <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><kbd className="bg-white/10 px-1.5 py-0.5 rounded mr-1.5 font-mono">↑↓</kbd> to navigate</span>
            <span className="flex items-center"><kbd className="bg-white/10 px-1.5 py-0.5 rounded mr-1.5 font-mono">↵</kbd> to select</span>
          </div>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded mr-1.5 font-mono">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
