import { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { Terminal, Activity, Box, Search, X, LogOut, RefreshCw, Folder } from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openWindow } = useWindowStore();

  const commands = [
    { id: 'term', title: 'Open Terminal', icon: <Terminal size={16} />, action: () => openWindow({ appId: 'terminal', title: 'Terminal', x: 200, y: 150, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }) },
    { id: 'files', title: 'Open File Explorer (Finder)', icon: <Folder size={16} />, action: () => openWindow({ appId: 'files', title: 'Files', x: 100, y: 100, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }) },
    { id: 'docker', title: 'Open Docker Manager', icon: <Box size={16} />, action: () => openWindow({ appId: 'docker', title: 'Docker', x: 260, y: 210, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }) },
    { id: 'tasks', title: 'Open Activity Monitor (Task Manager)', icon: <Activity size={16} />, action: () => openWindow({ appId: 'tasks', title: 'Task Manager', x: 230, y: 180, width: 700, height: 450, minWidth: 400, minHeight: 300, minimized: false, maximized: false }) },
    { id: 'reload', title: 'Reload Desktop Window', icon: <RefreshCw size={16} />, action: () => window.location.reload() },
    { id: 'logout', title: 'Log Out', icon: <LogOut size={16} />, action: async () => {
      try {
        await fetch(`http://${window.location.hostname}:3030/api/auth/logout`, { method: 'POST', credentials: 'include' });
        window.location.reload();
      } catch(e) {}
    }}
  ];

  const filteredCommands = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const executeCommand = (cmd: any) => {
    setIsOpen(false);
    cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex justify-center items-start pt-[20vh] bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-xl bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder-gray-500 font-medium"
            placeholder="Search commands... (e.g. Terminal)"
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
                className={`flex items-center px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={`mr-3 ${idx === selectedIndex ? 'text-white' : 'text-gray-400'}`}>
                  {cmd.icon}
                </div>
                <span className="font-medium">{cmd.title}</span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
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
